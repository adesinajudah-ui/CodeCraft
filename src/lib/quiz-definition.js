// CodeCraft Quiz Builder — quiz definition parsing and validation.
//
// IMPORTANT SECURITY NOTE: admin JavaScript is NEVER executed inside the main
// CodeCraft application. This module only *statically* parses the source text
// (a tolerant JSON-style reader, no eval / new Function), and preview code is
// rendered inside a sandboxed iframe (sandbox="allow-scripts", opaque origin)
// via buildSandboxDocument(). See QuizBuilder.jsx.

// ---------------------------------------------------------------------------
// Tolerant JSON-style value parser (static, no evaluation)
// ---------------------------------------------------------------------------

function skipWhitespaceAndComments(text, state) {
  while (state.index < text.length) {
    const char = text[state.index]
    if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
      state.index += 1
    } else if (char === '/' && text[state.index + 1] === '/') {
      while (state.index < text.length && text[state.index] !== '\n') state.index += 1
    } else if (char === '/' && text[state.index + 1] === '*') {
      const end = text.indexOf('*/', state.index + 2)
      if (end < 0) throw new Error('Unterminated block comment in quiz definition.')
      state.index = end + 2
    } else {
      break
    }
  }
}

function readString(text, state, quote) {
  let value = ''
  state.index += 1 // opening quote
  while (state.index < text.length) {
    const char = text[state.index]
    if (char === '\\') {
      const next = text[state.index + 1]
      if (next === undefined) throw new Error('Unterminated string in quiz definition.')
      if (next === 'u') {
        const hex = text.slice(state.index + 2, state.index + 6)
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) throw new Error('Invalid unicode escape in quiz definition.')
        value += String.fromCharCode(parseInt(hex, 16))
        state.index += 6
        continue
      }
      const escapes = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', '0': '\0' }
      value += escapes[next] !== undefined && next !== 'x' ? escapes[next] : next
      state.index += 2
      continue
    }
    if (char === quote) {
      state.index += 1
      return value
    }
    if (quote !== '`' && char === '\n') throw new Error('Unterminated string in quiz definition.')
    if (quote === '`' && char === '$' && text[state.index + 1] === '{') {
      throw new Error('Template interpolation is not supported in the quiz definition. Use plain text.')
    }
    value += char
    state.index += 1
  }
  throw new Error('Unterminated string in quiz definition.')
}

function readLiteral(text, state) {
  const start = state.index
  while (state.index < text.length && /[A-Za-z0-9_$.\-+]/.test(text[state.index])) state.index += 1
  const raw = text.slice(start, state.index)
  if (raw === 'true') return true
  if (raw === 'false') return false
  if (raw === 'null' || raw === 'undefined') return null
  if (raw !== '' && !Number.isNaN(Number(raw))) return Number(raw)
  throw new Error(`Unexpected value "${raw}" in quiz definition. Use plain strings, numbers, booleans, arrays and objects.`)
}

function readValue(text, state) {
  skipWhitespaceAndComments(text, state)
  if (state.index >= text.length) throw new Error('Unexpected end of quiz definition.')
  const char = text[state.index]

  if (char === '"' || char === "'" || char === '`') return readString(text, state, char)

  if (char === '[') {
    const array = []
    state.index += 1
    for (;;) {
      skipWhitespaceAndComments(text, state)
      if (text[state.index] === ']') { state.index += 1; return array }
      if (state.index >= text.length) throw new Error('Unterminated array in quiz definition.')
      array.push(readValue(text, state))
      skipWhitespaceAndComments(text, state)
      if (text[state.index] === ',') { state.index += 1; continue }
      if (text[state.index] === ']') { state.index += 1; return array }
      throw new Error('Expected "," or "]" in quiz definition array.')
    }
  }

  if (char === '{') {
    const object = {}
    state.index += 1
    for (;;) {
      skipWhitespaceAndComments(text, state)
      if (text[state.index] === '}') { state.index += 1; return object }
      if (state.index >= text.length) throw new Error('Unterminated object in quiz definition.')
      let key
      if (text[state.index] === '"' || text[state.index] === "'" || text[state.index] === '`') {
        key = readString(text, state, text[state.index])
      } else {
        const start = state.index
        while (state.index < text.length && /[A-Za-z0-9_$]/.test(text[state.index])) state.index += 1
        key = text.slice(start, state.index)
        if (!key) throw new Error('Invalid object key in quiz definition.')
      }
      skipWhitespaceAndComments(text, state)
      if (text[state.index] !== ':') throw new Error(`Expected ":" after key "${key}" in quiz definition.`)
      state.index += 1
      object[key] = readValue(text, state)
      skipWhitespaceAndComments(text, state)
      if (text[state.index] === ',') { state.index += 1; continue }
      if (text[state.index] === '}') { state.index += 1; return object }
      throw new Error('Expected "," or "}" in quiz definition object.')
    }
  }

  return readLiteral(text, state)
}

