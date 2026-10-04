// Learning progress, points, badges and streaks for the CodeCraft course engine.
//
// Storage strategy:
//   1. localStorage — always written, works signed-out and offline.
//   2. Supabase (`learning_progress` table) — best-effort sync for signed-in
//      users once migration 020 is applied. Failures never block the UI.
//
// NOTE: this module is browser-only (it touches localStorage).

import { buildStreak, todayKey } from '../lib/home-progress.js'
import { awardLearningPoints, issueLearningCertificate, pushRemoteState, pullRemoteState } from './remote-progress.js'

const STORAGE_PREFIX = 'codecraft:learning:v1:'
export const GLOBAL_SCOPE = '__global__'

export const POINTS = {
  LESSON_COMPLETE: 50,
  LESSON_STARTED: 5,
  CODE_RUN: 5,
  PRACTICE_CORRECT: 15,
  QUIZ_PASS: 20,
  QUIZ_PERFECT: 30,
  COURSE_COMPLETE: 300,
}

export const BADGES = [
  { id: 'first-lesson', title: 'First Lesson Completed', description: 'Finish your first CodeCraft lesson.', icon: '🎓' },
  { id: 'html-beginner', title: 'HTML Beginner', description: 'Complete Module 1 of HTML Fundamentals.', icon: '🧱' },
  { id: 'practice-champion', title: 'Practice Champion', description: 'Solve 10 practice exercises.', icon: '💪' },
  { id: 'three-day-streak', title: 'Three-Day Learning Streak', description: 'Learn on three days in a row.', icon: '🔥' },
  { id: 'html-course-completed', title: 'HTML Course Completed', description: 'Finish every lesson in HTML Fundamentals.', icon: '🏆' },
]

export const emptyState = () => ({
  version: 1,
  updatedAt: null,
  points: 0,
  badges: [],
  activeDays: [],
  courses: {},
})

const storageKey = (userId) => `${STORAGE_PREFIX}${userId || 'guest'}`

export function readState(userId) {
  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return emptyState()
    return normalizeState(parsed)
  } catch (error) {
    console.warn('Learning progress: local read failed', error)
    return emptyState()
  }
}

export function normalizeState(state) {
  const base = emptyState()
  return {
    ...base,
    ...state,
    points: Math.max(0, Number(state.points) || 0),
    badges: Array.isArray(state.badges) ? state.badges : [],
    activeDays: Array.isArray(state.activeDays) ? state.activeDays : [],
    courses: state.courses && typeof state.courses === 'object' ? state.courses : {},
  }
}

function writeLocal(userId, state) {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(state))
  } catch (error) {
    console.warn('Learning progress: local write failed', error)
  }
}

// --- merging (local copy vs. remote copy) --------------------------------

function mergeLesson(local = {}, remote = {}) {
  const pickLatest = (a, b, key) => ((new Date(a?.[key] || 0) >= new Date(b?.[key] || 0) ? a : b))
  const newer = pickLatest(local, remote, 'updatedAt')
  const other = newer === local ? remote : local
  const practice = {}
  for (const id of new Set([...Object.keys(local.practice || {}), ...Object.keys(remote.practice || {})])) {
    const a = local.practice?.[id] || {}
    const b = remote.practice?.[id] || {}
    practice[id] = {
      solved: Boolean(a.solved || b.solved),
      attempts: Math.max(Number(a.attempts) || 0, Number(b.attempts) || 0),
      bestScore: Math.max(Number(a.bestScore) || 0, Number(b.bestScore) || 0),
      solvedAt: a.solvedAt || b.solvedAt || null,
    }
  }
  const quizA = local.quiz || {}
  const quizB = remote.quiz || {}
  return {
    ...newer,
    learnViewed: Boolean(newer.learnViewed || other.learnViewed),
    codeRun: Boolean(newer.codeRun || other.codeRun),
    completedAt: newer.completedAt || other.completedAt || null,
    openedAt: newer.openedAt || other.openedAt || null,
    code: newer.code ?? other.code ?? '',
    practice,
    quiz: {
      attempts: Math.max(Number(quizA.attempts) || 0, Number(quizB.attempts) || 0),
      best: Math.max(Number(quizA.best) || 0, Number(quizB.best) || 0),
      last: Number(quizA.last ?? quizB.last ?? 0),
      passed: Boolean(quizA.passed || quizB.passed),
      completedAt: quizA.completedAt || quizB.completedAt || null,
    },
  }
}

