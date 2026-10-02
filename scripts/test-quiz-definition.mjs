import { parseQuizDefinition, validateQuizForPublish, buildSandboxDocument } from '../src/lib/quiz-definition.js'

// Node has no DOMParser (browsers do); if jsdom is installed locally we use it,
// otherwise the markup checks are skipped (this code path is browser-only).
let DOMParserPolyfill = null
try {
  const { JSDOM } = await import('jsdom')
  DOMParserPolyfill = JSDOM
} catch { /* jsdom not installed — markup tests will be skipped */ }
if (DOMParserPolyfill) {
  globalThis.DOMParser = class {
    parseFromString(markup) { return new DOMParserPolyfill(markup).window.document }
  }
}
const markupSupported = typeof globalThis.DOMParser !== 'undefined'

let failures = 0
const check = (name, condition, detail = '') => {
  if (condition) console.log(`  ok  ${name}`)
  else { failures += 1; console.log(`FAIL  ${name} ${detail}`) }
}

// 1. Spec's exact JS sample shape
const jsSample = `const questions = [
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
  }
];`
const jsParsed = parseQuizDefinition({ js: jsSample, html: '' })
check('JS sample parses 2 questions', jsParsed.questions.length === 2, JSON.stringify(jsParsed))
check('correctAnswer by stable id resolves to option text', jsParsed.questions[0].correctAnswer === '<a>', jsParsed.questions[0].correctAnswer)
check('q2 correct is <img>', jsParsed.questions[1].correctAnswer === '<img>', jsParsed.questions[1].correctAnswer)

// 2. codecraft-quiz markup
const markup = `<codecraft-quiz title="HTML Fundamentals" category="HTML" difficulty="Beginner" time="15" xp="500">
  <question id="q1" text="Which element creates a hyperlink?">
    <option id="a">&lt;a&gt;</option>
    <option id="b">&lt;link&gt;</option>
    <option id="c">&lt;href&gt;</option>
    <option id="d">&lt;url&gt;</option>
    <correct>a</correct>
    <explanation>The &lt;a&gt; element creates hyperlinks.</explanation>
  </question>
</codecraft-quiz>`
const markupParsed = parseQuizDefinition({ js: '', html: markup })
if (markupSupported) {
  check('markup parses 1 question', markupParsed.questions.length === 1, JSON.stringify(markupParsed))
  check('markup correct via <correct>a</correct>', markupParsed.questions[0]?.correctAnswer === '<a>', markupParsed.questions[0]?.correctAnswer)
  check('markup explanation extracted', (markupParsed.questions[0]?.explanation || '').includes('creates hyperlinks'))
} else {
  console.log('  skip markup checks (no DOMParser in Node)')
}

// 3. Broken input never crashes, returns precise errors
check('empty sources -> zero questions, no error', parseQuizDefinition({ js: '', html: '' }).questions.length === 0)
const broken = parseQuizDefinition({ js: 'const questions = [{ id: "q1" }', html: '' })
check('unterminated array -> error surfaced', Boolean(broken.error), JSON.stringify(broken))

// 4. Publish validation
const good = validateQuizForPublish({
  title: 'T',
  timeLimitSeconds: 300,
  xpReward: 50,
  questions: [{ key: 'q1', text: 'Q?', options: ['<a>', '<link>', '<href>', '<url>'], correctAnswer: '<a>', explanation: 'Because.' }],
})
check('valid quiz passes publish validation', good.ok === true, JSON.stringify(good.errors))

const noCorrect = validateQuizForPublish({
  title: 'T', timeLimitSeconds: 300, xpReward: 50,
  questions: [{ key: 'q1', text: 'Q?', options: ['A', 'B', 'C', 'D'], correctAnswer: null, explanation: 'x' }],
})
check('missing correct answer rejected', !noCorrect.ok && noCorrect.errors.some((e) => e.includes('no correct answer')))

const threeOptions = validateQuizForPublish({
  title: 'T', timeLimitSeconds: 300, xpReward: 50,
  questions: [{ key: 'q1', text: 'Q?', options: ['A', 'B', 'C'], correctAnswer: 'A', explanation: 'x' }],
})
check('3 options rejected with exact wording', threeOptions.errors.some((e) => e.includes('only 3 options were found. Four options are required')), JSON.stringify(threeOptions.errors))

const dupKey = validateQuizForPublish({
  title: 'T', timeLimitSeconds: 300, xpReward: 50,
  questions: [
    { key: 'q4', text: 'Q1?', options: ['A', 'B', 'C', 'D'], correctAnswer: 'A', explanation: 'x' },
    { key: 'q4', text: 'Q2?', options: ['A', 'B', 'C', 'D'], correctAnswer: 'B', explanation: 'x' },
  ],
})
check('duplicate question ID rejected', dupKey.errors.some((e) => e.includes('duplicate question ID "q4"')), JSON.stringify(dupKey.errors))

// 5. Sandbox document never leaks secrets
const doc = buildSandboxDocument({ html: '<div>hi</div>', css: '.a{}', js: 'console.log("x")</script><script>alert(1)</script>' })
check('script-closing escape applied', doc.includes('<\\/script>'))
check('sandbox doc has no external permissions', !doc.includes('allow-same-origin'))

console.log(failures === 0 ? '\nAll quiz-definition checks passed.' : `\n${failures} check(s) FAILED.`)
process.exit(failures === 0 ? 0 : 1)