// Locate `const questions = [...]` (or `let`/`var`, optional semicolon) without
// executing anything, then parse the array literal with the tolerant reader.
export function extractQuestionsFromJs(jsSource) {
  const source = String(jsSource || '')
  const declaration = /(?:^|[\s;}])(?:const|let|var)\s+questions\s*(?::[^=]+)?=\s*/.exec(source)
  if (!declaration) return { questions: null }

  const state = { index: declaration.index + declaration[0].length }
  let value
  try {
    value = readValue(source, state)
  } catch (parseError) {
    return { error: parseError.message || 'The questions array could not be parsed.' }
  }
  if (!Array.isArray(value)) {
    return { error: '`questions` must be an array of question objects.' }
  }
  return { questions: value }
}

// ---------------------------------------------------------------------------
// codecraft-quiz markup parsing (static DOMParser, no script execution)
// ---------------------------------------------------------------------------

function textContentOf(element) {
  return (element?.textContent || '').replace(/\s+/g, ' ').trim()
}

export function extractQuestionsFromMarkup(htmlSource) {
  const source = String(htmlSource || '')
  if (!/<codecraft-quiz[\s>]/i.test(source)) return { questions: null }

  let document
  try {
    document = new DOMParser().parseFromString(source, 'text/html')
  } catch {
    return { error: 'The quiz HTML could not be parsed.' }
  }
  const root = document.querySelector('codecraft-quiz')
  if (!root) return { questions: null }

  const questions = []
  const questionNodes = root.querySelectorAll('question')
  questionNodes.forEach((questionNode, index) => {
    const options = []
    const optionIdToText = new Map()
    questionNode.querySelectorAll('option').forEach((optionNode) => {
      const id = (optionNode.getAttribute('id') || '').trim()
      const text = textContentOf(optionNode)
      if (!id || !text) return
      options.push(text)
      optionIdToText.set(id, text)
    })

    const correctNodes = questionNode.querySelectorAll('correct')
    const correctId = correctNodes.length === 1 ? textContentOf(correctNodes[0]) : ''
    const correctAnswer = optionIdToText.get(correctId) ?? null

    // Question text: explicit <text> child, then a text="" attribute, then
    // any heading/paragraph content that appears before the first option.
    let text = textContentOf(questionNode.querySelector('text')) || (questionNode.getAttribute('text') || '').trim()
    if (!text) {
      const firstOption = questionNode.querySelector('option')
      for (const node of questionNode.childNodes) {
        if (node === firstOption) break
        text = `${text} ${textContentOf({ textContent: node.textContent })}`.trim()
      }
    }

    questions.push({
      key: (questionNode.getAttribute('id') || `q${index + 1}`).trim(),
      text,
      options,
      correctAnswer,
      explanation: textContentOf(questionNode.querySelector('explanation')),
      hint: textContentOf(questionNode.querySelector('hint')) || '',
    })
  })

  return { questions }
}

// ---------------------------------------------------------------------------
// Normalization + validation
// ---------------------------------------------------------------------------

const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)

const asText = (value) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