export function mergeStates(primaryRaw, secondaryRaw) {
  if (!primaryRaw) return normalizeState(secondaryRaw || emptyState())
  if (!secondaryRaw) return normalizeState(primaryRaw)
  const a = normalizeState(primaryRaw)
  const b = normalizeState(secondaryRaw)

  const courses = {}
  for (const courseId of new Set([...Object.keys(a.courses), ...Object.keys(b.courses)])) {
    const ca = a.courses[courseId]
    const cb = b.courses[courseId]
    if (!ca) { courses[courseId] = cb; continue }
    if (!cb) { courses[courseId] = ca; continue }
    const newer = new Date(ca.updatedAt || 0) >= new Date(cb.updatedAt || 0) ? ca : cb
    const older = newer === ca ? cb : ca
    const lessons = {}
    for (const lessonId of new Set([...Object.keys(ca.lessons || {}), ...Object.keys(cb.lessons || {})])) {
      lessons[lessonId] = mergeLesson(ca.lessons?.[lessonId], cb.lessons?.[lessonId])
    }
    courses[courseId] = {
      ...newer,
      lessons,
      enrolledAt: ca.enrolledAt || cb.enrolledAt || null,
      completedAt: ca.completedAt || cb.completedAt || null,
      lastLessonId: newer.lastLessonId || older.lastLessonId || null,
    }
  }

  const badgesById = new Map()
  for (const badge of [...a.badges, ...b.badges]) {
    if (!badge?.id) continue
    const existing = badgesById.get(badge.id)
    if (!existing || new Date(badge.earnedAt || 0) < new Date(existing.earnedAt || 0)) badgesById.set(badge.id, badge)
  }

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    points: Math.max(a.points, b.points),
    badges: [...badgesById.values()],
    activeDays: [...new Set([...a.activeDays, ...b.activeDays])].sort(),
    courses,
  }
}

// --- tiny external store (useSyncExternalStore) ---------------------------

let currentUserId = null
let snapshot = emptyState()
let loadPromise = null
const listeners = new Set()

const emit = () => { for (const listener of listeners) listener() }

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSnapshot() {
  return snapshot
}

export function getUserId() {
  return currentUserId
}

export async function loadForUser(userId) {
  const nextUserId = userId || 'guest'
  if (currentUserId === nextUserId && loadPromise) return loadPromise

  currentUserId = nextUserId
  snapshot = readState(nextUserId)
  emit()

  loadPromise = (async () => {
    try {
      const remote = await pullRemoteState(nextUserId)
      if (remote && currentUserId === nextUserId) {
        snapshot = mergeStates(snapshot, remote)
        writeLocal(nextUserId, snapshot)
        emit()
      }
    } catch (error) {
      console.warn('Learning progress: remote sync unavailable', error)
    }
    return snapshot
  })()

  return loadPromise
}

function persist(pointsAdded = 0) {
  if (!currentUserId) return
  snapshot = { ...snapshot, updatedAt: new Date().toISOString() }
  writeLocal(currentUserId, snapshot)
  emit()
  const userId = currentUserId
  const copy = snapshot
  pushRemoteState(userId, copy).catch(() => {})
  if (pointsAdded > 0) awardLearningPoints(userId, pointsAdded, 'learning-engine').catch(() => {})
}

// --- derived helpers ------------------------------------------------------

export const getCourseState = (state, courseId) => state?.courses?.[courseId] || null

export const getLessonState = (state, courseId, lessonId) =>
  state?.courses?.[courseId]?.lessons?.[lessonId] || null

