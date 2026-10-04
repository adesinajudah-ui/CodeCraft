// Tests for the CodeCraft learning engine course content.
// Run with: node scripts/test-courses.mjs
import { listEngineCourses, getModuleLessons, getLesson } from '../src/courses/index.js'
import { runChecks, countBlanks, validatePractice } from '../src/learn/task-validator.js'

let failures = 0
const check = (name, condition, detail = '') => {
  if (condition) console.log(`  ok  ${name}`)
  else { failures += 1; console.log(`FAIL  ${name} ${detail}`) }
}

const PRACTICE_TYPES = new Set(['fill-blank', 'choice', 'reorder', 'code'])

for (const course of listEngineCourses()) {
  console.log(`\nCourse: ${course.title}`)

  check(`${course.id}: has id, title and description`, Boolean(course.id && course.title && course.description))
  check(`${course.id}: has modules`, Array.isArray(course.modules) && course.modules.length > 0)
  check(`${course.id}: has lessons`, Array.isArray(course.lessons) && course.lessons.length > 0)

  const lessonIds = course.lessons.map((lesson) => lesson.id)
  check(`${course.id}: lesson ids unique`, new Set(lessonIds).size === lessonIds.length)

  // Modules must reference every lesson exactly once.
  const moduleRefs = course.modules.flatMap((module) => module.lessonIds)
  const missing = lessonIds.filter((id) => !moduleRefs.includes(id))
  const unknown = moduleRefs.filter((id) => !lessonIds.includes(id))
  const duplicated = moduleRefs.filter((id, index) => moduleRefs.indexOf(id) !== index)
  check(`${course.id}: modules cover every lesson`, missing.length === 0, `missing: ${missing.join(', ')}`)
  check(`${course.id}: modules reference known lessons`, unknown.length === 0, `unknown: ${unknown.join(', ')}`)
  check(`${course.id}: no lesson appears in two modules`, duplicated.length === 0, `duplicated: ${duplicated.join(', ')}`)

  for (const module of course.modules) {
    check(`module ${module.id}: has title and lessons`, Boolean(module.title) && module.lessonIds.length > 0)
    const moduleLessons = getModuleLessons(course, module)
    check(`module ${module.id}: resolves its lessons`, moduleLessons.length === module.lessonIds.length)
  }

  course.lessons.forEach((item, index) => {
    const label = `${index + 1}. ${item.title}`
    const seenPracticeIds = new Set()

    check(`${label}: has objectives`, Array.isArray(item.objectives) && item.objectives.length > 0)
    check(`${label}: has sections`, Array.isArray(item.sections) && item.sections.length > 0)
    check(`${label}: has takeaways`, Array.isArray(item.takeaways) && item.takeaways.length > 0)
    check(`${label}: has a duration`, Number(item.duration) > 0)
    check(`${label}: has a task`, Boolean(item.task) && typeof item.task.starter === 'string' && item.task.starter.trim().length > 0)
    check(`${label}: task has a brief`, Boolean(item.task?.brief && item.task.brief.trim().length > 10))
    check(`${label}: task has solution code`, Boolean(item.task?.solution && item.task.solution.trim().length > 0))

    if (item.task?.checks?.length) {
      const solved = runChecks(item.task.solution, item.task.checks)
      check(`${label}: task checks pass on the solution`, solved.passed,
        solved.results.filter((result) => !result.passed).map((result) => result.message).join(' | '))

      const untouched = runChecks(item.task.starter, item.task.checks)
      check(`${label}: task is not already solved by the starter code`, !untouched.passed)
    } else {
      check(`${label}: task defines at least one check`, false)
    }

    check(`${label}: quiz has questions`, Array.isArray(item.quiz) && item.quiz.length > 0)
    item.quiz.forEach((questionItem, qIndex) => {
      const qLabel = `${label} quiz ${qIndex + 1}`
      check(`${qLabel}: has 2+ options`, Array.isArray(questionItem.options) && questionItem.options.length >= 2)
      check(`${qLabel}: answer index is in range`,
        Number.isInteger(questionItem.answer) && questionItem.answer >= 0 && questionItem.answer < (questionItem.options?.length || 0),
        `answer=${questionItem.answer} options=${questionItem.options?.length}`)
      check(`${qLabel}: has an explanation`, Boolean(questionItem.explanation && questionItem.explanation.trim()))
    })

    check(`${label}: has practice activities`, Array.isArray(item.practice) && item.practice.length > 0)

    item.practice?.forEach((task, pIndex) => {
      const pLabel = `${label} practice ${pIndex + 1}`
      check(`${pLabel}: known type`, PRACTICE_TYPES.has(task.type), `type=${task.type}`)
      check(`${pLabel}: unique id`, !seenPracticeIds.has(task.id), `id=${task.id}`)
      seenPracticeIds.add(task.id)
      check(`${pLabel}: has a prompt`, Boolean(task.prompt && task.prompt.trim().length > 3))
      check(`${pLabel}: has hints and an explanation`, Array.isArray(task.hints) && Boolean(task.explanation?.trim()))

      if (task.type === 'fill-blank') {
        check(`${pLabel}: blank count matches answers`,
          countBlanks(task.prompt) === (task.blanks?.length || 0),
          `prompt has ${countBlanks(task.prompt)} blank(s), ${task.blanks?.length || 0} answer(s)`)
        const values = (task.blanks || []).map((answers) => (Array.isArray(answers) ? answers[0] : answers))
        const result = validatePractice(task, { values })
        check(`${pLabel}: accepted answer passes`, result.passed)
      }

      if (task.type === 'choice') {
        check(`${pLabel}: answer index in range`,
          Number.isInteger(task.answer) && task.answer >= 0 && task.answer < (task.options?.length || 0))
        check(`${pLabel}: correct answer passes`, validatePractice(task, { selectedIndex: task.answer }).passed)
        check(`${pLabel}: wrong answer fails`, !validatePractice(task, { selectedIndex: (task.answer + 1) % task.options.length }).passed)
        check(`${pLabel}: no answer fails`, !validatePractice(task, { selectedIndex: -1 }).passed)
      }

      if (task.type === 'reorder') {
        check(`${pLabel}: has 2+ fragments`, Array.isArray(task.fragments) && task.fragments.length >= 2)
        check(`${pLabel}: fragments unique`, new Set(task.fragments || []).size === (task.fragments?.length || 0))
        check(`${pLabel}: has a correct order`,
          Array.isArray(task.answer) && task.answer.length === (task.fragments?.length || 0)
          && task.answer.every((fragment) => task.fragments.includes(fragment)),
          JSON.stringify(task.answer))
        if (Array.isArray(task.answer)) {
          check(`${pLabel}: correct order passes`, validatePractice(task, { order: task.answer }).passed)
          const reversed = [...task.answer].reverse()
          check(`${pLabel}: wrong order fails`, !validatePractice(task, { order: reversed }).passed || task.answer.length < 2)
        }
      }

      if (task.type === 'code') {
        check(`${pLabel}: has checks`, Array.isArray(task.checks) && task.checks.length > 0)
        if (task.solution) {
          const solved = runChecks(task.solution, task.checks)
          check(`${pLabel}: checks pass on the solution`, solved.passed,
            solved.results.filter((result) => !result.passed).map((result) => result.message).join(' | '))
        }
      }
    })
  })
}

// Navigation helpers
{
  const course = listEngineCourses()[0]
  const first = course.lessons[0]
  const last = course.lessons[course.lessons.length - 1]
  check('navigation: first lesson has no module-less id', Boolean(getLesson(course, first.id)))
  check('navigation: last lesson resolves', Boolean(getLesson(course, last.id)))
  check('navigation: unknown lesson returns null', getLesson(course, 'does-not-exist') === null)
}

if (failures > 0) {
  console.log(`\n${failures} course content check(s) failed.`)
  process.exit(1)
}
console.log('\nAll course content checks passed.')