// Accepts both the JS shape ({ id, question, options: [{id,text}], correctAnswer })
// and the stored shape ({ key, text, options: ["...", ...], correctAnswer }).
export function normalizeQuestion(raw, index) {
  if (!isPlainObject(raw)) return { error: `Question ${index + 1} must be an object.` }

  const key = asText(raw.key ?? raw.id ?? raw.question_id) || `q${index + 1}`
  const text = asText(raw.text ?? raw.question ?? raw.title)
  const explanation = asText(raw.explanation)
  const hint = asText(raw.hint)

  let optionTexts = []
  let optionObjectById = new Map()
  const rawOptions = raw.options ?? raw.choices ?? raw.answers
  if (Array.isArray(rawOptions)) {
    optionTexts = rawOptions.map((option) => {
      if (isPlainObject(option)) {
        const id = asText(option.id ?? option.key)
        const text = asText(option.text ?? option.label ?? option.value ?? option.answer)
        if (id) optionObjectById.set(id, text)
        return text
      }
      return asText(option)
    })
  } else if (typeof rawOptions === 'string') {
    optionTexts = rawOptions.split('\n').map((option) => option.trim()).filter(Boolean)
  }

  const correctRaw = raw.correctAnswer ?? raw.correct_answer ?? raw.correct ?? raw.answer
  let correctAnswer = null
  if (typeof correctRaw === 'string' || typeof correctRaw === 'number') {
    const correctText = asText(correctRaw)
    correctAnswer = optionTexts.includes(correctText)
      ? correctText
      : optionTexts.find((option) => option.toLowerCase() === correctText.toLowerCase()) ?? null
    if (!correctAnswer && optionObjectById.has(correctText)) {
      // correctAnswer references an option object's stable id (e.g. "a"),
      // never its position.
      correctAnswer = optionObjectById.get(correctText) || null
    }
  } else if (isPlainObject(correctRaw)) {
    correctAnswer = asText(correctRaw.text ?? correctRaw.value)
  }

  const question = { key, text, options: optionTexts, correctAnswer, explanation, hint }
  const problems = validateQuestionShape(question, index)
  return problems.length ? { error: problems.join(' ') } : { question }
}

function validateQuestionShape(question, index) {
  const label = `Question ${index + 1} ("${question.key}"):`
  const problems = []
  if (!question.text) problems.push(`${label} the question text is empty.`)
  if (!question.options.length) problems.push(`${label} no answer options were found.`)
  if (question.options.some((option) => !option)) problems.push(`${label} contains an empty option.`)
  if (new Set(question.options).size !== question.options.length) problems.push(`${label} has duplicate option text.`)
  if (!question.correctAnswer) problems.push(`${label} no correct answer has been defined (or it does not match an option).`)
  return problems
}

export function parseQuizDefinition({ js = '', html = '' }) {
  const jsResult = extractQuestionsFromJs(js)
  if (jsResult.questions) {
    const questions = []
    for (let index = 0; index < jsResult.questions.length; index += 1) {
      const normalized = normalizeQuestion(jsResult.questions[index], index)
      if (normalized.error) return { source: 'js', error: normalized.error, questions: [] }
      questions.push(normalized.question)
    }
    return { source: 'js', questions, error: null }
  }
  if (jsResult.error) return { source: 'js', error: jsResult.error, questions: [] }

  const markupResult = extractQuestionsFromMarkup(html)
  if (markupResult.questions) {
    const questions = []
    for (let index = 0; index < markupResult.questions.length; index += 1) {
      const normalized = normalizeQuestion(markupResult.questions[index], index)
      if (normalized.error) return { source: 'markup', error: normalized.error, questions: [] }
      questions.push(normalized.question)
    }
    if (questions.length) return { source: 'markup', questions, error: null }
  }
  if (markupResult.error) return { source: 'markup', error: markupResult.error, questions: [] }

  return { source: null, questions: [], error: null }
}

// Publish-time validation. Enforces the full CodeCraft quiz contract:
// unique question ids, four options (A–D), one correct answer, explanation.
export function validateQuizForPublish({ title, timeLimitSeconds, xpReward, questions }) {
  const errors = []

  if (!String(title || '').trim()) errors.push('Quiz title is required.')
  if (questions.length < 1) errors.push('Add at least one question before publishing — no questions were parsed from the definition.')

  const seenKeys = new Set()
  questions.forEach((question, index) => {
    const label = question.key || `q${index + 1}`
    if (seenKeys.has(label)) {
      errors.push(`Question ${index + 1}: duplicate question ID "${label}".`)
    }
    seenKeys.add(label)

    if (!question.text) errors.push(`Question ${index + 1}: the question text is empty.`)

    if (question.options.length === 0) {
      errors.push(`Question ${index + 1}: no answer options were found. Four options are required.`)
    } else if (question.options.length < 4) {
      errors.push(`Question ${index + 1}: only ${question.options.length} option${question.options.length === 1 ? ' was' : 's were'} found. Four options are required.`)
    } else if (question.options.length > 4) {
      errors.push(`Question ${index + 1}: ${question.options.length} options were found. Exactly four options are allowed (A–D).`)
    }

    if (question.options.some((option) => !option)) {
      errors.push(`Question ${index + 1}: an answer option is empty.`)
    }
    if (new Set(question.options).size !== question.options.length) {
      errors.push(`Question ${index + 1}: duplicate option text — every option must be unique.`)
    }
    if (!question.correctAnswer) {
      errors.push(`Question ${index + 1}: no correct answer has been defined.`)
    }
    if (!String(question.explanation || '').trim()) {
      errors.push(`Question ${index + 1}: an explanation is required so students can review their answers.`)
    }
  })

  if (!Number.isFinite(Number(timeLimitSeconds)) || Number(timeLimitSeconds) < 60) {
    errors.push('Time limit must be at least 1 minute.')
  }
  if (!Number.isFinite(Number(xpReward)) || Number(xpReward) < 0) {
    errors.push('XP reward must be zero or more.')
  }

  return { ok: errors.length === 0, errors, questionCount: questions.length }
}

