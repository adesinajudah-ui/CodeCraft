// Course registry for the CodeCraft learning engine.
// Content lives in ./<course>/* — this file exposes the lookup API used by
// the UI (src/learn/*), the dashboard and search.

import htmlFundamentalsCourse from './html/index.js'

const courses = [htmlFundamentalsCourse]

const courseById = new Map(courses.map((course) => [course.id, course]))

const byTitle = (title = '') => String(title).trim().toLowerCase()

export function listEngineCourses() {
  return courses
}

export function getCourse(courseId) {
  if (!courseId) return null
  return courseById.get(courseId) || null
}

export function findCourseByTitle(title) {
  const needle = byTitle(title)
  if (!needle) return null
  return courses.find((course) => byTitle(course.title) === needle) || null
}

export function getLessons(course) {
  return course?.lessons || []
}

export function getLessonIndex(course, lessonId) {
  return getLessons(course).findIndex((lesson) => lesson.id === lessonId)
}

export function getLesson(course, lessonId) {
  return getLessons(course)[getLessonIndex(course, lessonId)] || null
}

export function getNextLesson(course, lessonId) {
  const index = getLessonIndex(course, lessonId)
  if (index < 0) return getLessons(course)[0] || null
  return getLessons(course)[index + 1] || null
}

export function getPreviousLesson(course, lessonId) {
  const index = getLessonIndex(course, lessonId)
  if (index <= 0) return null
  return getLessons(course)[index - 1] || null
}

export function getModuleForLesson(course, lessonId) {
  return course.modules.find((module) => module.lessonIds.includes(lessonId)) || null
}

export function getModuleLessons(course, module) {
  const lessons = getLessons(course)
  return (module?.lessonIds || []).map((id) => lessons.find((lesson) => lesson.id === id)).filter(Boolean)
}

export function estimateLessonMinutes(lesson) {
  return Number(lesson?.duration) || 6
}

export function formatMinutes(totalMinutes) {
  const minutes = Math.max(0, Math.round(Number(totalMinutes) || 0))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

// Deep link used by course cards, search results and "Continue Learning".
export function resolveCourseRoute(titleOrId) {
  const course = courseById.get(titleOrId) || findCourseByTitle(titleOrId)
  return course ? `/learn/course/${course.id}` : null
}

export function courseLessonRoute(courseId, lessonId) {
  return lessonId ? `/learn/course/${courseId}/lesson/${lessonId}` : `/learn/course/${courseId}`
}

// --- search ---------------------------------------------------------------
// Search courses, modules, lessons, objectives and HTML element names.

const asText = (value) => String(value || '').toLowerCase()

export function searchLearningEngine(query, limit = 8) {
  const needle = asText(query).trim()
  if (!needle) return []

  const results = []
  const push = (result) => {
    if (results.length < limit && !results.some((item) => item.route === result.route)) results.push(result)
  }

  for (const course of courses) {
    if (asText(course.title).includes(needle) || asText(course.description).includes(needle)) {
      push({
        kind: 'course',
        eyebrow: 'Course',
        title: course.title,
        subtitle: `${course.difficulty} · ${course.lessons.length} lessons`,
        route: `/learn/course/${course.id}`,
        color: course.color,
        icon: course.icon,
      })
    }

    for (const module of course.modules) {
      if (asText(module.title).includes(needle)) {
        push({
          kind: 'module',
          eyebrow: 'Module',
          title: module.title,
          subtitle: course.title,
          route: `/learn/course/${course.id}?module=${module.id}`,
          color: course.color,
          icon: course.icon,
        })
      }
    }

    for (const lesson of course.lessons) {
      const haystack = [
        lesson.title,
        ...(lesson.objectives || []),
        ...(lesson.takeaways || []),
        ...(lesson.sections || []).map((section) => (typeof section.text === 'string' ? section.text : '')),
      ].map(asText).join(' ')

      if (asText(lesson.title).includes(needle) || haystack.includes(needle)) {
        push({
          kind: 'lesson',
          eyebrow: 'Lesson',
          title: lesson.title,
          subtitle: course.title,
          route: `/learn/course/${course.id}/lesson/${lesson.id}`,
          color: course.color,
          icon: course.icon,
        })
      }
    }
  }

  return results
}
