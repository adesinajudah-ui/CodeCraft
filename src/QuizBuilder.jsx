import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Eye, EyeOff, Play, ShieldCheck, Wand2 } from 'lucide-react'
import { supabase } from './lib/supabase'
import {
  buildSandboxDocument,
  parseQuizDefinition,
  SAMPLE_QUIZ,
  validateQuizForPublish,
} from './lib/quiz-definition'
import './quiz-builder.css'

const quizCategoryOptions = ['HTML', 'CSS', 'JavaScript', 'React', 'Python', 'General Programming']
const quizDifficultyOptions = ['Beginner', 'Intermediate', 'Advanced']
const iconOptions = ['CC', 'HTML', 'CSS', 'JS', 'PY', 'RE', '</>', '★']

const emptyBuilderForm = () => ({
  id: '',
  title: '',
  description: '',
  category: 'General Programming',
  difficulty: 'Beginner',
  time_limit_seconds: 900,
  xp_reward: 100,
  icon: 'CC',
  feedback_mode: 'end',
  randomize_options: false,
  position: 0,
  published: false,
  html: '',
  css: '',
  js: '',
})

// ----------------------------------------------------------------------------
// QuizSandboxPlayer — full student-experience simulator rendered inside a
// sandboxed iframe (allow-scripts only, opaque origin). Receives the parsed
// question data as JSON, never the parent app's state or secrets.
// ----------------------------------------------------------------------------

