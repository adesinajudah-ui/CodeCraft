// Tests for the Home dashboard pure builders (spec scenarios §37–§42).
import {
  addDays,
  buildCourseProgress,
  buildOverallProgress,
  buildQuizStats,
  buildStreak,
  selectContinueLearning,
  toLocalDateKey,
} from '../src/lib/home-progress.js'

let failures = 0
const check = (name, condition, detail = '') => {
  if (condition) console.log(`  ok  ${name}`)
  else { failures += 1; console.log(`FAIL  ${name} ${detail}`) }
}

const makeCourses = (specs) => specs.map(([title, lessonCount], index) => ({
  id: `course-${title.toLowerCase()}`,
  title,
  description: `${title} description`,
  icon: title.slice(0, 2),
  position: index,
}))

const makeLessons = (courses, perCourse) => courses.flatMap((course, courseIndex) =>
  Array.from({ length: perCourse[courseIndex] }, (_, i) => ({
    id: `${course.id}-lesson-${i + 1}`,
    course_id: course.id,
    title: `${course.title} Lesson ${i + 1}`,
    position: i,
  })))

const completions = (lessonRows, count, at = '2026-10-01T10:00:00Z') =>
  lessonRows.slice(0, count).map((lesson) => ({
    lesson_id: lesson.id,
    course_id: lesson.course_id,
    last_viewed_at: at,
    completed_at: at,
  }))

// ---------- §37: new user ----------
{
  const courses = makeCourses([['HTML', 10]])
  const lessons = makeLessons(courses, [10])
  const { byCourse } = buildCourseProgress(courses, lessons, [])
  const overall = buildOverallProgress(byCourse)
  check('§37 new user: 0% overall', overall.percentage === 0, `got ${overall.percentage}`)
  check('§37 new user: 0 enrolled', overall.coursesEnrolled === 0)
  check('§37 new user: 0 completed courses', overall.coursesCompleted === 0)
  check('§37 new user: 0 lessons', overall.lessonsCompleted === 0)
  const newContinue = selectContinueLearning(byCourse)
  check('§37 new user: recommend first course (Start Learning)', newContinue?.mode === 'recommend' && newContinue.course.id === 'course-html', `got ${newContinue?.mode}/${newContinue?.course?.id}`)
  check('§37 new user: streak 0', buildStreak([]).current === 0)
  check('§37 new user: longest 0', buildStreak([]).longest === 0)
}

// ---------- §38: active user ----------
{
  const courses = makeCourses([['HTML', 10], ['CSS', 10], ['JavaScript', 10], ['React', 10]])
  const lessons = makeLessons(courses, [10, 10, 10, 10])
  const html = lessons.filter((l) => l.course_id === 'course-html')
  const css = lessons.filter((l) => l.course_id === 'course-css')
  const js = lessons.filter((l) => l.course_id === 'course-javascript')

  const rows = [
    ...completions(html, 10, '2026-09-20T10:00:00Z'),
    ...completions(css, 5, '2026-09-25T10:00:00Z'),
    ...completions(js, 7, '2026-10-01T16:00:00Z'),
    // React: enrolled (opened lesson 1) but nothing completed
    { lesson_id: lessons.find((l) => l.course_id === 'course-react').id, course_id: 'course-react', last_viewed_at: '2026-09-26T10:00:00Z', completed_at: null },
    // most recent view: JS lesson 8 opened but not completed (yesterday evening)
    { lesson_id: js[7].id, course_id: js[7].course_id, last_viewed_at: '2026-10-01T20:00:00Z', completed_at: null },
  ]
  const { byCourse } = buildCourseProgress(courses, lessons, rows)
  const overall = buildOverallProgress(byCourse)

  check('§38 overall 55% (22/40)', overall.percentage === 55, `got ${overall.percentage}`)
  check('§38 enrolled 4', overall.coursesEnrolled === 4, `got ${overall.coursesEnrolled}`)
  check('§38 completed courses 1', overall.coursesCompleted === 1, `got ${overall.coursesCompleted}`)
  check('§38 lessons completed 22', overall.lessonsCompleted === 22, `got ${overall.lessonsCompleted}`)

  const entry = byCourse.get('course-html')
  check('§38 HTML 100% complete', entry.completed && entry.progressPct === 100)

  const jsEntry = byCourse.get('course-javascript')
  check('§38 JS 70%', jsEntry.progressPct === 70, `got ${jsEntry.progressPct}`)

  const continueLearning = selectContinueLearning(byCourse)
  check('§38 continue -> JavaScript', continueLearning.course.id === 'course-javascript', `got ${continueLearning.course?.title}`)
  check('§38 continue -> next incomplete lesson (8 of 10)', continueLearning.lesson.id === js[7].id, `got ${continueLearning.lesson?.title}`)
  check('§38 continue mode = continue (course started)', continueLearning.mode === 'continue')
}

