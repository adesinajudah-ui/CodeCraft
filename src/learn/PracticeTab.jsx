import { useMemo, useState } from 'react'
import { RichText } from './RichText.jsx'
import { validatePractice } from './task-validator.js'

function BlankInputs({ prompt, values, onChange, disabled }) {
  const parts = useMemo(() => String(prompt).split(/_{3,}/g), [prompt])
  return (
    <p className="practice-prompt practice-prompt--blanks">
      {parts.map((part, index) => (
        <span key={index}>
          <RichText text={part} />
          {index < parts.length - 1 && (
            <input
              className="practice-blank"
              value={values[index] || ''}
              disabled={disabled}
              aria-label={`Missing word ${index + 1}`}
              placeholder="…"
              onChange={(event) => {
                const next = [...values]
                next[index] = event.target.value
                onChange(next)
              }}
            />
          )}
        </span>
      ))}
    </p>
  )
}

function ReorderTask({ task, order, onOrderChange, disabled }) {
  const remaining = task.fragments.filter((fragment) => !order.includes(fragment))

  return (
    <div className="practice-reorder">
      <div className="practice-reorder__answer" aria-label="Your order">
        {order.length === 0 && <span className="practice-reorder__empty">Tap the fragments below in the right order…</span>}
        {order.map((fragment, index) => (
          <button
            key={fragment}
            type="button"
            className="practice-chip practice-chip--chosen"
            disabled={disabled}
            onClick={() => onOrderChange(order.filter((_, i) => i !== index))}
            aria-label={`Remove ${fragment} from position ${index + 1}`}
          >
            <em>{index + 1}</em> <code>{fragment}</code>
          </button>
        ))}
      </div>
      <div className="practice-reorder__pool">
        {remaining.map((fragment) => (
          <button
            key={fragment}
            type="button"
            className="practice-chip"
            disabled={disabled}
            onClick={() => onOrderChange([...order, fragment])}
          >
            <code>{fragment}</code>
          </button>
        ))}
        {remaining.length === 0 && <span className="practice-reorder__empty">All fragments used.</span>}
      </div>
    </div>
  )
}

function PracticeCard({ task, index, total, solved, onSolved, points }) {
  const [values, setValues] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [order, setOrder] = useState([])
  const [code, setCode] = useState(task.starter || '')
  const [hintsShown, setHintsShown] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [feedback, setFeedback] = useState(null)

  const isSolved = Boolean(solved)

  const evaluate = () => {
    const answer = {
      values,
      selectedIndex,
      order,
      code,
    }
    const result = validatePractice(task, answer)
    const attemptCount = attempts + 1
    setAttempts(attemptCount)
    setFeedback({ passed: result.passed, attempt: attemptCount })
    onSolved(task, { passed: result.passed, attempts: attemptCount })
    return result.passed
  }

  const handleReset = () => {
    setValues([])
    setSelectedIndex(null)
    setOrder([])
    setCode(task.starter || '')
    setFeedback(null)
  }

  const canSubmit =
    task.type === 'fill-blank'
      ? values.filter((value) => String(value || '').trim()).length === (task.blanks?.length || 0)
      : task.type === 'choice'
        ? selectedIndex !== null
        : task.type === 'reorder'
          ? order.length === (task.fragments?.length || 0)
          : String(code || '').trim().length > 0

  return (
    <article className={`practice-card ${isSolved ? 'is-solved' : ''}`}>
      <header className="practice-card__head">
        <span className="practice-card__count">Practice {index + 1} of {total}</span>
        {isSolved && <span className="practice-card__badge">✓ Solved</span>}
      </header>

      <RichText text={task.prompt} as="p" className="practice-prompt" />

      {task.type === 'fill-blank' && <BlankInputs prompt={task.prompt} values={values} onChange={setValues} disabled={isSolved} />}

      {task.type === 'choice' && (
        <div className="practice-options" role="radiogroup" aria-label={task.prompt}>
          {task.options.map((option, optionIndex) => (
            <button
              key={optionIndex}
              type="button"
              role="radio"
              aria-checked={selectedIndex === optionIndex}
              className={`practice-option ${selectedIndex === optionIndex ? 'is-selected' : ''} ${
                feedback && optionIndex === task.answer ? 'is-correct' : ''
              } ${feedback && selectedIndex === optionIndex && optionIndex !== task.answer ? 'is-wrong' : ''}`}
              disabled={isSolved || Boolean(feedback && feedback.passed)}
              onClick={() => { setSelectedIndex(optionIndex); setFeedback(null) }}
            >
              <span className="practice-option__key">{String.fromCharCode(65 + optionIndex)}</span>
              <RichText text={option} as="span" />
            </button>
          ))}
        </div>
      )}

      {task.type === 'reorder' && (
        <ReorderTask task={task} order={order} onOrderChange={setOrder} disabled={isSolved} />
      )}

      {task.type === 'code' && (
        <textarea
          className="practice-code"
          value={code}
          disabled={isSolved}
          spellCheck={false}
          aria-label={task.prompt}
          onChange={(event) => setCode(event.target.value)}
        />
      )}

      {!isSolved && (
        <div className="practice-card__actions">
          <button type="button" className="learn-btn learn-btn--primary" onClick={evaluate} disabled={!canSubmit}>
            Check answer
          </button>
          {feedback && !feedback.passed && hintsShown < (task.hints?.length || 0) && (
            <button type="button" className="learn-btn" onClick={() => setHintsShown((count) => count + 1)}>
              Show hint ({hintsShown + 1}/{task.hints.length})
            </button>
          )}
          {feedback && !feedback.passed && <button type="button" className="learn-btn" onClick={handleReset}>Try again</button>}
        </div>
      )}

      {hintsShown > 0 && !isSolved && (
        <ul className="practice-hints">
          {task.hints.slice(0, hintsShown).map((hint, hintIndex) => (
            <li key={hintIndex}><strong>Hint {hintIndex + 1}:</strong> <RichText text={hint} /></li>
          ))}
        </ul>
      )}

      {feedback && (
        <div className={`practice-feedback ${feedback.passed ? 'is-correct' : 'is-wrong'}`} role="status">
          <strong>{feedback.passed ? `Correct! +${points} points` : 'Not quite yet.'}</strong>
          {!feedback.passed && <span> Read the feedback, reveal a hint, and try again — retries are unlimited.</span>}
          {feedback.passed && <RichText text={task.explanation} as="p" />}
        </div>
      )}

      {isSolved && <RichText text={task.explanation} as="p" className="practice-explanation" />}
    </article>
  )
}

export default function PracticeTab({ lesson, lessonState, onPracticeSolved, points = 15 }) {
  const tasks = lesson.practice || []
  const solvedMap = lessonState?.practice || {}

  if (!tasks.length) {
    return (
      <div className="learn-tab-empty">
        <h3>No practice for this lesson</h3>
        <p>Head to the Quiz tab to check your understanding, then continue.</p>
      </div>
    )
  }

  const solvedCount = tasks.filter((task) => solvedMap[task.id]?.solved).length

  return (
    <div className="practice-list">
      <div className="practice-summary">
        <span>{solvedCount} of {tasks.length} solved</span>
        <div className="practice-summary__bar"><span style={{ width: `${tasks.length ? (solvedCount / tasks.length) * 100 : 0}%` }} /></div>
      </div>
      {tasks.map((task, index) => (
        <PracticeCard
          key={task.id}
          task={task}
          index={index}
          total={tasks.length}
          solved={solvedMap[task.id]?.solved}
          points={points}
          onSolved={(activeTask, result) => onPracticeSolved(activeTask, result)}
        />
      ))}
    </div>
  )
}
