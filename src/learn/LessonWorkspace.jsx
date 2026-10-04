import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { UserButton } from '@clerk/clerk-react'
import { Sidebar } from '../App.jsx'
import CourseSearch from '../CourseSearch.jsx'
import AdminHeaderAction from '../AdminHeaderAction.jsx'
import { NotificationBell } from '../NotificationSystem.jsx'
import CodeBlock from './CodeBlock.jsx'
import { copyText } from './clipboard.js'
import CodeEditor from './CodeEditor.jsx'
import CodePreview from './CodePreview.jsx'
import PracticeTab from './PracticeTab.jsx'
import QuizTab from './QuizTab.jsx'
import { RichText } from './RichText.jsx'
import { runChecks } from './task-validator.js'
import {
  BADGES,
  completeLesson,
  computeCourseProgress,
  getLessonState,
  isLessonUnlocked,
  openLesson,
  POINTS,
  recordPractice,
  recordQuiz,
  requestCertificate,
  saveLessonCode,
  setLessonFlag,
} from './progress.js'
import { useIsDesktopWorkspace, useLearning } from './useLearning.js'
import { getModuleLessons, getPreviousLesson, getNextLesson, estimateLessonMinutes, formatMinutes } from '../courses/index.js'
import './learn.css'

const go = (path) => {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

const TABS = [
  { id: 'learn', label: 'Learn', icon: '📘' },
  { id: 'code', label: 'Code', icon: '💻' },
  { id: 'practice', label: 'Practice', icon: '✏️' },
  { id: 'quiz', label: 'Quiz', icon: '📝' },
]

// --- curriculum -----------------------------------------------------------

function CurriculumList({ course, state, currentLessonId, onPick, expandedModules, onToggleModule }) {
  const progress = computeCourseProgress(course, state)

  return (
    <div className="curriculum">
      <div className="curriculum__progress">
        <div className="curriculum__progress-row">
          <strong>{progress.percentage}% complete</strong>
          <span>{progress.completedLessons}/{progress.totalLessons} lessons</span>
        </div>
        <div className="curriculum__bar"><span style={{ width: `${progress.percentage}%` }} /></div>
      </div>

      <nav className="curriculum__modules" aria-label={`${course.title} curriculum`}>
        {course.modules.map((module, moduleIndex) => {
          const moduleLessons = getModuleLessons(course, module)
          const moduleDone = moduleLessons.filter((lesson) => progress.completedIds.has(lesson.id)).length
          const expanded = expandedModules.includes(module.id)
          return (
            <section className={`curriculum-module ${expanded ? 'is-open' : ''}`} key={module.id}>
              <button
                type="button"
                className="curriculum-module__head"
                aria-expanded={expanded}
                onClick={() => onToggleModule(module.id)}
              >
                <span className="curriculum-module__number">M{moduleIndex + 1}</span>
                <span className="curriculum-module__title">
                  <strong>{module.title}</strong>
                  <small>{moduleDone}/{moduleLessons.length} · {formatMinutes(moduleLessons.reduce((sum, lesson) => sum + estimateLessonMinutes(lesson), 0))}</small>
                </span>
                <span className="curriculum-module__chevron" aria-hidden="true">{expanded ? '▾' : '▸'}</span>
              </button>

              {expanded && (
                <ol className="curriculum-module__lessons">
                  {moduleLessons.map((lesson) => {
                    const index = course.lessons.findIndex((entry) => entry.id === lesson.id)
                    const lessonState = getLessonState(state, course.id, lesson.id)
                    const completed = Boolean(lessonState?.completedAt)
                    const current = lesson.id === currentLessonId
                    const unlocked = isLessonUnlocked(course, lesson.id, state)
                    return (
                      <li key={lesson.id}>
                        <button
                          type="button"
                          className={`curriculum-lesson ${current ? 'is-current' : ''} ${completed ? 'is-done' : ''} ${!unlocked ? 'is-locked' : ''}`}
                          aria-current={current ? 'step' : undefined}
                          onClick={() => onPick(lesson, unlocked)}
                        >
                          <span className="curriculum-lesson__index" aria-hidden="true">
                            {completed ? '✓' : !unlocked ? '🔒' : index + 1}
                          </span>
                          <span className="curriculum-lesson__copy">
                            <strong>{lesson.title}</strong>
                            <small>{estimateLessonMinutes(lesson)} min{!unlocked ? ' · locked' : ''}</small>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ol>
              )}
            </section>
          )
        })}
      </nav>
    </div>
  )
}

// --- learn tab ------------------------------------------------------------

function SectionRenderer({ section, keyPrefix }) {
  switch (section.type) {
    case 'paragraph':
      return <RichText text={section.text} as="p" className="learn-copy" />
    case 'list':
      return section.ordered
        ? <ol className="learn-list learn-list--ordered" key={keyPrefix}>{section.items.map((item, index) => <li key={index}><RichText text={item} /></li>)}</ol>
        : <ul className="learn-list" key={keyPrefix}>{section.items.map((item, index) => <li key={index}><RichText text={item} /></li>)}</ul>
    case 'code':
      return <CodeBlock key={keyPrefix} code={section.snippet} caption={section.caption} />
    case 'callout':
      return (
        <aside className={`learn-callout learn-callout--${section.tone || 'note'}`} key={keyPrefix}>
          <strong>{section.title}</strong>
          <RichText text={section.text} as="p" />
        </aside>
      )
    case 'table':
      return (
        <div className="learn-table-wrap" key={keyPrefix}>
          <table className="learn-table">
            <thead>
              <tr>{section.headers.map((header) => <th key={header}><RichText text={header} /></th>)}</tr>
            </thead>
            <tbody>
              {section.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}><RichText text={cell} /></td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    default:
      return null
  }
}

function Checkpoint({ question }) {
  const [selected, setSelected] = useState(null)
  const [checked, setChecked] = useState(false)
  const correct = selected === question.answer

  return (
    <section className="learn-checkpoint" aria-label="Checkpoint question">
      <span className="section-kicker">QUICK CHECKPOINT</span>
      <RichText text={question.q} as="h4" />
      <div className="quiz-options" role="radiogroup" aria-label={question.q}>
        {question.options.map((option, optionIndex) => (
          <button
            key={optionIndex}
            type="button"
            role="radio"
            aria-checked={selected === optionIndex}
            disabled={checked}
            className={`quiz-option ${selected === optionIndex ? 'is-selected' : ''} ${checked && optionIndex === question.answer ? 'is-correct' : ''} ${checked && selected === optionIndex && optionIndex !== question.answer ? 'is-wrong' : ''}`}
            onClick={() => { setSelected(optionIndex); setChecked(false) }}
          >
            <span className="quiz-option__key">{String.fromCharCode(65 + optionIndex)}</span>
            <RichText text={option} as="span" />
          </button>
        ))}
      </div>
      {!checked ? (
        <button type="button" className="learn-btn learn-btn--primary" disabled={selected === null} onClick={() => setChecked(true)}>
          Check answer
        </button>
      ) : (
        <div className={`quiz-feedback ${correct ? 'is-correct' : 'is-wrong'}`} role="status">
          <strong>{correct ? 'Correct!' : 'Not quite.'}</strong>
          <RichText text={question.explanation} as="p" />
          {!correct && <button type="button" className="learn-btn" onClick={() => { setSelected(null); setChecked(false) }}>Try again</button>}
        </div>
      )}
    </section>
  )
}

function LearnTab({ lesson, onContinue }) {
  return (
    <div className="learn-tab">
      <div className="learn-objectives">
        <span className="section-kicker">IN THIS LESSON</span>
        <ul>
          {lesson.objectives.map((objective, index) => <li key={index}><RichText text={objective} /></li>)}
        </ul>
      </div>

      {lesson.sections.map((section, index) => <SectionRenderer section={section} keyPrefix={`s-${index}`} key={index} />)}

      <section className="learn-takeaways">
        <span className="section-kicker">KEY TAKEAWAYS</span>
        <ul>
          {lesson.takeaways.map((takeaway, index) => <li key={index}><RichText text={takeaway} /></li>)}
        </ul>
      </section>

      {lesson.quiz?.[0] && <Checkpoint question={lesson.quiz[0]} />}

      <button type="button" className="learn-btn learn-btn--primary learn-continue" onClick={onContinue}>
        Try the code →
      </button>
    </div>
  )
}

// --- lab (editor + preview) ----------------------------------------------

function LabPanel({ lesson, code, setCode, runCode, runId, checkResults, onRun, onReset, onCopy, copied }) {
  return (
    <div className="learn-lab__inner">
      <div className="learn-lab__brief">
        <span className="section-kicker">YOUR TASK</span>
        <RichText text={lesson.task.brief} as="p" />
      </div>

      <CodeEditor
        value={code}
        onChange={setCode}
        onRun={onRun}
        onReset={onReset}
        onCopy={onCopy}
        copied={copied}
        label="index.html"
      />

      <div className="learn-lab__split">
        <CodePreview code={runCode} runId={runId} />
      </div>

      <section className="learn-checks" aria-label="Task requirements">
        <header>
          <span className="section-kicker">REQUIREMENTS</span>
          {checkResults.length > 0 && (
            <span className={checkResults.every((result) => result.passed) ? 'is-pass' : 'is-partial'}>
              {checkResults.filter((result) => result.passed).length}/{checkResults.length} met
            </span>
          )}
        </header>
        {checkResults.length === 0 ? (
          <p>Press <strong>Run</strong> and every requirement is checked against your code.</p>
        ) : (
          <ul>
            {checkResults.map((result, index) => (
              <li key={index} className={result.passed ? 'is-pass' : 'is-fail'}>
                <span aria-hidden="true">{result.passed ? '✓' : '✕'}</span>
                <span>{result.passed ? 'Done' : result.message || 'Keep going'}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

// --- celebration ----------------------------------------------------------

function Celebration({ payload, course, onClose, onNext, hasNext }) {
  const [certificate, setCertificate] = useState(null)
  const [requesting, setRequesting] = useState(false)

  const handleCertificate = async () => {
    setRequesting(true)
    const result = await requestCertificate(payload.userId, course)
    setCertificate(result)
    setRequesting(false)
  }

  return (
    <div className="learn-celebrate" role="dialog" aria-modal="true" aria-label="Lesson complete">
      <div className="learn-celebrate__card">
        <span className="learn-celebrate__emoji" aria-hidden="true">{payload.courseCompleted ? '🏆' : '🎉'}</span>
        <h2>{payload.courseCompleted ? 'Course complete!' : 'Lesson complete'}</h2>
        <p>
          {payload.courseCompleted
            ? `You finished every lesson in ${course.title}.`
            : 'Nice work — your progress is saved and your next lesson is unlocked.'}
        </p>

        {payload.pointsAdded > 0 && <div className="learn-celebrate__points">+{payload.pointsAdded} points</div>}

        {payload.badges?.length > 0 && (
          <ul className="learn-celebrate__badges">
            {payload.badges.map((badge) => (
              <li key={badge.id}><span aria-hidden="true">{badge.icon}</span> {badge.title}</li>
            ))}
          </ul>
        )}

        {payload.courseCompleted && (
          <div className="learn-celebrate__certificate">
            {certificate === null && (
              <button type="button" className="learn-btn learn-btn--primary" disabled={requesting} onClick={handleCertificate}>
                {requesting ? 'Issuing…' : 'Issue my certificate'}
              </button>
            )}
            {certificate?.ok && <p className="is-pass">✓ Certificate issued — find it in your Certificates page.</p>}
            {certificate && !certificate.ok && (
              <p className="is-note">
                Your completion is recorded. The certificate will be issued to your Certificates page once CodeCraft verifies it.
              </p>
            )}
          </div>
        )}

        <div className="learn-celebrate__actions">
          {hasNext && <button type="button" className="learn-btn learn-btn--primary" onClick={onNext}>Continue to next lesson →</button>}
          <button type="button" className="learn-btn" onClick={onClose}>Stay here</button>
        </div>
      </div>
    </div>
  )
}

// --- workspace ------------------------------------------------------------

export default function LessonWorkspace({ course, lessonId, active, setActive }) {
  const { userId, state } = useLearning()
  const isDesktop = useIsDesktopWorkspace()

  const lesson = course.lessons.find((entry) => entry.id === lessonId) || course.lessons[0]
  const module = course.modules.find((entry) => entry.lessonIds.includes(lesson.id))
  const lessonIndex = course.lessons.findIndex((entry) => entry.id === lesson.id)
  const lessonState = getLessonState(state, course.id, lesson.id)

  const [tab, setTab] = useState('learn')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [curriculumCollapsed, setCurriculumCollapsed] = useState(false)
  const [expandedModules, setExpandedModules] = useState(() => [module?.id])
  const [code, setCode] = useState(lesson.task?.starter || '')
  const [runCode, setRunCode] = useState('')
  const [runId, setRunId] = useState(0)
  const [checkResults, setCheckResults] = useState([])
  const [copied, setCopied] = useState(false)
  const [celebration, setCelebration] = useState(null)
  const [lockedTarget, setLockedTarget] = useState(null)
  const saveTimer = useRef(null)
  const topRef = useRef(null)

  const requiredScore = lesson.id === course.completion?.assessmentLessonId
    ? (course.completion.assessmentScore || 70)
    : (course.completion?.requiredQuizScore || 60)

  const nextLesson = getNextLesson(course, lesson.id)
  const previousLesson = getPreviousLesson(course, lesson.id)
  const nextUnlocked = nextLesson ? isLessonUnlocked(course, nextLesson.id, state) : true

  // open the lesson: records "last active lesson" and enrolment
  useEffect(() => {
    openLesson(course, lesson.id, [course])
    setTab('learn')
    setCode(getLessonState(state, course.id, lesson.id)?.code || lesson.task?.starter || '')
    setRunCode('')
    setRunId(0)
    setCheckResults([])
    setLockedTarget(null)
    setCelebration(null)
    setExpandedModules((current) => (module?.id && !current.includes(module.id) ? [...current, module.id] : current))
    topRef.current?.scrollIntoView({ block: 'start' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id, course.id])

  // mark the explanation as read whenever the Learn tab is shown
  useEffect(() => {
    if (tab === 'learn') setLessonFlag(course, lesson.id, 'learnViewed', true, [course])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, lesson.id])

  // persist draft code (debounced)
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveLessonCode(course, lesson.id, code), 700)
    return () => clearTimeout(saveTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, lesson.id, course.id])

  const handleRun = useCallback(() => {
    setRunCode(code)
    setRunId((current) => current + 1)
    const results = runChecks(code, lesson.task?.checks || [])
    setCheckResults(results.results)
    setLessonFlag(course, lesson.id, 'codeRun', true, [course])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, lesson.id, course.id])

  const handleReset = () => {
    setCode(lesson.task?.starter || '')
    setRunCode('')
    setCheckResults([])
  }

  const handleCopy = async () => {
    const ok = await copyText(code)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    }
  }

  const handlePracticeSolved = (task, result) => {
    recordPractice(course, lesson.id, task.id, result, [course])
  }

  const handleQuizFinished = (result) => {
    recordQuiz(course, lesson.id, result, [course])
  }

  const practiceTasks = lesson.practice || []
  const solvedPractice = practiceTasks.filter((task) => lessonState?.practice?.[task.id]?.solved).length || 0
  const quizPassed = Boolean(lessonState?.quiz?.passed)

  const requirements = [
    { id: 'learn', label: 'Read the explanation', done: Boolean(lessonState?.learnViewed), tab: 'learn' },
    practiceTasks.length > 0 && {
      id: 'practice',
      label: `Solve the practice (${solvedPractice}/${practiceTasks.length})`,
      done: solvedPractice >= practiceTasks.length,
      tab: 'practice',
    },
    (lesson.quiz?.length || 0) > 0 && {
      id: 'quiz',
      label: `Pass the quiz (${requiredScore}% needed)`,
      done: quizPassed,
      tab: 'quiz',
    },
  ].filter(Boolean)

  const canComplete = requirements.every((requirement) => requirement.done)
  const alreadyCompleted = Boolean(lessonState?.completedAt)

  const handleComplete = () => {
    if (!canComplete || alreadyCompleted) return
    const result = completeLesson(course, lesson.id, [course])
    const earned = (result.badges || []).map((awarded) => BADGES.find((badge) => badge.id === awarded.id)).filter(Boolean)
    setCelebration({
      pointsAdded: result.pointsAdded || 0,
      badges: earned,
      courseCompleted: Boolean(result.state?.courses?.[course.id]?.completedAt),
      userId,
    })
  }

  const pickLesson = (target, unlocked) => {
    setDrawerOpen(false)
    if (!unlocked) {
      const index = course.lessons.findIndex((entry) => entry.id === target.id)
      const blocker = course.lessons[index - 1]
      if (blocker) {
        setLockedTarget({
          message: `Finish “${blocker.title}” to unlock “${target.title}”.`,
          lessonId: blocker.id,
          blockerTitle: blocker.title,
        })
      }
      return
    }
    setLockedTarget(null)
    go(`/learn/course/${course.id}/lesson/${target.id}`)
  }

  const toggleModule = (moduleId) => {
    setExpandedModules((current) =>
      current.includes(moduleId) ? current.filter((id) => id !== moduleId) : [...current, moduleId],
    )
  }

  const progress = useMemo(() => computeCourseProgress(course, state), [course, state])

  const curriculum = (
    <CurriculumList
      course={course}
      state={state}
      currentLessonId={lesson.id}
      onPick={pickLesson}
      expandedModules={expandedModules}
      onToggleModule={toggleModule}
    />
  )

  return (
    <main className="dashboard-shell learn-shell">
      <Sidebar active={active} setActive={setActive} />

      <div className="dashboard-main">
        <header className="dashboard-header">
          <div className="dashboard-search"><span>CodeCraft Learning</span></div>
          <CourseSearch className="global-header-search" />
          <div className="profile-actions">
            <AdminHeaderAction />
            <NotificationBell />
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>

        <div className="learn-mobile-bar">
          <button type="button" className="learn-mobile-bar__back" onClick={() => go(`/learn/course/${course.id}`)}>
            ‹ Course
          </button>
          <div className="learn-mobile-bar__title">
            <strong>{course.title}</strong>
            <span>Lesson {lessonIndex + 1} of {course.lessons.length} · {progress.percentage}%</span>
          </div>
          <button
            type="button"
            className="learn-mobile-bar__menu"
            aria-expanded={drawerOpen}
            aria-controls="learn-curriculum-drawer"
            onClick={() => setDrawerOpen(true)}
          >
            ☰ Lessons
          </button>
        </div>

        <div className="learn-workspace" ref={topRef}>
          {isDesktop ? (
            <aside className={`learn-curriculum ${curriculumCollapsed ? 'is-collapsed' : ''}`}>
              <div className="learn-curriculum__head">
                <div>
                  <span className="section-kicker">CURRICULUM</span>
                  <strong>{course.title}</strong>
                </div>
                <button
                  type="button"
                  className="learn-curriculum__toggle"
                  onClick={() => setCurriculumCollapsed((value) => !value)}
                  aria-label={curriculumCollapsed ? 'Show curriculum' : 'Hide curriculum'}
                  title={curriculumCollapsed ? 'Show curriculum' : 'Hide curriculum'}
                >
                  {curriculumCollapsed ? '›' : '‹'}
                </button>
              </div>
              {!curriculumCollapsed && curriculum}
            </aside>
          ) : null}

          {!isDesktop && drawerOpen && (
            <div className="learn-drawer" role="presentation">
              <button
                type="button"
                className="learn-drawer__backdrop"
                aria-label="Close curriculum"
                onClick={() => setDrawerOpen(false)}
              />
              <div className="learn-drawer__panel" id="learn-curriculum-drawer" role="dialog" aria-modal="true" aria-label="Course curriculum">
                <header>
                  <strong>Curriculum</strong>
                  <button type="button" aria-label="Close curriculum" onClick={() => setDrawerOpen(false)}>✕</button>
                </header>
                {curriculum}
              </div>
            </div>
          )}

          <section className="learn-lesson" aria-label={`Lesson: ${lesson.title}`}>
            <header className="learn-lesson__head">
              <div className="learn-lesson__meta">
                <span className="section-kicker">{module?.title} · Lesson {lessonIndex + 1}</span>
                <span className="learn-lesson__duration">⏱ {estimateLessonMinutes(lesson)} min</span>
              </div>
              <h1>{lesson.title}</h1>
              <div className="learn-lesson__progressline">
                <div className="curriculum__bar"><span style={{ width: `${progress.percentage}%` }} /></div>
                <span>{progress.percentage}% course progress</span>
              </div>
            </header>

            <div className="learn-tabs" role="tablist" aria-label="Learning modes">
              {TABS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === entry.id}
                  className={`learn-tab-btn ${tab === entry.id ? 'is-active' : ''}`}
                  onClick={() => setTab(entry.id)}
                >
                  <span aria-hidden="true">{entry.icon}</span> {entry.label}
                  {entry.id === 'practice' && practiceTasks.length > 0 && solvedPractice >= practiceTasks.length && <i className="learn-tab-btn__done">✓</i>}
                  {entry.id === 'quiz' && quizPassed && <i className="learn-tab-btn__done">✓</i>}
                </button>
              ))}
            </div>

            <div className="learn-lesson__body">
              {tab === 'learn' && <LearnTab lesson={lesson} onContinue={() => setTab('code')} />}

              {tab === 'code' && (
                <div className="learn-tab">
                  <div className="learn-code-task">
                    <span className="section-kicker">CODE CHALLENGE</span>
                    <RichText text={lesson.task?.brief || 'Open the editor and experiment with this lesson’s code.'} as="p" />
                  </div>
                  {!isDesktop && (
                    <LabPanel
                      lesson={lesson}
                      code={code}
                      setCode={setCode}
                      runCode={runCode}
                      runId={runId}
                      checkResults={checkResults}
                      onRun={handleRun}
                      onReset={handleReset}
                      onCopy={handleCopy}
                      copied={copied}
                    />
                  )}
                  {isDesktop && (
                    <div className="learn-tab-empty learn-hint-desktop">
                      <h3>Your editor is on the right</h3>
                      <p>Edit the starter code, press <strong>Run</strong>, and watch the preview and requirement checks update live.</p>
                    </div>
                  )}
                </div>
              )}

              {tab === 'practice' && (
                <PracticeTab
                  lesson={lesson}
                  lessonState={lessonState}
                  points={POINTS.PRACTICE_CORRECT}
                  onPracticeSolved={handlePracticeSolved}
                />
              )}

              {tab === 'quiz' && (
                <QuizTab
                  lesson={lesson}
                  requiredScore={requiredScore}
                  bestScore={lessonState?.quiz?.best || 0}
                  attempts={lessonState?.quiz?.attempts || 0}
                  onFinished={handleQuizFinished}
                />
              )}
            </div>

            <footer className="learn-lesson__footer">
              <div className="learn-requirements">
                <span className="section-kicker">TO FINISH THIS LESSON</span>
                <ul>
                  {requirements.map((requirement) => (
                    <li key={requirement.id} className={requirement.done ? 'is-done' : ''}>
                      <button type="button" onClick={() => setTab(requirement.tab)}>
                        <span aria-hidden="true">{requirement.done ? '✓' : '○'}</span> {requirement.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="learn-lesson__nav">
                <button
                  type="button"
                  className="learn-btn"
                  disabled={!previousLesson}
                  onClick={() => previousLesson && go(`/learn/course/${course.id}/lesson/${previousLesson.id}`)}
                >
                  ‹ Previous
                </button>

                {alreadyCompleted ? (
                  <button
                    type="button"
                    className="learn-btn learn-btn--primary"
                    disabled={!nextLesson || !nextUnlocked}
                    onClick={() => nextLesson && go(`/learn/course/${course.id}/lesson/${nextLesson.id}`)}
                  >
                    {nextLesson ? (nextUnlocked ? 'Next lesson ›' : 'Next lesson locked') : 'Course complete'}
                  </button>
                ) : (
                  <button type="button" className="learn-btn learn-btn--primary" disabled={!canComplete} onClick={handleComplete}>
                    {canComplete ? 'Complete lesson ›' : 'Finish the steps above'}
                  </button>
                )}
              </div>

              {lockedTarget && (
                <p className="learn-locked-note" role="status">
                  {lockedTarget.message}{' '}
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => go(`/learn/course/${course.id}/lesson/${lockedTarget.lessonId}`)}
                  >
                    Open “{lockedTarget.blockerTitle}” now →
                  </button>
                </p>
              )}
            </footer>
          </section>

          {isDesktop && (
            <aside className={`learn-lab ${curriculumCollapsed ? 'is-wide' : ''}`} aria-label="Code playground">
              <LabPanel
                lesson={lesson}
                code={code}
                setCode={setCode}
                runCode={runCode}
                runId={runId}
                checkResults={checkResults}
                onRun={handleRun}
                onReset={handleReset}
                onCopy={handleCopy}
                copied={copied}
              />
            </aside>
          )}
        </div>
      </div>

      {celebration && (
        <Celebration
          payload={celebration}
          course={course}
          hasNext={Boolean(nextLesson && nextUnlocked)}
          onNext={() => {
            const target = nextLesson
            setCelebration(null)
            if (target) go(`/learn/course/${course.id}/lesson/${target.id}`)
          }}
          onClose={() => setCelebration(null)}
        />
      )}
    </main>
  )
}
