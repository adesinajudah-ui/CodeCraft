// Spec test cases A–D for the quiz result calculation (run: node scripts/test-quiz-result.mjs)
import { calculateQuizResult, normalizeQuizOptions } from '../src/lib/quiz-result.js'

let failures = 0
const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) console.log(`  ok  ${name}`)
  else { failures += 1; console.log(`FAIL  ${name}\n      expected ${JSON.stringify(expected)}\n      got      ${JSON.stringify(actual)}`) }
}

// 10-question quiz: q1..q10, correct answer is always the option text "Correct <n>"
const makeQuestions = (count) => Array.from({ length: count }, (_, index) => ({
  id: `q${index + 1}`,
  question: `Question ${index + 1}`,
  options: [`Correct ${index + 1}`, `Wrong A${index + 1}`, `Wrong B${index + 1}`, `Wrong C${index + 1}`],
  correct_answer: `Correct ${index + 1}`,
  explanation: `Explanation ${index + 1}`,
}))
const questions = makeQuestions(10)
const answerKey = (indexes) => Object.fromEntries(indexes.map((n) => [`q${n}`, `Correct ${n}`]))
const wrongKey = (indexes) => Object.fromEntries(indexes.map((n) => [`q${n}`, `Wrong A${n}`]))
const meta = { xpReward: 100, timeLimitSeconds: 600, timeLeft: 522 } // 08:42 used

// Test case A: all 10 correct → 10/10, 100%, attempted 10, unanswered 0
const a = calculateQuizResult(questions, answerKey([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), meta)
check('A score', a.score, 10)
check('A percentage', a.percentage, 100)
check('A attempted', a.questionsAttempted, 10)
check('A correct', a.correctAnswers, 10)
check('A wrong', a.wrongAnswers, 0)
check('A unanswered', a.unansweredQuestions, 0)
check('A xp', a.xpEarned, 100)
check('A timeUsed', a.timeUsed, 78)

// Test case B: 7 correct, 3 wrong → 7/10, 70%, attempted 10
const b = calculateQuizResult(questions, { ...answerKey([1, 2, 3, 4, 5, 6, 7]), ...wrongKey([8, 9, 10]) }, meta)
check('B score', b.score, 7)
check('B percentage', b.percentage, 70)
check('B attempted', b.questionsAttempted, 10)
check('B correct', b.correctAnswers, 7)
check('B wrong', b.wrongAnswers, 3)
check('B unanswered', b.unansweredQuestions, 0)
check('B xp', b.xpEarned, 70)

// Test case C: only 6 answered (5 correct, 1 wrong) → 5/10, 50%, attempted 6, unanswered 4
const c = calculateQuizResult(questions, { ...answerKey([1, 2, 3, 4, 5]), ...wrongKey([6]) }, meta)
check('C score', c.score, 5)
check('C percentage', c.percentage, 50)
check('C attempted', c.questionsAttempted, 6)
check('C correct', c.correctAnswers, 5)
check('C wrong', c.wrongAnswers, 1)
check('C unanswered', c.unansweredQuestions, 4)
check('C xp', c.xpEarned, 50)

// Test case D: nothing answered → 0/10, 0%, attempted 0, unanswered 10 — results still render
const d = calculateQuizResult(questions, {}, meta)
check('D score', d.score, 0)
check('D percentage', d.percentage, 0)
check('D attempted', d.questionsAttempted, 0)
check('D wrong', d.wrongAnswers, 0)
check('D unanswered', d.unansweredQuestions, 10)
check('D xp', d.xpEarned, 0)
check('D review covers all 10', d.answerReview.length, 10)
check('D review marks unanswered', d.answerReview.every((row) => row.unanswered && row.selectedAnswer === null), true)

// Review rows always include question text, correct answer, and explanation
check('B review fields', { q: b.answerReview[0].question, c: b.answerReview[0].correctAnswer, e: b.answerReview[0].explanation }, { q: 'Question 1', c: 'Correct 1', e: 'Explanation 1' })
check('B review wrong flag', { ok: b.answerReview[7].isCorrect, un: b.answerReview[7].unanswered, sel: b.answerReview[7].selectedAnswer }, { ok: false, un: false, sel: 'Wrong A8' })

// Correct answer matched by option TEXT, not position (randomization-safe)
const shuffled = [{ id: 'q1', question: 'Q', options: ['Wrong', 'Right'], correct_answer: 'Right' }]
const shuffledResult = calculateQuizResult(shuffled, { q1: 'Right' }, { xpReward: 10 })
check('text identity (not position)', { score: shuffledResult.score, pct: shuffledResult.percentage }, { score: 1, pct: 100 })

// String/number tolerance for option text stored as number
const numeric = [{ id: 'q1', question: 'Q', options: [1989, 1990], correct_answer: 1989 }]
check('numeric option text', calculateQuizResult(numeric, { q1: '1989' }, {}).score, 1)

// normalizeQuizOptions: drops empty entries, unwraps {text} objects
check('normalize options', normalizeQuizOptions(['a', { text: 'b' }, '', null]), ['a', 'b'])
// Legacy string-encoded option columns still parse
check('normalize JSON-string options', normalizeQuizOptions('["x","y"]'), ['x', 'y'])
check('normalize pipe-separated options', normalizeQuizOptions('x | y'), ['x', 'y'])

// Zero-question quiz cannot divide by zero
const empty = calculateQuizResult([], {}, {})
check('empty quiz', { pct: empty.percentage, total: empty.totalQuestions }, { pct: 0, total: 0 })

console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed')
process.exit(failures ? 1 : 0)