export function computeCourseProgress(course, state) {
  const lessons = course?.lessons || []
  const courseState = getCourseState(state, course?.id)
  const lessonStates = courseState?.lessons || {}
  const completedLessons = lessons.filter((lesson) => lessonStates[lesson.id]?.completedAt)
  const completedIds = new Set(completedLessons.map((lesson) => lesson.id))
  const totalLessons = lessons.length

  const completedModules = course.modules.filter((module) =>
    module.lessonIds.every((id) => completedIds.has(id)),
  )

  const currentLesson =
    (courseState?.lastLessonId && lessons.find((lesson) => lesson.id === courseState.lastLessonId && !completedIds.has(lesson.id)))
    || lessons.find((lesson) => !completedIds.has(lesson.id))
    || null

  const remainingMinutes = lessons
    .filter((lesson) => !completedIds.has(lesson.id))
    .reduce((total, lesson) => total + (Number(lesson.duration) || 0), 0)

  return {
    enrolled: Boolean(courseState?.enrolledAt),
    completedLessons: completedLessons.length,
    totalLessons,
    percentage: totalLessons ? Math.round((completedLessons.length / totalLessons) * 100) : 0,
    completedModules: completedModules.length,
    totalModules: course.modules.length,
    completedIds,
    currentLesson,
    currentLessonId: currentLesson?.id || courseState?.lastLessonId || lessons[0]?.id || null,
    remainingMinutes,
    completed: totalLessons > 0 && completedLessons.length === totalLessons,
    lastViewedAt: courseState?.updatedAt || courseState?.enrolledAt || null,
  }
}

export function getLessonPosition(course, lessonId) {
  const index = (course?.lessons || []).findIndex((lesson) => lesson.id === lessonId)
  return index
}

export function isLessonUnlocked(course, lessonId, state) {
  const lessons = course?.lessons || []
  const index = lessons.findIndex((lesson) => lesson.id === lessonId)
  if (index <= 0) return true
  const previous = lessons[index - 1]
  const previousState = getLessonState(state, course.id, previous.id)
  return Boolean(previousState?.completedAt)
}

export function computeSummary(state, courses) {
  const progress = courses.map((course) => computeCourseProgress(course, state))
  const solvedPractice = courses.reduce((total, course) => {
    const courseState = getCourseState(state, course.id)
    if (!courseState) return total
    return total + Object.values(courseState.lessons || {}).reduce(
      (sum, lesson) => sum + Object.values(lesson.practice || {}).filter((task) => task.solved).length,
      0,
    )
  }, 0)

  const activeDays = state?.activeDays || []
  const streak = buildStreak(activeDays.map((day) => `${day}T12:00:00`))
  const completedLessons = progress.reduce((total, entry) => total + entry.completedLessons, 0)

  return {
    points: state?.points || 0,
    badges: state?.badges || [],
    streak,
    solvedPractice,
    completedLessons,
    coursesStarted: progress.filter((entry) => entry.enrolled).length,
    coursesCompleted: progress.filter((entry) => entry.completed).length,
  }
}

export function getBadgeDefinition(badgeId) {
  return BADGES.find((badge) => badge.id === badgeId) || null
}

// --- mutations ------------------------------------------------------------

function ensureCourse(state, courseId) {
  const courses = { ...state.courses }
  if (!courses[courseId]) {
    courses[courseId] = {
      updatedAt: new Date().toISOString(),
      enrolledAt: new Date().toISOString(),
      completedAt: null,
      lastLessonId: null,
      lessons: {},
    }
  }
  return { courses, course: courses[courseId] }
}

function ensureLesson(courseState, lessonId) {
  const lessons = { ...(courseState.lessons || {}) }
  if (!lessons[lessonId]) {
    lessons[lessonId] = {
      updatedAt: new Date().toISOString(),
      openedAt: new Date().toISOString(),
      completedAt: null,
      learnViewed: false,
      codeRun: false,
      code: '',
      practice: {},
      quiz: { attempts: 0, best: 0, last: 0, passed: false, completedAt: null },
    }
  }
  return { lessons, lesson: lessons[lessonId] }
}

function touchDay(activeDays, day = todayKey()) {
  return activeDays.includes(day) ? activeDays : [...activeDays, day].sort()
}