function sandboxPlayerScript({ questionsJson, randomized }) {
  return `
  var QUESTIONS = ${questionsJson};
  var RANDOMIZED = ${randomized ? 'true' : 'false'};
  var index = 0;
  var answers = {};
  var displayOrder = {};

  function shuffle(list) {
    var copy = list.slice();
    for (var i = copy.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var swap = copy[i]; copy[i] = copy[j]; copy[j] = swap;
    }
    return copy;
  }

  QUESTIONS.forEach(function (question) {
    var order = question.options.map(function (text, optionIndex) { return optionIndex });
    if (RANDOMIZED) order = shuffle(order);
    displayOrder[question.key] = order.map(function (optionIndex) { return { index: optionIndex, text: question.options[optionIndex] } });
  });

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function render() {
    var root = document.getElementById('player-root');
    root.innerHTML = '';
    var question = QUESTIONS[index];
    var total = QUESTIONS.length;

    var shell = el('div', 'sq-shell');
    var top = el('div', 'sq-top');
    var titleWrap = el('div');
    titleWrap.appendChild(el('span', 'sq-kicker', 'QUIZ PREVIEW'));
    titleWrap.appendChild(el('h1', 'sq-title', document.getElementById('sq-title').value || 'Untitled quiz'));
    top.appendChild(titleWrap);
    var answeredCount = Object.keys(answers).length;
    var status = el('div', 'sq-status', (index + 1) + ' / ' + total + (answeredCount ? ' · ' + answeredCount + ' answered' : ''));
    top.appendChild(status);
    shell.appendChild(top);

    var bar = el('div', 'sq-progress');
    var fill = el('span', 'sq-progress-fill');
    fill.style.width = Math.round(((index + 1) / total) * 100) + '%';
    bar.appendChild(fill);
    shell.appendChild(bar);

    var card = el('div', 'sq-card');
    card.appendChild(el('p', 'sq-qmeta', 'Question ' + (index + 1) + ' of ' + total));
    card.appendChild(el('h2', 'sq-question', question.text));

    var optionGrid = el('div', 'sq-options');
    var currentAnswer = answers[question.key];
    displayOrder[question.key].forEach(function (option, displayIndex) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'sq-option' + (currentAnswer === option.index ? ' is-selected' : '');
      button.setAttribute('aria-pressed', currentAnswer === option.index ? 'true' : 'false');
      var letter = el('span', 'sq-option-letter', String.fromCharCode(65 + displayIndex));
      button.appendChild(letter);
      button.appendChild(el('span', 'sq-option-text', option.text));
      button.addEventListener('click', function () {
        answers[question.key] = option.index;
        render();
      });
      optionGrid.appendChild(button);
    });
    card.appendChild(optionGrid);
    shell.appendChild(card);

    var nav = el('div', 'sq-nav');
    var prev = el('button', 'sq-button sq-button-ghost', 'Previous');
    prev.type = 'button';
    prev.disabled = index === 0;
    prev.addEventListener('click', function () { index -= 1; render(); });
    nav.appendChild(prev);

    var next;
    if (index === total - 1) {
      next = el('button', 'sq-button sq-button-primary', 'Submit Quiz');
      next.type = 'button';
      next.addEventListener('click', function () {
        var unanswered = QUESTIONS.filter(function (q) { return answers[q.key] === undefined }).length;
        renderResults(unanswered);
      });
    } else {
      next = el('button', 'sq-button sq-button-primary', 'Next');
      next.type = 'button';
      next.addEventListener('click', function () { index += 1; render(); });
    }
    nav.appendChild(next);
    shell.appendChild(nav);

    if (index === total - 1) {
      shell.appendChild(el('p', 'sq-final-hint', 'Final question — Next becomes Submit Quiz.'));
    }

    root.appendChild(shell);
  }

  function renderResults(unanswered) {
    var root = document.getElementById('player-root');
    root.innerHTML = '';
    var score = 0;
    QUESTIONS.forEach(function (question) {
      if (answers[question.key] === undefined) return;
      if (question.options[answers[question.key]] === question.correctAnswer) score += 1;
    });
    var total = QUESTIONS.length;
    var wrong = total - unanswered - score;
    var percentage = total ? Math.round((score / total) * 100) : 0;

    var card = el('div', 'sq-card sq-result');
    card.appendChild(el('span', 'sq-kicker', 'PREVIEW COMPLETE'));
    card.appendChild(el('h1', 'sq-title', 'Quiz Complete!'));
    card.appendChild(el('div', 'sq-score', score + ' / ' + total));
    var row = el('div', 'sq-score-row');
    row.appendChild(el('strong', null, percentage + '%'));
    row.appendChild(el('span', null, score + ' correct · ' + wrong + ' wrong · ' + unanswered + ' unanswered'));
    card.appendChild(row);
    card.appendChild(el('p', 'sq-note', 'Preview scores are simulated and never saved as real attempts.'));

    var actions = el('div', 'sq-actions');
    var again = el('button', 'sq-button sq-button-ghost', 'Restart Preview');
    again.type = 'button';
    again.addEventListener('click', function () { index = 0; answers = {}; render(); });
    actions.appendChild(again);
    var review = el('button', 'sq-button sq-button-primary', 'Review Answers');
    review.type = 'button';
    review.addEventListener('click', function () { renderReview(unanswered); });
    actions.appendChild(review);
    card.appendChild(actions);
    root.appendChild(card);
  }

  function renderReview(unanswered) {
    var root = document.getElementById('player-root');
    root.innerHTML = '';
    var wrap = el('div', 'sq-review');
    wrap.appendChild(el('span', 'sq-kicker', 'PREVIEW REVIEW'));
    wrap.appendChild(el('h1', 'sq-title', 'Answer Review'));
    QUESTIONS.forEach(function (question, questionIndex) {
      var selected = answers[question.key];
      var isAnswered = selected !== undefined;
      var isCorrect = isAnswered && question.options[selected] === question.correctAnswer;
      var item = el('article', 'sq-review-item' + (!isAnswered ? ' is-unanswered' : isCorrect ? ' is-correct' : ' is-wrong'));
      item.appendChild(el('h3', null, 'Question ' + (questionIndex + 1) + (isCorrect ? ' — Correct' : !isAnswered ? ' — Unanswered' : ' — Incorrect')));
      item.appendChild(el('p', 'sq-review-q', question.text));
      item.appendChild(el('p', null, isAnswered ? 'Your answer: ' + question.options[selected] : 'Your answer: none selected'));
      item.appendChild(el('p', null, 'Correct answer: ' + question.correctAnswer));
      if (question.explanation) item.appendChild(el('p', 'sq-review-expl', 'Explanation: ' + question.explanation));
      wrap.appendChild(item);
    });
    var back = el('button', 'sq-button sq-button-primary', 'Back to Results');
    back.type = 'button';
    back.addEventListener('click', function () { renderResults(unanswered); });
    wrap.appendChild(back);
    root.appendChild(wrap);
  }

  render();
  `
}

