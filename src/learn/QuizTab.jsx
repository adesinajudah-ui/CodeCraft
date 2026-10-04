import { useState } from 'react'
import { RichText } from './RichText.jsx'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

export default function QuizTab({ lesson, requiredScore = 60, onFinished, bestScore = 0, attempts = 0 }) {
  const questions = lesson.quiz || []
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [checked, setChecked] = useState(false)
  const [answers, setAnswers] = useState([])
  const [finished, setFinished] = useState(false)

  if (!questions.length) {
    return (
      <div className="learn-tab-empty">
        <h3>No quiz for this lesson</h3>
        <p>Complete the practice exercises, then continue to the next lesson.</p>
      </div>
    )
  }

  const question = questions[index]
  const isLast = index === questions.length - 1
  const score = answers.reduce((total, answer) => total + (answer.correct ? 1 : 0), 0)
  const percentage = answers.length ? Math.round((score / answers.length) * 100) : 0
  const passed = percentage >= requiredScore

  const handleCheck = () => {
    if (selected === null) return
    const correct = selected === question.answer
    setChecked(true)
    setAnswers((current) => {
      const next = [...current]
      next[index] = { selected, correct, questionIndex: index }
      return next
    })
  }

  const handleNext = () => {
    if (isLast) {
      const finalAnswers = answers
      const finalScore = finalAnswers.filter((answer) => answer?.correct).length
      const finalPercentage = Math.round((finalScore / questions.length) * 100)
      setFinished(true)
      onFinished?.({ score: finalPercentage, total: questions.length, correct: finalScore, passed: finalPercentage >= requiredScore })
      return
    }
    setIndex((current) => current + 1)
    setSelected(null)
    setChecked(false)
  }

  const handleRetry = () => {
    setIndex(0)
    setSelected(null)
    setChecked(false)
    setAnswers([])
    setFinished(false)
  }

  if (finished) {
    return (
      <div className="quiz-result">
        <span className="quiz-result__score">{percentage}%</span>
        <h3>{passed ? 'Lesson quiz passed 🎉' : 'Almost there'}</h3>
        <p>
          You answered <strong>{score} of {questions.length}</strong> questions correctly.
          {passed ? ` Required score was ${requiredScore}%.` : ` You need ${requiredScore}% to continue — review the lesson and try again.`}
        </p>
        {attempts > 0 && <p className="quiz-result__meta">Best score: {Math.max(bestScore, percentage)}% · Attempts: {attempts}</p>}
        <div className="quiz-result__actions">
          <button type="button" className="learn-btn" onClick={handleRetry}>Retake quiz</button>
        </div>
      </div>
    )
  }

  return (
    <div className="quiz-card">
      <div className="quiz-card__progress">
        <span>Question {index + 1} of {questions.length}</span>
        <div className="practice-summary__bar"><span style={{ width: `${((index) / questions.length) * 100}%` }} /></div>
      </div>

      <RichText text={question.q} as="h3" className="quiz-card__question" />

      <div className="quiz-options" role="radiogroup" aria-label={question.q}>
        {question.options.map((option, optionIndex) => {
          const isSelected = selected === optionIndex
          const isCorrect = question.answer === optionIndex
          const state = checked
            ? (isCorrect ? 'is-correct' : (isSelected ? 'is-wrong' : ''))
            : (isSelected ? 'is-selected' : '')
          return (
            <button
              key={optionIndex}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={checked}
              className={`quiz-option ${state}`}
              onClick={() => setSelected(optionIndex)}
            >
              <span className="quiz-option__key">{LETTERS[optionIndex]}</span>
              <RichText text={option} as="span" />
              {checked && isCorrect && <span className="quiz-option__mark">Correct answer</span>}
              {checked && isSelected && !isCorrect && <span className="quiz-option__mark">Your answer</span>}
            </button>
          )
        })}
      </div>

      {checked && (
        <div className={`quiz-feedback ${selected === question.answer ? 'is-correct' : 'is-wrong'}`} role="status">
          <strong>{selected === question.answer ? 'Correct!' : 'Not this time.'}</strong>
          <RichText text={question.explanation} as="p" />
        </div>
      )}

      <div className="quiz-card__actions">
        {!checked ? (
          <button type="button" className="learn-btn learn-btn--primary" onClick={handleCheck} disabled={selected === null}>
            Check answer
          </button>
        ) : (
          <button type="button" className="learn-btn learn-btn--primary" onClick={handleNext}>
            {isLast ? 'See my score' : 'Next question'}
          </button>
        )}
        <span className="quiz-card__note">The correct answer is only revealed after you submit.</span>
      </div>
    </div>
  )
}