// ---------- §28 priority details + §29 course completion ----------
{
  const courses = makeCourses([['A', 2], ['B', 2]])
  const lessons = makeLessons(courses, [2, 2])
  const a = lessons.filter((l) => l.course_id === 'course-a')
  const b = lessons.filter((l) => l.course_id === 'course-b')

  // Lesson completed -> continue should point at the NEXT lesson (§28 example: 8 -> 9)
  const rows = [
    { lesson_id: a[0].id, course_id: a[0].course_id, last_viewed_at: '2026-10-01T09:00:00Z', completed_at: '2026-10-01T09:00:00Z' },
  ]
  const { byCourse } = buildCourseProgress(courses, lessons, rows)
  let cont = selectContinueLearning(byCourse)
  check('§28 completed lesson -> next lesson selected', cont.lesson.id === a[1].id, `got ${cont.lesson?.title}`)

  // §29: course fully completed -> Continue moves to the next incomplete course
  const rowsAllA = [
    { lesson_id: a[0].id, course_id: a[0].course_id, completed_at: '2026-10-01T09:00:00Z', last_viewed_at: '2026-10-01T09:00:00Z' },
    { lesson_id: a[1].id, course_id: a[1].course_id, completed_at: '2026-10-01T10:00:00Z', last_viewed_at: '2026-10-01T10:00:00Z' },
  ]
  const { byCourse: byCourseAllA } = buildCourseProgress(courses, lessons, rowsAllA)
  cont = selectContinueLearning(byCourseAllA)
  check('§29 course complete -> next incomplete course', cont.course.id === 'course-b' && cont.lesson.id === b[0].id, `got ${cont.course?.title}`)

  // §29: everything complete -> all-complete mode
  const rowsAll = [...rowsAllA,
    { lesson_id: b[0].id, course_id: b[0].course_id, completed_at: '2026-10-01T11:00:00Z', last_viewed_at: '2026-10-01T11:00:00Z' },
    { lesson_id: b[1].id, course_id: b[1].course_id, completed_at: '2026-10-01T12:00:00Z', last_viewed_at: '2026-10-01T12:00:00Z' },
  ]
  const { byCourse: byCourseAll } = buildCourseProgress(courses, lessons, rowsAll)
  cont = selectContinueLearning(byCourseAll)
  check('§29 all complete -> celebration state', cont?.mode === 'all-complete', `got ${cont?.mode}`)

  // No progress at all -> first course recommendation
  const { byCourse: byCourseNone } = buildCourseProgress(courses, lessons, [])
  cont = selectContinueLearning(byCourseNone)
  check('§28 no progress -> recommend first course', cont.mode === 'recommend' && cont.course.id === 'course-a')
}

// ---------- §39 streaks ----------
{
  const today = toLocalDateKey(new Date())
  const day = (offset) => addDays(today, offset)

  // Mon..Fri activity -> 5-day streak anchored today
  const fiveDays = [0, -1, -2, -3, -4].map(day)
  const streak5 = buildStreak(fiveDays, today)
  check('§39 five consecutive days -> current 5', streak5.current === 5, `got ${streak5.current}`)
  check('§39 five consecutive days -> longest 5', streak5.longest === 5, `got ${streak5.longest}`)

  // No activity today yet: streak anchored yesterday still stands (§16)
  const streakYesterday = buildStreak([day(-1), day(-2), day(-3)], today)
  check('§16 no activity today -> streak preserved (3)', streakYesterday.current === 3, `got ${streakYesterday.current}`)

  // Multiple activities on one day count as ONE day (§17)
  const sameDay = [day(0), day(0), day(0), day(-1)]
  const streakSameDay = buildStreak(sameDay, today)
  check('§17 same-day activities count as one day', streakSameDay.current === 2, `got ${streakSameDay.current}`)

  // Longest > current from history (§19)
  const history = [day(-10), day(-9), day(-8), day(-7), day(-6), day(-5), day(-4), day(-3), day(-2), day(-1), day(0)]
  const longStreak = buildStreak(history, today)
  check('§19 longest streak from history', longStreak.current === 11 && longStreak.longest === 11, `got ${longStreak.current}/${longStreak.longest}`)

  // Broken streak: gap in the middle
  const gapped = [day(0), day(-1), day(-3), day(-4)]
  const gappedStreak = buildStreak(gapped, today)
  check('§39 gap breaks current streak (2, longest 2)', gappedStreak.current === 2 && gappedStreak.longest === 2, `got ${gappedStreak.current}/${gappedStreak.longest}`)

  // Last week row count for UI
  check('§18 streak week has 7 entries', streak5.week.length === 7)
}

