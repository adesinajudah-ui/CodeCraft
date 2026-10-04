// Public surface of the CodeCraft learning engine (used by App.jsx).

export { default as CourseOverview } from './CourseOverview.jsx'
export { default as LessonWorkspace } from './LessonWorkspace.jsx'
export { default as CodeBlock } from './CodeBlock.jsx'
export { default as CodeEditor } from './CodeEditor.jsx'
export { default as CodePreview } from './CodePreview.jsx'
export { default as PracticeTab } from './PracticeTab.jsx'
export { default as QuizTab } from './QuizTab.jsx'

export {
  computeCourseProgress,
  computeSummary,
  readState,
  loadForUser,
  getLessonState,
  BADGES,
  POINTS,
} from './progress.js'

export { searchLearningEngine } from '../courses/index.js'
export { useLearning, useCourseProgress } from './useLearning.js'

import { getCourse, listEngineCourses } from '../courses/index.js'

// Parses /learn/course/<id>[/lesson/<lessonId>] into a route descriptor.
export function parseCourseRoute(pathname) {
  const match = /^\/learn\/course\/([a-z0-9-]+)(?:\/lesson\/([a-z0-9-]+))?\/?$/.exec(String(pathname || ''))
  if (!match) return null
  const course = getCourse(match[1])
  if (!course) return null
  const lessonId = match[2] || null
  if (lessonId && !course.lessons.some((lesson) => lesson.id === lessonId)) {
    return { course, lessonId: null, invalidLesson: lessonId }
  }
  return { course, lessonId }
}

// Flattens engine progress into the row shape the Home dashboard builders
// already consume (courses / lessons / lesson_progress), so the interactive
// course shows up in Continue Learning, overall progress and recent activity.
export function buildEngineDashboardRows(state) {
  const courses = []
  const lessons = []
  const lessonProgress = []

  for (const course of listEngineCourses()) {
    const courseState = state?.courses?.[course.id] || null

    courses.push({
      id: course.id,
      title: course.title,
      description: course.shortDescription || course.description,
      category: `${course.language} Development`,
      difficulty: course.difficulty,
      icon: course.icon,
      position: -1,
    })

    course.lessons.forEach((lesson, index) => {
      const syntheticId = `${course.id}::${lesson.id}`
      lessons.push({ id: syntheticId, course_id: course.id, title: lesson.title, position: index })
      const row = courseState?.lessons?.[lesson.id]
      if (!row) return
      lessonProgress.push({
        lesson_id: syntheticId,
        course_id: course.id,
        first_opened_at: row.openedAt || row.updatedAt || null,
        last_viewed_at: row.updatedAt || row.openedAt || null,
        completed_at: row.completedAt || null,
      })
    })
  }

  return { courses, lessons, lessonProgress }
}