function QuizSandboxPlayer({ questions, randomized, title }) {
  const [frameKey, setFrameKey] = useState(0)
  const questionsJson = useMemo(() => JSON.stringify(
    (questions || []).map((question) => ({
      key: question.key,
      text: question.text,
      options: question.options,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
    })),
  ), [questions])
  const playerScript = useMemo(
    () => sandboxPlayerScript({ questionsJson, randomized }),
    [questionsJson, randomized],
  )

  const playerDocument = useMemo(() => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root { color-scheme: light; }
  body { margin: 0; padding: 18px; font-family: 'Segoe UI', system-ui, sans-serif; background: #f5f8fc; color: #17334e; }
  .sq-shell, .sq-card, .sq-review { max-width: 640px; margin: 0 auto; }
  .sq-top { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; margin-bottom: 14px; }
  .sq-kicker { display: block; font-size: 10px; font-weight: 800; letter-spacing: .12em; color: #1671c5; text-transform: uppercase; margin-bottom: 4px; }
  .sq-title { margin: 0; font-size: 22px; color: #142d49; }
  .sq-status { font-size: 12px; font-weight: 700; color: #657b90; white-space: nowrap; }
  .sq-progress { height: 8px; border-radius: 999px; background: #e2ebf4; overflow: hidden; margin-bottom: 16px; }
  .sq-progress-fill { display: block; height: 100%; border-radius: 999px; background: #1671c5; transition: width .25s ease; }
  .sq-card { background: #fff; border: 1px solid #dce6ef; border-radius: 16px; padding: 22px; box-shadow: 0 10px 30px rgba(9, 30, 55, .06); }
  .sq-qmeta { margin: 0 0 6px; font-size: 11px; font-weight: 800; letter-spacing: .1em; color: #1671c5; text-transform: uppercase; }
  .sq-question { margin: 0 0 18px; font-size: 19px; line-height: 1.4; color: #17344f; }
  .sq-options { display: grid; gap: 10px; }
  .sq-option { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 14px; border: 1px solid #dce6ef; border-radius: 12px; background: #fbfdff; text-align: left; font-size: 14px; color: #24425f; cursor: pointer; transition: border-color .15s ease, background .15s ease; }
  .sq-option:hover { border-color: #9cc2e2; background: #f2f8ff; }
  .sq-option.is-selected { border-color: #1671c5; background: #eaf4fd; box-shadow: 0 0 0 2px rgba(22, 113, 197, .18); }
  .sq-option-letter { display: grid; place-items: center; flex: 0 0 28px; width: 28px; height: 28px; border-radius: 8px; background: #eef4fa; color: #2b6cb0; font-size: 12px; font-weight: 800; }
  .sq-option.is-selected .sq-option-letter { background: #1671c5; color: #fff; }
  .sq-nav { display: flex; justify-content: space-between; gap: 10px; margin-top: 18px; }
  .sq-button { padding: 10px 18px; border-radius: 10px; border: 1px solid transparent; font-size: 13px; font-weight: 700; cursor: pointer; }
  .sq-button-primary { background: #1671c5; color: #fff; }
  .sq-button-primary:hover { background: #105a94; }
  .sq-button-ghost { background: #fff; border-color: #c9d8e6; color: #2c4a68; }
  .sq-button-ghost:disabled { opacity: .45; cursor: not-allowed; }
  .sq-final-hint { text-align: center; color: #8ba3b8; font-size: 11px; margin: 10px 0 0; }
  .sq-result { text-align: center; }
  .sq-score { font-size: 40px; font-weight: 800; color: #142d49; margin: 12px 0 4px; }
  .sq-score-row { display: flex; flex-direction: column; gap: 2px; margin-bottom: 10px; }
  .sq-note { color: #7d8d9d; font-size: 11px; }
  .sq-actions { display: flex; justify-content: center; gap: 10px; margin-top: 16px; flex-wrap: wrap; }
  .sq-review { display: grid; gap: 12px; }
  .sq-review-item { padding: 14px 16px; border: 1px solid #dce6ef; border-left-width: 4px; border-radius: 10px; background: #fff; }
  .sq-review-item.is-correct { border-left-color: #32845e; }
  .sq-review-item.is-wrong { border-left-color: #c2504a; }
  .sq-review-item.is-unanswered { border-left-color: #b97925; }
  .sq-review-item h3 { margin: 0 0 6px; font-size: 14px; }
  .sq-review-item p { margin: 3px 0; font-size: 13px; color: #50657a; }
  .sq-review-expl { background: #f2f8fd; border-radius: 8px; padding: 8px 10px; }
</style>
</head>
<body>
<input id="sq-title" type="hidden" value="${String(title || '').replace(/"/g, '&quot;')}">
<div id="player-root"></div>
<script>${playerScript}</script>
</body>
</html>`, [playerScript, title])

  return (
    <div className="quiz-builder-player">
      <div className="quiz-builder-player-bar">
        <span className="quiz-builder-player-label">Student view simulator</span>
        <button type="button" onClick={() => setFrameKey((key) => key + 1)}>
          <Play size={13} aria-hidden="true" /> Restart
        </button>
      </div>
      <iframe
        key={frameKey}
        title="Student quiz preview"
        srcDoc={playerDocument}
        sandbox="allow-scripts"
        className="quiz-builder-player-frame"
      />
    </div>
  )
}

// ----------------------------------------------------------------------------
// QuizBuilder — the admin quiz builder screen
// ----------------------------------------------------------------------------

export default function QuizBuilder({ quiz, onClose, onSaved }) {
  const [form, setForm] = useState(emptyBuilderForm)
  const [loadError, setLoadError] = useState('')
  const [errors, setErrors] = useState([])
  const [validation, setValidation] = useState(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState('code') // 'code' | 'experience'
  const [showPreview, setShowPreview] = useState(true)
  const [previewDoc, setPreviewDoc] = useState('')
  const [dirty, setDirty] = useState(false)
  const [autosavedAt, setAutosavedAt] = useState('')
  const autosaveTimerRef = useRef(null)

  // Load an existing quiz (metadata + builder source)
  useEffect(() => {
    let cancelled = false
    if (!quiz?.id) {
      setForm(emptyBuilderForm())
      setLoadError('')
      return undefined
    }
    setLoadError('')
    supabase.from('quizzes').select('*').eq('id', quiz.id).maybeSingle().then(({ data, error }) => {
      if (cancelled) return
      if (error || !data) {
        setLoadError(error?.message || 'The quiz could not be loaded.')
        return
      }
      setForm({
        ...emptyBuilderForm(),
        id: data.id,
        title: data.title || '',
        description: data.description || '',
        category: data.category || 'General Programming',
        difficulty: data.difficulty || 'Beginner',
        time_limit_seconds: Number(data.time_limit_seconds || 300),
        xp_reward: Number(data.xp_reward || 100),
        icon: data.icon || 'CC',
        feedback_mode: data.feedback_mode || 'end',
        randomize_options: Boolean(data.randomize_options),
        position: Number(data.position || 0),
        published: Boolean(data.published),
        html: data.html_source || '',
        css: data.css_source || '',
        js: data.js_source || '',
      })
      setDirty(false)
    })
    return () => { cancelled = true }
  }, [quiz?.id])

  const parsed = useMemo(
    () => parseQuizDefinition({ js: form.js, html: form.html }),
    [form.js, form.html],
  )

  const update = (key) => (event) => {
    const value = event?.target ? event.target.value : event
    setForm((current) => ({ ...current, [key]: value }))
    setDirty(true)
  }

  const updateNumber = (key) => (event) => {
    const value = Number(event.target.value)
    setForm((current) => ({ ...current, [key]: Number.isFinite(value) ? value : 0 }))
    setDirty(true)
  }

  const buildPayload = useCallback(({ publish }) => ({
    id: form.id || undefined,
    title: form.title.trim(),
    description: form.description.trim(),
    category: form.category,
    difficulty: form.difficulty,
    time_limit_seconds: Math.max(60, Number(form.time_limit_seconds) || 300),
    xp_reward: Math.max(0, Number(form.xp_reward) || 0),
    icon: form.icon,
    feedback_mode: form.feedback_mode,
    randomize_options: Boolean(form.randomize_options),
    position: Number(form.position) || 0,
    published: publish === true ? true : Boolean(form.published),
    html_source: form.html,
    css_source: form.css,
    js_source: form.js,
    // Questions are only synced when the definition parses; a broken draft
    // never wipes the stored questions.
    ...(parsed.questions.length
      ? {
          questions: parsed.questions.map((question) => ({
            key: question.key,
            text: question.text,
            options: question.options,
            correct_answer: question.correctAnswer,
            explanation: question.explanation,
          })),
        }
      : {}),
  }), [form, parsed])

  const runValidation = useCallback(() => {
    const result = validateQuizForPublish({
      title: form.title,
      timeLimitSeconds: form.time_limit_seconds,
      xpReward: form.xp_reward,
      questions: parsed.questions,
    })
    if (parsed.error) result.errors.unshift(parsed.error)
    else if (!parsed.questions.length) {
      result.errors.unshift('No questions could be parsed. Define a `const questions = [...]` array in the JavaScript editor (or <codecraft-quiz> markup in the HTML editor).')
    }
    setValidation(result)
    return result
  }, [form.title, form.time_limit_seconds, form.xp_reward, parsed])

  const runPreview = useCallback(() => {
    // Re-rendering the iframe with a new srcDoc reloads the sandbox; an
    // unchanged document keeps its state (no forced remount needed).
    setPreviewDoc(buildSandboxDocument({ html: form.html, css: form.css, js: form.js }))
  }, [form.html, form.css, form.js])

  const saveDraft = useCallback(async ({ silent = false } = {}) => {
    if (busy) return
    setBusy(true)
    if (!silent) { setStatus(''); setErrors([]) }

    const payload = buildPayload({ publish: false })
    if (!payload.title) {
      setBusy(false)
      if (!silent) setErrors(['A quiz title is required before saving.'])
      return
    }

    const { data, error } = await supabase.rpc('save_codecraft_quiz_from_builder', { p_quiz: payload })
    if (error) {
      setBusy(false)
      setStatus('')
      setErrors([error.message || 'The draft could not be saved.'])
      return
    }

    setForm((current) => ({ ...current, id: data }))
    setDirty(false)
    setAutosavedAt(new Date().toLocaleTimeString())
    setBusy(false)
    if (!silent) setStatus('Draft saved.')
    if (!silent) onSaved?.() // autosave stays quiet: no admin-wide reload per keystroke burst
  }, [busy, buildPayload, onSaved])

  const publishQuiz = useCallback(async () => {
    setStatus('')
    setErrors([])
    const result = runValidation()
    if (!result.ok) return

    setBusy(true)
    const payload = buildPayload({ publish: true })
    const { data, error } = await supabase.rpc('save_codecraft_quiz_from_builder', { p_quiz: payload })
    if (error) {
      setBusy(false)
      setErrors([error.message || 'The quiz could not be published.'])
      return
    }
    setForm((current) => ({ ...current, id: data, published: true }))
    setDirty(false)
    setBusy(false)
    setStatus('Quiz published! Students can now see it on the Quizzes page.')
    onSaved?.()
  }, [buildPayload, onSaved, runValidation])

  const unpublishQuiz = useCallback(async () => {
    if (!form.id) return
    setBusy(true)
    const { error } = await supabase.from('quizzes').update({ published: false }).eq('id', form.id)
    setBusy(false)
    if (error) {
      setErrors([error.message || 'The quiz could not be unpublished.'])
      return
    }
    setForm((current) => ({ ...current, published: false }))
    setStatus('Quiz unpublished — students can no longer see it.')
    onSaved?.()
  }, [form.id, onSaved])

  const loadSample = () => {
    setForm((current) => ({
      ...current,
      title: current.title || SAMPLE_QUIZ.title,
      description: current.description || SAMPLE_QUIZ.description,
      category: current.category === 'General Programming' ? SAMPLE_QUIZ.category : current.category,
      difficulty: current.difficulty,
      time_limit_seconds: SAMPLE_QUIZ.timeLimitMinutes * 60,
      xp_reward: SAMPLE_QUIZ.xpReward,
      icon: SAMPLE_QUIZ.icon,
      html: SAMPLE_QUIZ.html,
      css: SAMPLE_QUIZ.css,
      js: SAMPLE_QUIZ.js,
    }))
    setDirty(true)
    setStatus('Sample quiz loaded into the editors — preview it, then save your own copy.')
  }

  const questionCount = parsed.questions.length
  const draftStatus = form.published ? 'Published' : 'Draft'

  // Debounced live preview refresh (never reloads the admin page)
  useEffect(() => {
    if (!showPreview || mode !== 'code') return undefined
    const timer = window.setTimeout(() => runPreview(), 600)
    return () => window.clearTimeout(timer)
  }, [form.html, form.css, form.js, showPreview, mode, runPreview])

  // Debounced autosave — only for already-saved drafts (new quizzes save once
  // explicitly, so double-submits can never create duplicate records).
  useEffect(() => {
    if (!dirty || !form.id || busy) return undefined
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = window.setTimeout(() => { void saveDraft({ silent: true }) }, 900)
    return () => window.clearTimeout(autosaveTimerRef.current)
  }, [dirty, form.id, busy, saveDraft])

  if (loadError) {
    return (
      <div className="quiz-builder">
        <div className="quiz-builder-error-panel" role="alert">
          <h2>Quiz could not be loaded</h2>
          <p>{loadError}</p>
          <button type="button" className="quiz-builder-button" onClick={onClose}>Back to quiz list</button>
        </div>
      </div>
    )
  }

  return (
    <div className="quiz-builder">
      <header className="quiz-builder-header">
        <div>
          <span className="quiz-builder-eyebrow">QUIZ BUILDER</span>
          <h1>{form.id ? 'Edit Quiz' : 'Create Quiz'}</h1>
          <p>
            Write the quiz as HTML + CSS + JavaScript, watch the live preview, then publish.
            Students always play the structured data stored in Supabase — never your source code.
          </p>
        </div>
        <div className="quiz-builder-header-actions">
          <span className={`quiz-builder-status-chip ${form.published ? 'is-published' : 'is-draft'}`}>{draftStatus}</span>
          <button type="button" className="quiz-builder-button quiz-builder-button-ghost" onClick={onClose}>Close builder</button>
        </div>
      </header>

      {status && <p className="quiz-builder-status" role="status">{status}</p>}
      {errors.length > 0 && (
        <div className="quiz-builder-errors" role="alert">
          <strong>Quiz cannot be saved or published:</strong>
          <ul>{errors.map((message) => <li key={message}>{message}</li>)}</ul>
        </div>
      )}

      <section className="quiz-builder-info" aria-label="Quiz information">
        <div className="quiz-builder-info-grid">
          <label className="quiz-builder-field quiz-builder-field-wide">
            <span>Quiz title</span>
            <input value={form.title} onChange={update('title')} placeholder="HTML Fundamentals" />
          </label>
          <label className="quiz-builder-field">
            <span>Category</span>
            <select value={form.category} onChange={update('category')}>
              {quizCategoryOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label className="quiz-builder-field">
            <span>Difficulty</span>
            <select value={form.difficulty} onChange={update('difficulty')}>
              {quizDifficultyOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label className="quiz-builder-field">
            <span>Time limit (minutes)</span>
            <input
              type="number"
              min="1"
              value={Math.max(1, Math.round(Number(form.time_limit_seconds) / 60))}
              onChange={(event) => {
                const minutes = Number(event.target.value)
                setForm((current) => ({ ...current, time_limit_seconds: Math.max(60, Math.round((Number.isFinite(minutes) ? minutes : 5) * 60)) }))
                setDirty(true)
              }}
            />
          </label>
          <label className="quiz-builder-field">
            <span>XP reward</span>
            <input type="number" min="0" value={form.xp_reward} onChange={updateNumber('xp_reward')} />
          </label>
          <label className="quiz-builder-field">
            <span>Icon</span>
            <select value={form.icon} onChange={update('icon')}>
              {iconOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label className="quiz-builder-field">
            <span>Answer feedback</span>
            <select value={form.feedback_mode} onChange={update('feedback_mode')}>
              <option value="end">At the end (default)</option>
              <option value="instant">Instant per question</option>
            </select>
          </label>
          <label className="quiz-builder-field">
            <span>List order</span>
            <input type="number" min="0" value={form.position} onChange={updateNumber('position')} />
          </label>
          <label className="quiz-builder-field quiz-builder-field-check">
            <span>Randomize option order per attempt</span>
            <input
              type="checkbox"
              checked={form.randomize_options}
              onChange={(event) => {
                setForm((current) => ({ ...current, randomize_options: event.target.checked }))
                setDirty(true)
              }}
            />
          </label>
          <label className="quiz-builder-field quiz-builder-field-wide">
            <span>Description</span>
            <textarea rows={2} value={form.description} onChange={update('description')} placeholder="Test your knowledge of HTML fundamentals." />
          </label>
        </div>
        <div className="quiz-builder-info-meta">
          <span>Questions parsed: <strong>{questionCount}</strong></span>
          <span>Status: <strong>{draftStatus}</strong></span>
          <span>{form.id ? (autosavedAt ? `Autosaved at ${autosavedAt}` : 'Autosave ready') : 'Save once to enable autosave'}</span>
          {busy && <span aria-live="polite">Working…</span>}
        </div>
      </section>

      <div className="quiz-builder-mode-row" role="tablist" aria-label="Builder modes">
        <button type="button" role="tab" aria-selected={mode === 'code'} className={mode === 'code' ? 'is-active' : ''} onClick={() => setMode('code')}>Code &amp; Preview</button>
        <button type="button" role="tab" aria-selected={mode === 'experience'} className={mode === 'experience' ? 'is-active' : ''} onClick={() => setMode('experience')}>
          <Eye size={14} aria-hidden="true" /> Preview Quiz (student mode)
        </button>
      </div>

      {mode === 'code' && (
        <div className={`quiz-builder-workspace ${showPreview ? 'with-preview' : ''}`}>
          <section className="quiz-builder-editors" aria-label="Quiz source editors">
            <div className="quiz-builder-editor">
              <div className="quiz-builder-editor-head">
                <span className="quiz-builder-lang quiz-builder-lang-html">HTML</span>
                <small>Quiz structure — supports &lt;codecraft-quiz&gt; markup</small>
              </div>
              <textarea
                value={form.html}
                onChange={update('html')}
                spellCheck={false}
                aria-label="HTML editor"
                placeholder='<div class="quiz-container">…</div>'
              />
            </div>
            <div className="quiz-builder-editor">
              <div className="quiz-builder-editor-head">
                <span className="quiz-builder-lang quiz-builder-lang-css">CSS</span>
                <small>Quiz styling</small>
              </div>
              <textarea
                value={form.css}
                onChange={update('css')}
                spellCheck={false}
                aria-label="CSS editor"
                placeholder=".quiz-container { … }"
              />
            </div>
            <div className="quiz-builder-editor">
              <div className="quiz-builder-editor-head">
                <span className="quiz-builder-lang quiz-builder-lang-js">JavaScript</span>
                <small>Define the questions array — the structured source of truth</small>
              </div>
              <textarea
                value={form.js}
                onChange={update('js')}
                spellCheck={false}
                aria-label="JavaScript editor"
                placeholder={'const questions = [\n  { id: "q1", question: "…", options: [{ id: "a", text: "…" }], correctAnswer: "a", explanation: "…" }\n];'}
              />
            </div>
            <div className="quiz-builder-toolbar">
              <button type="button" className="quiz-builder-button" onClick={loadSample}><Wand2 size={14} aria-hidden="true" /> Load sample quiz</button>
              <button type="button" className="quiz-builder-button" onClick={runPreview}><Play size={14} aria-hidden="true" /> Run</button>
              <button type="button" className="quiz-builder-button" onClick={runValidation}><ShieldCheck size={14} aria-hidden="true" /> Validate</button>
              <button type="button" className="quiz-builder-button" onClick={() => setShowPreview((value) => !value)}>
                {showPreview ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
                {showPreview ? 'Hide preview' : 'Show preview'}
              </button>
            </div>
          </section>

          {showPreview && (
            <aside className="quiz-builder-preview" aria-label="Live preview">
              <div className="quiz-builder-preview-head">
                <span className="quiz-builder-eyebrow">LIVE PREVIEW</span>
                <small>Auto-updates as you type · sandboxed</small>
              </div>
              <iframe
                title="Quiz live preview"
                srcDoc={previewDoc}
                sandbox="allow-scripts"
                className="quiz-builder-preview-frame"
              />
              <p className="quiz-builder-preview-note">
                Rendered inside an isolated sandbox — this code cannot access CodeCraft, your session,
                or any secrets. Only the parsed question data is ever stored.
              </p>
            </aside>
          )}
        </div>
      )}

      {mode === 'code' && validation && (
        <section className={`quiz-builder-validation ${validation.ok ? 'is-ok' : 'is-failing'}`} aria-live="polite">
          <h2>{validation.ok ? '✓ Validation passed' : `✕ ${validation.errors.length} problem${validation.errors.length === 1 ? '' : 's'} found`}</h2>
          {validation.ok
            ? <p>The quiz is complete and ready to publish — {validation.questionCount} question{validation.questionCount === 1 ? '' : 's'} parsed.</p>
            : <ul>{validation.errors.map((message) => <li key={message}>{message}</li>)}</ul>}
        </section>
      )}

      {mode === 'experience' && (
        <section className="quiz-builder-experience" aria-label="Student experience preview">
          {questionCount ? (
            <QuizSandboxPlayer questions={parsed.questions} randomized={form.randomize_options} title={form.title} />
          ) : (
            <p className="quiz-builder-empty-note">Parse at least one question (via the JavaScript editor) to try the student experience.</p>
          )}
          <p className="quiz-builder-preview-note">
            This is exactly what a student sees: one question at a time, Previous/Next, Submit Quiz on the
            final question, answer review. Preview attempts are simulated — no XP, no saved attempts.
          </p>
        </section>
      )}

      <footer className="quiz-builder-footer">
        <div className="quiz-builder-footer-note">
          {form.id
            ? 'Changes update this existing quiz — no duplicate records.'
            : 'Saving creates the quiz record; publishing validates the full definition.'}
        </div>
        <div className="quiz-builder-footer-actions">
          {form.published && (
            <button type="button" className="quiz-builder-button quiz-builder-button-ghost" onClick={unpublishQuiz} disabled={busy}>Unpublish</button>
          )}
          <button type="button" className="quiz-builder-button" onClick={() => void saveDraft()} disabled={busy}>Save Draft</button>
          <button type="button" className="quiz-builder-button quiz-builder-button-primary" onClick={() => void publishQuiz()} disabled={busy}>Publish Quiz</button>
        </div>
      </footer>
    </div>
  )
}