// ---------- §40 quiz XP (best per quiz, no stacking) + quiz stats ----------
{
  const attempts = [
    { quiz_id: 'html', status: 'completed', percentage: 60, xp_earned: 60, score: 6, total_questions: 10, submitted_at: '2026-09-01T10:00:00Z' },
    { quiz_id: 'html', status: 'completed', percentage: 80, xp_earned: 80, score: 8, total_questions: 10, submitted_at: '2026-09-02T10:00:00Z' },
    { quiz_id: 'html', status: 'completed', percentage: 70, xp_earned: 70, score: 7, total_questions: 10, submitted_at: '2026-09-03T10:00:00Z' },
  ]
  const stats = buildQuizStats(attempts)
  check('§40 quizzes completed = 1 (unique quizzes)', stats.quizzesCompleted === 1, `got ${stats.quizzesCompleted}`)
  check('§40 total XP = best attempt only (80, not 210)', stats.totalXp === 80, `got ${stats.totalXp}`)
  check('§40 total attempts counted separately', stats.totalAttempts === 3)
  check('§40 average score 70%', stats.averageScore === 70, `got ${stats.averageScore}`)
  check('§40 best score 80%', stats.bestScore === 80, `got ${stats.bestScore}`)
  check('§40 latest attempt is the third', stats.latest.submitted_at === '2026-09-03T10:00:00Z')

  // in_progress attempts do not count as completed
  const withDraft = [...attempts, { quiz_id: 'css', status: 'in_progress', percentage: 0, xp_earned: 0, submitted_at: null }]
  const statsDraft = buildQuizStats(withDraft)
  check('§12 in_progress quiz not counted', statsDraft.quizzesCompleted === 1 && statsDraft.totalAttempts === 3, `got ${statsDraft.quizzesCompleted}/${statsDraft.totalAttempts}`)

  // Multiple quizzes: best per quiz (§14 example: 100+80+70)
  const multi = [
    { quiz_id: 'a', status: 'completed', percentage: 100, xp_earned: 100, submitted_at: '2026-09-01T10:00:00Z' },
    { quiz_id: 'b', status: 'completed', percentage: 80, xp_earned: 80, submitted_at: '2026-09-02T10:00:00Z' },
    { quiz_id: 'c', status: 'completed', percentage: 70, xp_earned: 70, submitted_at: '2026-09-03T10:00:00Z' },
    { quiz_id: 'b', status: 'completed', percentage: 100, xp_earned: 100, submitted_at: '2026-09-04T10:00:00Z' },
  ]
  const statsMulti = buildQuizStats(multi)
  check('§14 multiple quizzes -> 3 completed', statsMulti.quizzesCompleted === 3)
  check('§14 best-per-quiz XP sum 270 (a=100, b=100, c=70)', statsMulti.totalXp === 270, `got ${statsMulti.totalXp}`)
}

// ---------- date helpers ----------
{
  check('date: YYYY-MM-DD format', /^\d{4}-\d{2}-\d{2}$/.test(toLocalDateKey(new Date())))
  check('date: addDays crosses month boundary', addDays('2026-10-01', -1) === '2026-09-30')
  check('date: invalid input -> null', toLocalDateKey('not-a-date') === null)
}

console.log(failures ? `\n${failures} FAILURES` : '\nAll home-progress tests passed')
process.exit(failures ? 1 : 0)