// ---------------------------------------------------------------------------
// Sandboxed preview document (opaque-origin iframe via sandbox="allow-scripts")
// ---------------------------------------------------------------------------

const escapeScript = (code) => String(code || '').replace(/<\/script/gi, '<\\/script')
const escapeStyle = (css) => String(css || '').replace(/<\/style/gi, '<\\/style')

export function buildSandboxDocument({ html = '', css = '', js = '' }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root { color-scheme: light; }
  body { margin: 0; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: #f5f8fc; color: #17334e; }
  .sandbox-error { position: fixed; inset: auto 0 0 0; margin: 0; padding: 10px 14px; background: #b3261e; color: #fff; font: 12px/1.5 monospace; z-index: 9999; white-space: pre-wrap; }
</style>
<style>${escapeStyle(css)}</style>
</head>
<body>
${html}
<script>
  window.addEventListener('error', function (event) {
    var bar = document.createElement('p');
    bar.className = 'sandbox-error';
    bar.textContent = 'Preview error: ' + (event.message || 'Unknown error');
    document.body.appendChild(bar);
  });
</script>
<script>
try {
${escapeScript(js)}
} catch (error) {
  var bar = document.createElement('p');
  bar.className = 'sandbox-error';
  bar.textContent = 'Preview error: ' + (error && error.message ? error.message : error);
  document.body.appendChild(bar);
}
</script>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Sample definition (builder convenience only — never hardcoded into the engine)
// ---------------------------------------------------------------------------

export const SAMPLE_QUIZ = {
  title: 'HTML Fundamentals Demo',
  description: 'A short demo quiz that shows how the CodeCraft Quiz Builder works.',
  category: 'HTML',
  difficulty: 'Beginner',
  timeLimitMinutes: 5,
  xpReward: 50,
  icon: 'HTML',
  html: `<div class="quiz-container">
  <h1>HTML Fundamentals Demo</h1>

  <div class="question">
    <h2>Which element creates a hyperlink?</h2>
    <button data-answer="a">&lt;a&gt;</button>
    <button data-answer="b">&lt;link&gt;</button>
    <button data-answer="c">&lt;href&gt;</button>
    <button data-answer="d">&lt;url&gt;</button>
  </div>
</div>`,
  css: `.quiz-container {
  max-width: 700px;
  margin: 40px auto;
  padding: 30px;
  background: #fff;
  border-radius: 16px;
}

.question {
  border: 1px solid #dce6ef;
  border-radius: 16px;
  padding: 20px;
}

.question button {
  display: block;
  width: 100%;
  margin: 8px 0;
  padding: 12px 14px;
  border: 1px solid #dce6ef;
  border-radius: 10px;
  background: #fbfdff;
  cursor: pointer;
}`,
  js: `const questions = [
  {
    id: "q1",
    question: "Which HTML element creates a hyperlink?",
    options: [
      { id: "a", text: "<a>" },
      { id: "b", text: "<link>" },
      { id: "c", text: "<href>" },
      { id: "d", text: "<url>" }
    ],
    correctAnswer: "a",
    explanation: "The <a> element creates hyperlinks."
  },
  {
    id: "q2",
    question: "Which HTML element displays an image?",
    options: [
      { id: "a", text: "<picture>" },
      { id: "b", text: "<img>" },
      { id: "c", text: "<image>" },
      { id: "d", text: "<src>" }
    ],
    correctAnswer: "b",
    explanation: "The <img> element embeds an image."
  },
  {
    id: "q3",
    question: "Which element represents the largest standard HTML heading?",
    options: [
      { id: "a", text: "<heading>" },
      { id: "b", text: "<h6>" },
      { id: "c", text: "<h1>" },
      { id: "d", text: "<head>" }
    ],
    correctAnswer: "c",
    explanation: "<h1> is the largest standard heading."
  }
];`,
}