// Applies a mutation and re-evaluates rewards (badges are computed, never
// granted twice; points are only added when a flag actually flips).
function commit(mutator) {
  let rewardPoints = 0
  let activity = false

  const next = normalizeState(JSON.parse(JSON.stringify(snapshot)))
  const draft = {
    addPoints: (amount) => { rewardPoints += amount },
    markActivity: () => { activity = true },
  }
  mutator(next, draft)

  if (activity) next.activeDays = touchDay(next.activeDays)
  next.points = Math.max(0, next.points + rewardPoints)

  snapshot = next
  persist(rewardPoints)
  return { state: next, pointsAdded: rewardPoints }
}

// Evaluates badges against the current snapshot and persists any that are new.
function applyRewards(courses) {
  if (!courses?.length) return []
  const candidate = { ...snapshot, badges: snapshot.badges.map((badge) => ({ ...badge })) }
  const gained = evaluateBadges(candidate, courses)
  if (gained.length) {
    snapshot = candidate
    if (currentUserId) {
      writeLocal(currentUserId, snapshot)
      emit()
      pushRemoteState(currentUserId, snapshot).catch(() => {})
    }
  }
  return gained
}

function evaluateBadges(state, courses) {
  const earned = new Set(state.badges.map((badge) => badge.id))
  const gained = []

  const add = (badgeId) => {
    if (earned.has(badgeId)) return
    earned.add(badgeId)
    gained.push({ id: badgeId, earnedAt: new Date().toISOString() })
  }

  const summary = computeSummary(state, courses)

  if (summary.completedLessons >= 1) add('first-lesson')

  const htmlCourse = courses.find((course) => course.id === 'html-fundamentals')
  if (htmlCourse) {
    const moduleOne = htmlCourse.modules[0]
    const progress = computeCourseProgress(htmlCourse, state)
    if (moduleOne && moduleOne.lessonIds.every((id) => progress.completedIds.has(id))) add('html-beginner')
    if (progress.completed) add('html-course-completed')
  }

  if (summary.solvedPractice >= 10) add('practice-champion')
  if (summary.streak.current >= 3) add('three-day-streak')

  if (gained.length) {
    state.badges = [...state.badges, ...gained]
    return gained
  }
  return []
}

export function openLesson(course, lessonId, courses = [course]) {
  const result = commit((state, draft) => {
    const { courses: coursesMap, course: courseState } = ensureCourse(state, course.id)
    state.courses = coursesMap
    courseState.lastLessonId = lessonId
    courseState.updatedAt = new Date().toISOString()
    const { lessons, lesson } = ensureLesson(courseState, lessonId)
    courseState.lessons = lessons
    lesson.updatedAt = new Date().toISOString()
    if (!lesson.openedAt) lesson.openedAt = new Date().toISOString()
    if (!courseState.enrolledAt) courseState.enrolledAt = new Date().toISOString()
    if (!courseState.pointsStarted) {
      courseState.pointsStarted = true
      draft.addPoints(POINTS.LESSON_STARTED)
      draft.markActivity()
    }
  })
  applyRewards(courses)
  return result
}

export function setLessonFlag(course, lessonId, flag, value = true, courses = [course]) {
  const result = commit((state, draft) => {
    const { courses: coursesMap, course: courseState } = ensureCourse(state, course.id)
    state.courses = coursesMap
    courseState.updatedAt = new Date().toISOString()
    const { lessons, lesson } = ensureLesson(courseState, lessonId)
    courseState.lessons = lessons
    lesson.updatedAt = new Date().toISOString()
    if (lesson[flag]) return
    lesson[flag] = value
    if (flag === 'learnViewed') draft.markActivity()
    if (flag === 'codeRun') {
      draft.addPoints(POINTS.CODE_RUN)
      draft.markActivity()
    }
  })
  applyRewards(courses)
  return result
}

export function saveLessonCode(course, lessonId, code) {
  commit((state) => {
    const { courses: coursesMap, course: courseState } = ensureCourse(state, course.id)
    state.courses = coursesMap
    courseState.updatedAt = new Date().toISOString()
    const { lessons, lesson } = ensureLesson(courseState, lessonId)
    courseState.lessons = lessons
    lesson.updatedAt = new Date().toISOString()
    lesson.code = code
  })
}

