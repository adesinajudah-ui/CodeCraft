// Validation for CodeCraft lesson tasks and practice activities.
// Pure JS with no React imports so it can also run under Node
// (see scripts/validate-courses.mjs).

const toComparable = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/^["'`]+|["'`]+$/g, '')

export function compileCheck(check) {
  const definition = typeof check === 'string' ? { pattern: check } : { ...check }
  let source = String(definition.pattern ?? '')
  let flags = String(definition.flags || '')

  // Authoring convention: a leading (?s) means "dot matches newlines".
  if (source.startsWith('(?s)')) {
    source = source.slice(4)
  }
  // Task patterns always run against multi-line HTML, so `.` may cross newlines.
  if (!flags.includes('s')) flags += 's'

  let regex = null
  let compileError = null
  try {
    regex = new RegExp(source, flags)
  } catch (error) {
    compileError = error.message
  }

  return { ...definition, source, flags, regex, compileError }
}

export function evaluateCheck(compiled, code) {
  const text = String(code ?? '')

  if (compiled.compileError) {
    return {
      passed: false,
      message: compiled.message || 'This check could not be evaluated.',
      error: compiled.compileError,
    }
  }

  if (!compiled.regex) {
    const needle = toComparable(compiled.pattern)
    const passed = toComparable(text).includes(needle)
    return { passed: compiled.not ? !passed : passed, message: compiled.message }
  }

  const matches = text.match(new RegExp(compiled.regex.source, `${compiled.regex.flags.includes('g') ? '' : 'g'}${compiled.regex.flags}`)) || []

  if (typeof compiled.maxMatches === 'number' && matches.length > compiled.maxMatches) {
    return { passed: false, message: compiled.message }
  }
  if (typeof compiled.minMatches === 'number' && matches.length < compiled.minMatches) {
    return { passed: false, message: compiled.message }
  }

  const matched = compiled.regex.test(text)
  const passed = compiled.not ? !matched : matched
  return { passed, message: compiled.message }
}

// Returns { passed, results: [{ passed, message }] }
export function runChecks(code, checks = []) {
  const results = (checks || []).map((check) => evaluateCheck(compileCheck(check), code))
  return { passed: results.length > 0 && results.every((result) => result.passed), results }
}

// --- practice activities -------------------------------------------------

export function extractBlanks(prompt = '') {
  return String(prompt).split(/_{3,}/g)
}

export function countBlanks(prompt = '') {
  return Math.max(0, extractBlanks(prompt).length - 1)
}

export function validateFillBlank(task, values = []) {
  const accepted = task.blanks || []
  const results = accepted.map((answers, index) => {
    const given = toComparable(values[index])
    const options = (Array.isArray(answers) ? answers : [answers]).map(toComparable)
    return { passed: Boolean(given) && options.includes(given), index }
  })
  return { passed: results.length > 0 && results.every((result) => result.passed), results }
}

export function validateChoice(task, selectedIndex) {
  const passed = Number(selectedIndex) === Number(task.answer)
  return { passed, results: [{ passed, index: Number(selectedIndex) }] }
}

export function validateReorder(task, order = []) {
  const expected = task.answer || []
  const passed =
    expected.length > 0 &&
    order.length === expected.length &&
    expected.every((fragment, index) => order[index] === fragment)
  return { passed, results: [{ passed }] }
}

export function validateCode(task, code) {
  if (!task.checks || task.checks.length === 0) {
    return { passed: String(code || '').trim().length > 0, results: [] }
  }
  return runChecks(code, task.checks)
}

export function validatePractice(task, answer) {
  switch (task?.type) {
    case 'fill-blank':
      return validateFillBlank(task, answer?.values || [])
    case 'choice':
      return validateChoice(task, answer?.selectedIndex)
    case 'reorder':
      return validateReorder(task, answer?.order || [])
    case 'code':
      return validateCode(task, answer?.code ?? '')
    default:
      return { passed: false, results: [] }
  }
}
