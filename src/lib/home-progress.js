// Home dashboard PURE builders (no I/O — unit-testable under Node).
// Fetcher lives in ./home-progress-data (imports the Supabase client).
// Sources (all existing tables):
//   Learn      -> courses/lessons catalog + lesson_progress (migration 018)
//   Quizzes    -> quiz_attempts (status completed/timed_out) — XP per quiz = MAX(xp_earned)
//   Challenges -> challenge_completions (server-written by review RPC)
//   XP         -> challenge_progress.xp (server-authoritative, best-per-quiz since migration 016)
//   Certificates -> certificates
// Streak + recent activity are DERIVED from those completion records — no duplicate copies.

// ---------- date helpers ----------

export function toLocalDateKey(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('en-CA') // YYYY-MM-DD in local time
}

export function todayKey() {
  return toLocalDateKey(new Date())
}

export function addDays(dateKey, delta) {
  if (!dateKey) return null
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + delta)
  return date.toLocaleDateString('en-CA')
}

export function formatActivityDate(value) {
  const dateKey = toLocalDateKey(value)
  if (!dateKey) return ''
  const today = todayKey()
  if (dateKey === today) return 'Today'
  if (dateKey === addDays(today, -1)) return 'Yesterday'
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// ---------- learn progress ----------

// courseId -> { course, totalLessons, completedLessons, progressPct, enrolled, completed, nextLesson, lastViewedAt, lastActivityAt }
export function buildCourseProgress(courses, lessons, progressRows = []) {
  const lessonsByCourse = new Map()
  for (const lesson of lessons || []) {
    const current = lessonsByCourse.get(lesson.course_id) || []
    current.push(lesson)
    lessonsByCourse.set(lesson.course_id, current)
  }

  const progressByLesson = new Map()
  let latestActivity = null
  for (const row of progressRows || []) {
    progressByLesson.set(row.lesson_id, row)
    const viewedAt = row.last_viewed_at || row.first_opened_at
    if (viewedAt && (!latestActivity || viewedAt > latestActivity)) latestActivity = viewedAt
  }

  const result = new Map()
  for (const course of courses || []) {
    const courseLessons = (lessonsByCourse.get(course.id) || []).sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    const totalLessons = courseLessons.length
    let completedLessons = 0
    let lastViewedAt = null
    let lastActivityAt = null
    const completedLessonIds = new Set()

    for (const lesson of courseLessons) {
      const row = progressByLesson.get(lesson.id)
      if (row) {
        if (row.completed_at) {
          completedLessons += 1
          completedLessonIds.add(lesson.id)
          if (!lastActivityAt || row.completed_at > lastActivityAt) lastActivityAt = row.completed_at
        }
        const viewedAt = row.last_viewed_at || row.first_opened_at
        if (viewedAt && (!lastViewedAt || viewedAt > lastViewedAt)) lastViewedAt = viewedAt
      }
    }

    const enrolled = completedLessons > 0 || courseLessons.some((lesson) => progressByLesson.has(lesson.id))
    const completed = totalLessons > 0 && completedLessons === totalLessons
    const nextLesson = courseLessons.find((lesson) => !completedLessonIds.has(lesson.id)) || null

    result.set(course.id, {
      course,
      lessons: courseLessons,
      totalLessons,
      completedLessons,
      progressPct: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
      enrolled,
      completed,
      nextLesson,
      lastViewedAt,
      lastActivityAt,
    })
  }
  return { byCourse: result, latestActivity }
}

// Priority (spec §28):
//   1. most recently viewed incomplete lesson
//   2. that lesson completed -> next incomplete lesson in the same course
//   3. course completed -> next incomplete course
//   4. no progress -> first available course ("Start Learning")
export function selectContinueLearning(courseProgressMap) {
  const entries = [...(courseProgressMap?.values() || [])]
  const inProgress = entries.filter((entry) => entry.enrolled && !entry.completed && entry.totalLessons > 0)

  // 1. most recent incomplete-lesson interaction
  const activeCourses = inProgress.filter((entry) => entry.nextLesson)
  const mostRecent = activeCourses
    .filter((entry) => entry.lastViewedAt)
    .sort((a, b) => (a.lastViewedAt < b.lastViewedAt ? 1 : -1))[0]
  if (mostRecent) {
    const courseStarted = mostRecent.completedLessons > 0
    return {
      mode: courseStarted ? 'continue' : 'start-lesson',
      course: mostRecent.course,
      lesson: mostRecent.nextLesson,
      entry: mostRecent,
    }
  }

  // 2/3. enrolled course whose current lesson is done, or next enrolled-but-incomplete course
  const byPosition = (a, b) => (a.course.position ?? 0) - (b.course.position ?? 0)
  const nextEnrolled = [...inProgress].filter((entry) => !entry.lastViewedAt).sort(byPosition)[0]
    || [...inProgress].sort(byPosition)[0]
  if (nextEnrolled) {
    return {
      mode: nextEnrolled.completedLessons > 0 ? 'continue' : 'start-lesson',
      course: nextEnrolled.course,
      lesson: nextEnrolled.nextLesson,
      entry: nextEnrolled,
    }
  }

  // 4. nothing started -> first available (not fully completed) course
  const firstAvailable = entries.filter((entry) => entry.totalLessons > 0 && !entry.completed).sort(byPosition)[0]
  if (firstAvailable) {
    return {
      mode: 'recommend',
      course: firstAvailable.course,
      lesson: firstAvailable.lessons[0] || null,
      entry: firstAvailable,
    }
  }

  if (entries.some((entry) => entry.completed)) return { mode: 'all-complete' }
  return null
}

// ---------- streaks ----------

// activityDates: array of Date-ish values (lesson completions, quiz submissions, challenge completions)
export function buildStreak(activityDates, today = todayKey()) {
  const uniqueDays = [...new Set((activityDates || []).map(toLocalDateKey).filter(Boolean))].sort()

  const daySet = new Set(uniqueDays)
  // Current streak: count back from today; if no activity today yet, the streak anchored
  // on yesterday still stands (a day only breaks the streak once it has fully passed).
  let current = 0
  let cursor = daySet.has(today) ? today : addDays(today, -1)
  while (daySet.has(cursor)) {
    current += 1
    cursor = addDays(cursor, -1)
  }

  let longest = 0
  let run = 0
  let previous = null
  for (const day of uniqueDays) {
    run = previous && addDays(previous, 1) === day ? run + 1 : 1
    if (run > longest) longest = run
    previous = day
  }

  const week = []
  for (let offset = 6; offset >= 0; offset -= 1) {
    const key = addDays(today, -offset)
    week.push({ key, active: daySet.has(key) })
  }

  return { current, longest, week, activeDays: uniqueDays }
}

// ---------- quiz stats ----------

export function buildQuizStats(attempts = []) {
  const completedAttempts = (attempts || []).filter((attempt) => attempt.status !== 'in_progress' && attempt.submitted_at)

  const bestXpPerQuiz = new Map()
  const latestAttemptPerQuiz = new Map()
  let percentageSum = 0

  for (const attempt of completedAttempts) {
    const previousBest = bestXpPerQuiz.get(attempt.quiz_id) ?? -1
    bestXpPerQuiz.set(attempt.quiz_id, Math.max(previousBest, Number(attempt.xp_earned) || 0))

    const previousLatest = latestAttemptPerQuiz.get(attempt.quiz_id)
    if (!previousLatest || attempt.submitted_at > previousLatest.submitted_at) {
      latestAttemptPerQuiz.set(attempt.quiz_id, attempt)
    }
    percentageSum += Number(attempt.percentage) || 0
  }

  const averageScore = completedAttempts.length ? Math.round(percentageSum / completedAttempts.length) : 0
  const bestScore = completedAttempts.reduce((best, attempt) => Math.max(best, Number(attempt.percentage) || 0), 0)
  const totalXp = [...bestXpPerQuiz.values()].reduce((sum, xp) => sum + xp, 0) // best-per-quiz, never stacked
  const latest = completedAttempts
    .slice()
    .sort((a, b) => (a.submitted_at < b.submitted_at ? 1 : -1))[0] || null

  return {
    quizzesCompleted: bestXpPerQuiz.size,
    totalAttempts: completedAttempts.length,
    averageScore,
    bestScore,
    totalXp,
    latest,
    bestXpPerQuiz,
  }
}

// ---------- overall progress ----------

export function buildOverallProgress(courseProgressMap) {
  const entries = [...(courseProgressMap?.values() || [])].filter((entry) => entry.enrolled && entry.totalLessons > 0)
  const totalLessons = entries.reduce((sum, entry) => sum + entry.totalLessons, 0)
  const completedLessons = entries.reduce((sum, entry) => sum + entry.completedLessons, 0)
  return {
    totalLessons,
    completedLessons,
    percentage: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
    coursesEnrolled: entries.length,
    coursesCompleted: entries.filter((entry) => entry.completed).length,
    lessonsCompleted: completedLessons,
  }
}

// ---------- recent activity ----------

export function buildRecentActivityFromEvents(events, limit = 6) {
  return (events || [])
    .slice()
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, limit)
}