export function recordPractice(course, lessonId, practiceId, { passed, attempts = 1, score = 100 }, courses = [course]) {
  let awarded = 0
  const result = commit((state, draft) => {
    const { courses: coursesMap, course: courseState } = ensureCourse(state, course.id)
    state.courses = coursesMap
    courseState.updatedAt = new Date().toISOString()
    const { lessons, lesson } = ensureLesson(courseState, lessonId)
    courseState.lessons = lessons
    lesson.updatedAt = new Date().toISOString()
    const existing = lesson.practice[practiceId] || { solved: false, attempts: 0, bestScore: 0 }
    const wasSolved = Boolean(existing.solved)
    lesson.practice[practiceId] = {
      ...existing,
      attempts: Math.max(existing.attempts, attempts),
      bestScore: Math.max(existing.bestScore, passed ? score : existing.bestScore),
      solved: wasSolved || passed,
      solvedAt: wasSolved ? existing.solvedAt : (passed ? new Date().toISOString() : null),
    }
    if (passed && !wasSolved) {
      awarded = 1
      draft.addPoints(POINTS.PRACTICE_CORRECT)
      draft.markActivity()
    }
  })
  applyRewards(courses)
  return { ...result, awarded: awarded > 0 }
}

export function recordQuiz(course, lessonId, { score, total, passed }, courses = [course]) {
  const requiredScore = lessonId === course.completion?.assessmentLessonId
    ? (course.completion.assessmentScore || 70)
    : (course.completion?.requiredQuizScore || 60)
  const didPass = passed ?? Number(score) >= requiredScore

  let awarded = 0
  const result = commit((state, draft) => {
    const { courses: coursesMap, course: courseState } = ensureCourse(state, course.id)
    state.courses = coursesMap
    courseState.updatedAt = new Date().toISOString()
    const { lessons, lesson } = ensureLesson(courseState, lessonId)
    courseState.lessons = lessons
    lesson.updatedAt = new Date().toISOString()
    const quiz = lesson.quiz || {}
    const previousBest = Number(quiz.best) || 0
    lesson.quiz = {
      attempts: (Number(quiz.attempts) || 0) + 1,
      best: Math.max(previousBest, Number(score) || 0),
      last: Number(score) || 0,
      total: Number(total) || 0,
      passed: Boolean(quiz.passed) || didPass,
      completedAt: new Date().toISOString(),
    }
    if (didPass && !quiz.passed) {
      awarded += POINTS.QUIZ_PASS
      draft.addPoints(POINTS.QUIZ_PASS)
      draft.markActivity()
    }
    if (previousBest < 100 && lesson.quiz.best === 100) {
      awarded += POINTS.QUIZ_PERFECT
      draft.addPoints(POINTS.QUIZ_PERFECT)
    }
  })
  applyRewards(courses)
  return { ...result, awarded: awarded > 0, requiredScore, passed: didPass }
}

export function completeLesson(course, lessonId, courses = [course]) {
  let firstCompletion = false
  const result = commit((state, draft) => {
    const { courses: coursesMap, course: courseState } = ensureCourse(state, course.id)
    state.courses = coursesMap
    courseState.updatedAt = new Date().toISOString()
    const { lessons: lessonMap, lesson } = ensureLesson(courseState, lessonId)
    courseState.lessons = lessonMap
    if (lesson.completedAt) return
    lesson.completedAt = new Date().toISOString()
    lesson.updatedAt = lesson.completedAt
    firstCompletion = true
    draft.addPoints(POINTS.LESSON_COMPLETE)
    draft.markActivity()

    const allDone = (course.lessons || []).every((entry) => lessonMap[entry.id]?.completedAt)
    if (allDone && !courseState.completedAt) {
      courseState.completedAt = lesson.completedAt
      draft.addPoints(POINTS.COURSE_COMPLETE)
    }
  })

  const badges = applyRewards(courses)
  return { ...result, firstCompletion, badges, courseCompleted: Boolean(result.state.courses[course.id]?.completedAt) }
}

// --- certificate ----------------------------------------------------------
// Uses the existing `certificates` table through a server-validated RPC so
// users cannot self-issue arbitrary certificates.

export async function requestCertificate(userId, course) {
  if (!userId || !course) return { ok: false, reason: 'missing-arguments' }
  return issueLearningCertificate(userId, course)
}
