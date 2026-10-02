import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { UserButton, useUser } from '@clerk/clerk-react'
import { ArrowRight, BarChart3, BookOpenCheck, CheckCircle2, Clock3, Code2, RotateCcw, Search, Trophy, Zap } from 'lucide-react'
import CourseSearch from './CourseSearch'
import AdminHeaderAction from './AdminHeaderAction'
import { NotificationBell } from './NotificationSystem'
import MobileNavigation from './MobileNavigation'
import { ChallengesPage as PersistedChallengesPage } from './ChallengeSystem'
import { supabase } from './lib/supabase'
import { calculateQuizResult as computeQuizResult } from './lib/quiz-result'
import './quiz-page.css'

export { PersistedChallengesPage as ChallengesPage }
export { UpcomingChallenges } from './ChallengeSystem'

function SidebarNavIcon({ type }) {
  const commonProps = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  }

  switch (type) {
    case 'home':
      return <svg {...commonProps} width="18" height="18"><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20h14V9.5" /><path d="M9 20v-7h6v7" /></svg>
    case 'learn':
      return <svg {...commonProps} width="18" height="18"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v10A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>
    case 'code':
      return <svg {...commonProps} width="18" height="18"><path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14" /></svg>
    case 'dashboard':
      return <svg {...commonProps} width="18" height="18"><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="4" rx="1.5" /><rect x="13" y="12" width="7" height="8" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /></svg>
    case 'challenge':
      return <svg {...commonProps} width="18" height="18"><path d="M7 4h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" /><path d="M9 20h6M12 14v6" /></svg>
    case 'quiz':
      return <svg {...commonProps} width="18" height="18"><path d="M8 8h8M8 12h8M8 16h5" /><path d="M5 4.5h14A1.5 1.5 0 0 1 20.5 6v12A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18V6A1.5 1.5 0 0 1 5 4.5Z" /></svg>
    case 'certificate':
      return <svg {...commonProps} width="18" height="18"><path d="M8 5.5h8a2 2 0 0 1 2 2V15l-4-2-4 2-4-2V7.5a2 2 0 0 1 2-2Z" /><path d="M8 5V3.5h8V5" /><path d="M12 9.5v5" /></svg>
    case 'profile':
      return <svg {...commonProps} width="18" height="18"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-3.2 3.1-5 7-5s6.2 1.8 7 5" /></svg>
    default:
      return null
  }
}

function FeatureShell({ active, setActive, children }) {
  const items = [
    { label: 'Home', route: '/', id: 'home', icon: 'home' },
    { label: 'Learn', route: '/learn', id: 'learn', icon: 'learn' },
    { label: 'Code Editor', route: '/code-editor', id: 'code-editor', icon: 'code' },
    { label: 'Community', route: '/dashboard', id: 'dashboard', icon: 'dashboard' },
    { label: 'Challenges', route: '/challenges', id: 'challenges', icon: 'challenge' },
    { label: 'Quizzes', route: '/quizzes', id: 'quizzes', icon: 'quiz' },
    { label: 'Certificates', route: '/certificates', id: 'certificates', icon: 'certificate' },
    { label: 'Profile', route: '/profile', id: 'profile', icon: 'profile' },
  ]
  const mobileItems = items.map(({ label, route, id, icon }) => ({
    id,
    label,
    icon: <span className="sidebar-icon"><SidebarNavIcon type={icon} /></span>,
    isActive: active === id,
    onSelect: () => {
      setActive(id)
      window.history.pushState({}, '', route)
      window.dispatchEvent(new PopStateEvent('popstate'))
    },
  }))

  return <main className="dashboard-shell">
    <MobileNavigation items={mobileItems} />
    <aside className="sidebar">
      <div className="brand"><img src="/codecraft-logo.png" alt="CodeCraft" /></div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {items.map(({ label, route, id, icon }) => (
          <button
            key={label}
            type="button"
            className={`sidebar-nav-item ${active === id ? 'active' : ''}`}
            onClick={() => {
              setActive(id)
              window.history.pushState({}, '', route)
              window.dispatchEvent(new PopStateEvent('popstate'))
            }}
          >
            <span className="sidebar-icon"><SidebarNavIcon type={icon} /></span>
            <span>{label}</span>
            {label === 'Community' && <i className="nav-pulse" />}
          </button>
        ))}
      </nav>

      <div className="sidebar-promo">
        <span className="promo-spark">✦</span>
        <h3>Build Your Future</h3>
        <p>Master in-demand skills, build real projects and become a better developer.</p>
        <button type="button" className="button button-small" onClick={() => { setActive('learn'); window.history.pushState({}, '', '/learn'); window.dispatchEvent(new PopStateEvent('popstate')) }}>Start Learning <span>→</span></button>
      </div>
      <div className="sidebar-foot">© 2024 CodeCraft</div>
    </aside>

    <div className="dashboard-main">
      <header className="dashboard-header">
        <div className="dashboard-search"><span>CodeCraft Learning</span></div>
        <CourseSearch className="global-header-search" />
        <div className="profile-actions"><AdminHeaderAction /><NotificationBell /><UserButton afterSignOutUrl="/" /></div>
      </header>
      <div className="dashboard-content learner-feature-content">{children}</div>
    </div>
  </main>
}

export function ManagedCourseList() {
  const { user } = useUser()
  const [courses, setCourses] = useState([])
  const [lessons, setLessons] = useState([])
  const [completedLessonIds, setCompletedLessonIds] = useState(() => new Set())
  const [selected, setSelected] = useState('')
  const viewedRef = useRef(new Set())
  const deepLinkLessonRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      supabase.from('courses').select('id,title,description,category,difficulty,icon,position').eq('published', true).order('position'),
      supabase.from('lessons').select('id,course_id,title,content,position').eq('published', true).order('position'),
    ]).then(([courseResult, lessonResult]) => {
      if (courseResult.error) console.error('Failed to load courses:', courseResult.error)
      if (lessonResult.error) console.error('Failed to load lessons:', lessonResult.error)
      if (!cancelled) {
        setCourses(courseResult.data || [])
        setLessons(lessonResult.data || [])
      }
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!user?.id) return undefined
    let cancelled = false
    supabase.from('lesson_progress').select('lesson_id,completed_at').eq('clerk_user_id', user.id).then(({ data, error }) => {
      if (error) {
        console.error('Failed to load lesson progress:', error)
        return
      }
      if (!cancelled) setCompletedLessonIds(new Set((data || []).filter((row) => row.completed_at).map((row) => row.lesson_id)))
    })
    return () => { cancelled = true }
  }, [user?.id])

  // Deep link from Home "Continue Learning": /learn?course=<id>&lesson=<id>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const courseParam = params.get('course')
    const lessonParam = params.get('lesson')
    if (courseParam) {
      deepLinkLessonRef.current = lessonParam
      setSelected(courseParam)
      window.setTimeout(() => {
        document.querySelector('.managed-course-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 80)
    }
  }, [])

  // Open the deep-linked lesson once the catalog has rendered
  useEffect(() => {
    const lessonId = deepLinkLessonRef.current
    if (!lessonId || !lessons.length) return
    deepLinkLessonRef.current = null
    const element = document.getElementById(`lesson-${lessonId}`)
    if (element) {
      element.open = true
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [lessons, selected])

  const persistLessonView = useCallback(async (lesson) => {
    if (!user?.id || viewedRef.current.has(lesson.id)) return
    viewedRef.current.add(lesson.id)
    const { error } = await supabase.from('lesson_progress').upsert(
      {
        clerk_user_id: user.id,
        lesson_id: lesson.id,
        course_id: lesson.course_id,
        last_viewed_at: new Date().toISOString(),
      },
      { onConflict: 'clerk_user_id,lesson_id', ignoreDuplicates: false },
    )
    if (error) console.error('Failed to record lesson view:', error)
  }, [user?.id])

  const markLessonComplete = useCallback(async (lesson) => {
    if (!user?.id || completedLessonIds.has(lesson.id)) return
    setCompletedLessonIds((previous) => new Set(previous).add(lesson.id))
    const now = new Date().toISOString()
    const { error } = await supabase.from('lesson_progress').upsert(
      {
        clerk_user_id: user.id,
        lesson_id: lesson.id,
        course_id: lesson.course_id,
        last_viewed_at: now,
        completed_at: now,
      },
      { onConflict: 'clerk_user_id,lesson_id', ignoreDuplicates: false },
    )
    if (error) {
      console.error('Failed to save lesson completion:', error)
      setCompletedLessonIds((previous) => {
        const next = new Set(previous)
        next.delete(lesson.id)
        return next
      })
    }
  }, [user?.id, completedLessonIds])

  if (!courses.length) return null
  const active = courses.find((course) => course.id === selected)
  return <section className="managed-course-section"><header><span className="section-kicker">FROM YOUR LEARNING TEAM</span><h2>Published Courses</h2></header><div className="managed-course-list">{courses.map((course) => {
    const courseLessons = lessons.filter((lesson) => lesson.course_id === course.id)
    const completedCount = courseLessons.filter((lesson) => completedLessonIds.has(lesson.id)).length
    const coursePct = courseLessons.length ? Math.round((completedCount / courseLessons.length) * 100) : 0
    return <article key={course.id}><button type="button" className="managed-course-button" onClick={() => setSelected(selected === course.id ? '' : course.id)}><span className="managed-course-icon">{course.icon}</span><span><strong>{course.title}</strong><small>{course.category} · {course.difficulty}{completedCount > 0 ? ` · ${coursePct}% complete` : ''}</small></span><span>{selected === course.id ? 'Close' : 'View lessons'}</span></button>{active?.id === course.id && <div className="managed-course-detail"><p>{course.description}</p>{courseLessons.map((lesson) => {
      const isComplete = completedLessonIds.has(lesson.id)
      return <details key={lesson.id} id={`lesson-${lesson.id}`} onToggle={(event) => { if (event.target.open) persistLessonView(lesson) }}><summary>{lesson.position + 1}. {lesson.title}{isComplete ? ' ✓' : ''}</summary><p>{lesson.content}</p><div className="lesson-complete-row"><button type="button" className={`button button-small lesson-complete-button ${isComplete ? 'is-completed' : ''}`} disabled={isComplete} onClick={() => markLessonComplete(lesson)}>{isComplete ? '✓ Completed' : 'Mark as complete'}</button></div></details>
    })}</div>}</article>
  })}</div></section>
}

export function AnnouncementStrip() {
  const [announcements, setAnnouncements] = useState([])
  useEffect(() => {
    let cancelled = false
    supabase.from('announcements').select('id,title,body,publish_at').eq('is_published', true).order('created_at', { ascending: false }).limit(3).then(({ data }) => {
      if (!cancelled) setAnnouncements(data || [])
    })
    return () => { cancelled = true }
  }, [])
  if (!announcements.length) return null
  return <section className="announcement-strip" aria-label="CodeCraft announcements">{announcements.map((announcement) => <article key={announcement.id}><span className="section-kicker">ANNOUNCEMENT</span><strong>{announcement.title}</strong><p>{announcement.body}</p></article>)}</section>
}

export function LegacyChallengesPage({ active, setActive }) {
  const { user } = useUser()
  const [challenges, setChallenges] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [drafts, setDrafts] = useState({})
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const refresh = useCallback(async () => {
    const [challengeResult, submissionResult] = await Promise.all([
      supabase.from('challenges').select('id,title,description,difficulty,instructions,starter_code,position').eq('published', true).order('position'),
      supabase.from('challenge_submissions').select('id,challenge_id,status,submitted_at').eq('clerk_user_id', user.id).order('submitted_at', { ascending: false }),
    ])
    setChallenges(challengeResult.data || [])
    setSubmissions(submissionResult.data || [])
    setLoading(false)
  }, [user])
  useEffect(() => { if (user?.id) refresh() }, [user, refresh])
  const submit = async (challenge) => {
    const code = drafts[challenge.id] || ''
    if (!code.trim()) return setMessage('Add your solution before submitting.')
    const { error } = await supabase.from('challenge_submissions').insert({ challenge_id: challenge.id, clerk_user_id: user.id, submitted_code: code })
    if (error) return setMessage(error.message)
    setMessage('Your solution was submitted and saved.')
    await refresh()
  }
  return <FeatureShell active={active} setActive={setActive}><header className="learner-feature-heading"><span className="section-kicker">PRACTICE</span><h1>Challenges</h1><p>Work through published coding prompts and save your submissions.</p></header>{message && <p className="learner-message" role="status">{message}</p>}{loading ? <p>Loading challenges…</p> : challenges.length ? <div className="learner-feature-list">{challenges.map((challenge) => <article className="learner-feature-item" key={challenge.id}><div className="feature-item-meta"><span>{challenge.difficulty}</span><span>{submissions.filter((submission) => submission.challenge_id === challenge.id).length} submissions</span></div><h2>{challenge.title}</h2><p>{challenge.description}</p><details><summary>Instructions and starter code</summary><p>{challenge.instructions}</p><pre>{challenge.starter_code || '// Write your solution here'}</pre></details><label className="learner-code-field"><span>Your solution</span><textarea value={drafts[challenge.id] ?? challenge.starter_code ?? ''} onChange={(event) => setDrafts((old) => ({ ...old, [challenge.id]: event.target.value }))} rows={8} /></label><button type="button" className="button" onClick={() => submit(challenge)}>Submit solution</button></article>)}</div> : <p className="learner-empty">No published challenges are available right now.</p>}</FeatureShell>
}

const quizCategoryOptions = ['HTML', 'CSS', 'JavaScript', 'React', 'Python', 'General Programming']
const quizDifficultyOptions = ['Beginner', 'Intermediate', 'Advanced']

function formatTimeRemaining(totalSeconds) {
  if (totalSeconds <= 0) return '00:00'
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function getQuizQuestionCount(quizQuestions) {
  return Array.isArray(quizQuestions) ? quizQuestions.length : 0
}

function formatQuizDuration(seconds) {
  const minutes = Math.max(1, Math.round(Number(seconds || 0) / 60))
  return `${minutes} min`
}

function QuizCard({ quiz, questionCount, status, bestScore, answeredCount, onStart }) {
  const difficulty = (quiz.difficulty || 'Beginner').toLowerCase()
  const buttonLabel = status === 'in-progress' ? 'Continue Quiz' : status === 'completed' ? 'Retake Quiz' : 'Start Quiz'
  const ButtonIcon = status === 'in-progress' ? ArrowRight : status === 'completed' ? RotateCcw : ArrowRight

  return <article className={`quiz-card quiz-card-${status}`}>
    <div className="quiz-card-topline">
      <div className="quiz-card-identity"><span className="quiz-card-icon quiz-card-icon-label">{quiz.icon || <Code2 size={19} aria-hidden="true" />}</span><span className="quiz-category-badge">{quiz.category || 'General Programming'}</span></div>
      <span className={`quiz-difficulty-badge quiz-difficulty-${difficulty}`}>{quiz.difficulty || 'Beginner'}</span>
    </div>
    <div className="quiz-card-copy"><h2>{quiz.title}</h2><p>{quiz.description || 'Build confidence with a focused coding knowledge check.'}</p></div>
    <div className="quiz-card-meta">
      <span><BookOpenCheck size={15} aria-hidden="true" />{questionCount} Questions</span>
      <span className="quiz-xp-meta"><Zap size={15} aria-hidden="true" />+{Number(quiz.xp_reward || 0)} XP</span>
      <span><Clock3 size={15} aria-hidden="true" />{formatQuizDuration(quiz.time_limit_seconds)}</span>
    </div>
    <div className="quiz-card-footer">
      {status === 'completed' ? <span className="quiz-completion-status"><CheckCircle2 size={15} aria-hidden="true" />Completed <small>Best score {bestScore}%</small></span> : status === 'in-progress' ? <span className="quiz-in-progress-status">In progress <small>{answeredCount} answered</small></span> : <span className="quiz-not-started-status">Ready when you are</span>}
      <button type="button" className="quiz-start-button" onClick={onStart}>{buttonLabel}<ButtonIcon size={16} aria-hidden="true" /></button>
    </div>
  </article>
}

export function QuizzesPage({ active, setActive }) {
  const { user } = useUser()
  const clerkUserId = user?.id
  const [quizzes, setQuizzes] = useState([])
  const [questionsByQuiz, setQuestionsByQuiz] = useState({})
  const [quizHistory, setQuizHistory] = useState([])
  const [feedbackByQuestion, setFeedbackByQuestion] = useState({})
  const [reviewRows, setReviewRows] = useState([])
  const [selectedQuiz, setSelectedQuiz] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [difficulty, setDifficulty] = useState('All')
  const [quizStatus, setQuizStatus] = useState('All')
  const [quizAttemptId, setQuizAttemptId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [error, setError] = useState('')
  const [quizStarted, setQuizStarted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const [quizState, setQuizState] = useState('browse')
  const [timeLeft, setTimeLeft] = useState(0)
  const dataRequestRef = useRef(null)

  const loadData = useCallback(async () => {
    if (!clerkUserId) return
    if (dataRequestRef.current) return dataRequestRef.current

    const request = (async () => {
    setLoading(true)
    setError('')

    const [quizResult, questionResult, historyResult] = await Promise.all([
      supabase.from('quizzes').select('*').eq('published', true).order('position').order('created_at', { ascending: false }),
      supabase.from('quiz_questions').select('*').order('position'),
      supabase.from('quiz_attempts').select('id,quiz_id,score,total_questions,submitted_at,answers,status,percentage,xp_earned,time_used,started_at,current_question_index').eq('clerk_user_id', clerkUserId).order('submitted_at', { ascending: false }),
    ])

    if (quizResult.error || questionResult.error || historyResult.error) {
      setError('Quiz data could not be loaded. Please try again later.')
      setLoading(false)
      setHistoryLoading(false)
      return
    }

    const normalizedQuestions = {}
    ;(questionResult.data || []).forEach((question) => {
      let optionValues = []
      try {
        optionValues = Array.isArray(question.options) ? question.options : JSON.parse(typeof question.options === 'string' ? question.options : '[]')
      } catch {
        optionValues = []
      }

      const key = question.quiz_id || 'unknown'
      const questionWithAnswer = {
        ...question,
        options: Array.isArray(optionValues) ? optionValues : [],
        correct_answer: question.correct_answer ?? null,
        explanation: question.explanation ?? '',
      }
      normalizedQuestions[key] = [...(normalizedQuestions[key] || []), questionWithAnswer]
    })

    const uniqueQuizRows = [...new Map((quizResult.data || []).filter((quiz) => quiz.id).map((quiz) => [quiz.id, quiz])).values()]
    const quizById = new Map(uniqueQuizRows.map((quiz) => [quiz.id, quiz]))
    const normalizedHistory = (historyResult.data || []).map((attempt) => {
      const totalQuestions = Number(attempt.total_questions || 0)
      const score = Number(attempt.score || 0)
      const percentage = Number(attempt.percentage ?? (totalQuestions ? Math.round((score / totalQuestions) * 100) : 0))
      const quiz = quizById.get(attempt.quiz_id)
      const xpReward = Number(quiz?.xp_reward || 0)
      const xpEarned = Number(attempt.xp_earned ?? (xpReward ? Math.round((percentage / 100) * xpReward) : 0))
      return { ...attempt, percentage, xp_earned: xpEarned, status: attempt.status || 'completed', time_used: attempt.time_used ?? null, current_question_index: Number(attempt.current_question_index || 0) }
    })

    setQuizzes(uniqueQuizRows)
    setQuestionsByQuiz(normalizedQuestions)
    setQuizHistory(normalizedHistory)
    setLoading(false)
    setHistoryLoading(false)
    })()
    dataRequestRef.current = request
    try {
      await request
    } finally {
      if (dataRequestRef.current === request) dataRequestRef.current = null
    }
  }, [clerkUserId])

  useEffect(() => { loadData() }, [loadData])

  const attemptsByQuiz = useMemo(() => {
    const grouped = new Map()
    quizHistory.forEach((attempt) => grouped.set(attempt.quiz_id, [...(grouped.get(attempt.quiz_id) || []), attempt]))
    return grouped
  }, [quizHistory])
  const categoryOptions = useMemo(() => [...new Set(quizzes.map((quiz) => quiz.category || 'General Programming'))].sort(), [quizzes])
  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesSearch = `${quiz.title || ''} ${quiz.description || ''}`.toLowerCase().includes(search.trim().toLowerCase())
    const matchesCategory = category === 'All' || (quiz.category || 'General Programming') === category
    const matchesDifficulty = difficulty === 'All' || (quiz.difficulty || 'Beginner') === difficulty
    const attempts = attemptsByQuiz.get(quiz.id) || []
    const latestAttempt = attempts[0]
    const status = latestAttempt?.status === 'in_progress' ? 'In progress' : attempts.some((attempt) => ['completed', 'timed_out'].includes(attempt.status)) ? 'Completed' : 'Not started'
    const matchesStatus = quizStatus === 'All' || status === quizStatus
    return matchesSearch && matchesCategory && matchesDifficulty && matchesStatus
  })

  const visibleQuestions = useMemo(() => selectedQuiz ? [...(questionsByQuiz[selectedQuiz.id] || [])].sort((first, second) => Number(first.position || 0) - Number(second.position || 0)) : [], [questionsByQuiz, selectedQuiz])
  const baseCurrentQuestion = visibleQuestions[currentIndex] || null
  const currentFeedback = baseCurrentQuestion ? feedbackByQuestion[baseCurrentQuestion.id] : null
  const currentQuestion = baseCurrentQuestion && currentFeedback?.ready ? {
    ...baseCurrentQuestion,
    correct_answer: currentFeedback.isCorrect ? answers[baseCurrentQuestion.id] : '__incorrect_answer__',
    explanation: currentFeedback.explanation,
  } : baseCurrentQuestion
  const currentAnswer = currentQuestion && (selectedQuiz?.feedback_mode !== 'instant' || currentFeedback?.ready) ? answers[currentQuestion.id] : null
  const progressSnapshotRef = useRef({ answers, currentIndex, timeLeft })
  const feedbackRequestsRef = useRef(new Set())
  useEffect(() => { progressSnapshotRef.current = { answers, currentIndex, timeLeft } }, [answers, currentIndex, timeLeft])

  const requestInstantFeedback = useCallback(async (quizId, questionId, answer) => {
    const requestKey = `${quizId}:${questionId}:${String(answer)}`
    if (feedbackRequestsRef.current.has(requestKey)) return
    feedbackRequestsRef.current.add(requestKey)
    const { data, error: feedbackError } = await supabase.rpc('evaluate_codecraft_quiz_answer', {
      p_quiz_id: quizId,
      p_question_id: questionId,
      p_answer: answer,
    })
    feedbackRequestsRef.current.delete(requestKey)
    if (feedbackError) {
      setError(feedbackError.message || 'Answer feedback could not be loaded.')
      return
    }
    const feedback = Array.isArray(data) ? data[0] : data
    setFeedbackByQuestion((previous) => !previous[questionId] || previous[questionId].answer === answer
      ? { ...previous, [questionId]: { answer, ready: true, isCorrect: Boolean(feedback?.is_correct), explanation: feedback?.explanation || '' } }
      : previous)
  }, [])

  const saveQuizProgress = useCallback(async () => {
    if (!quizAttemptId || !selectedQuiz || !clerkUserId) return
    const progress = progressSnapshotRef.current
    const timeUsed = selectedQuiz.time_limit_seconds ? Math.max(0, Number(selectedQuiz.time_limit_seconds) - progress.timeLeft) : null
    const { error: progressError } = await supabase.rpc('save_codecraft_quiz_progress', {
      p_attempt_id: quizAttemptId,
      p_answers: progress.answers,
      p_current_question_index: progress.currentIndex,
      p_time_used: timeUsed,
    })
    if (progressError) setError(progressError.message || 'Your quiz progress could not be saved.')
  }, [clerkUserId, quizAttemptId, selectedQuiz])

  useEffect(() => {
    if (!quizAttemptId || !quizStarted) return undefined
    const interval = window.setInterval(() => { void saveQuizProgress() }, 15000)
    return () => window.clearInterval(interval)
  }, [quizAttemptId, quizStarted, saveQuizProgress])

  useEffect(() => {
    if (quizAttemptId && quizStarted) void saveQuizProgress()
  }, [answers, currentIndex, quizAttemptId, quizStarted, saveQuizProgress])

  // One submission per attempt. React StrictMode double-invokes event flows in
  // development and the timer can race the confirm dialog — both previously
  // produced two finish_codecraft_quiz calls, the second of which failed with
  // "Quiz draft not found" and (via the catch) blanked the results screen.
  const submissionStartedRef = useRef(false)

  // Client-side snapshot of the result, built from the actual quiz structure:
  // answers are stored by question.id and hold the option TEXT (stable
  // identity, randomization-safe). Score is always correct/totalQuestions —
  // never correct/attempted.
  // Delegates to the pure calculator in src/lib/quiz-result.js (unit-tested:
  // scripts/test-quiz-result.mjs). Reads the progress snapshot so the answer
  // set cannot race the submission.
  const calculateQuizResult = useCallback(() => {
    const snapshot = progressSnapshotRef.current
    return computeQuizResult(visibleQuestions, snapshot.answers, {
      xpReward: selectedQuiz?.xp_reward,
      timeLimitSeconds: selectedQuiz?.time_limit_seconds,
      timeLeft: snapshot.timeLeft,
    })
  }, [selectedQuiz, visibleQuestions])

  const handleQuizSubmit = useCallback(async (timedOut = false) => {
    if (!selectedQuiz || !clerkUserId || !visibleQuestions.length) return
    if (submissionStartedRef.current) return
    submissionStartedRef.current = true

    setSubmitting(true)
    setError('')

    const attemptIdAtSubmit = quizAttemptId
    // Calculate BEFORE any awaits — the answer snapshot must not be lost to a
    // mid-submission error or a stale state race.
    const calculated = calculateQuizResult()
    const timeUsed = calculated.timeUsed

    try {
      let savedResult = null
      let saveErrorMessage = ''

      if (attemptIdAtSubmit) {
        const { data: attemptData, error: attemptError } = await supabase.rpc('finish_codecraft_quiz', {
          p_attempt_id: attemptIdAtSubmit,
          p_answers: answers,
          p_time_used: timeUsed,
          p_timed_out: timedOut,
        })
        if (attemptError) {
          saveErrorMessage = attemptError.message || 'Quiz result could not be saved.'
          console.error('Quiz submission failed:', attemptError)
        } else {
          savedResult = Array.isArray(attemptData) ? attemptData[0] : attemptData
          if (!savedResult) {
            saveErrorMessage = 'Quiz result could not be saved.'
            console.error('Quiz submission failed: empty result from finish_codecraft_quiz')
          }
        }
      }

      // Fetch the authoritative review rows when the attempt was saved.
      let reviewRowsFromServer = []
      if (savedResult) {
        const { data: reviewData, error: reviewError } = await supabase.rpc('get_codecraft_quiz_attempt_review', {
          p_attempt_id: savedResult.attempt_id || attemptIdAtSubmit,
        })
        if (reviewError) {
          console.error('Quiz review fetch failed:', reviewError)
        } else {
          reviewRowsFromServer = Array.isArray(reviewData) ? reviewData : []
        }
      }

      const serverScore = savedResult ? Number(savedResult.score || 0) : calculated.correctAnswers
      const serverTotal = savedResult ? Number(savedResult.total_questions || calculated.totalQuestions) : calculated.totalQuestions
      const serverPercentage = savedResult ? Number(savedResult.percentage || 0) : calculated.percentage
      const serverXp = savedResult ? Number(savedResult.xp_earned || 0) : calculated.xpEarned

      if (saveErrorMessage) {
        // Never lose the student's calculated score to a database failure.
        setError(`Your quiz was completed, but we couldn't save your result. ${saveErrorMessage}`)
      }

      if (reviewRowsFromServer.length) setReviewRows(reviewRowsFromServer)

      if (savedResult && clerkUserId) {
        // XP is credited server-side as best-attempt-per-quiz: the RPC compares
        // this attempt's xp_earned with the student's previous best for the
        // same quiz and adds only the positive difference (idempotent via an
        // xp_credited flag + advisory lock, so retries can never double-award).
        const { data: awardData, error: awardError } = await supabase.rpc('award_codecraft_quiz_xp', {
          p_attempt_id: savedResult.attempt_id || attemptIdAtSubmit,
        })
        if (awardError) {
          console.error('Quiz XP award failed:', awardError)
        } else {
          const award = Array.isArray(awardData) ? awardData[0] : awardData
          if (award && Number(award.xp_delta || 0) <= 0) console.log('Quiz XP: no new best for this quiz — total unchanged')
        }
      }

      setResult({
        attemptId: savedResult?.attempt_id || attemptIdAtSubmit || null,
        score: serverScore,
        totalQuestions: serverTotal,
        questionsAttempted: calculated.questionsAttempted,
        correctAnswers: serverScore,
        wrongAnswers: Math.max(0, serverTotal - serverScore - calculated.unansweredQuestions),
        unansweredQuestions: calculated.unansweredQuestions,
        percentage: serverPercentage,
        xpEarned: serverXp,
        timeUsed,
        timedOut,
        saveError: saveErrorMessage,
        // Local snapshot guarantees the review can render even if the server
        // review RPC failed.
        localReview: calculated.answerReview,
      })
      setQuizState('result')
      setQuizStarted(false)
      setConfirmSubmit(false)
      setQuizAttemptId(null)
      setFeedbackByQuestion({})
      if (savedResult) await loadData()
    } catch (submitError) {
      console.error('Quiz submission failed:', submitError)
      // Absolute fallback: the student still sees their result.
      setResult({
        attemptId: attemptIdAtSubmit || null,
        score: calculated.correctAnswers,
        totalQuestions: calculated.totalQuestions,
        questionsAttempted: calculated.questionsAttempted,
        correctAnswers: calculated.correctAnswers,
        wrongAnswers: calculated.wrongAnswers,
        unansweredQuestions: calculated.unansweredQuestions,
        percentage: calculated.percentage,
        xpEarned: calculated.xpEarned,
        timeUsed,
        timedOut,
        saveError: submitError.message || 'Your result could not be saved.',
        localReview: calculated.answerReview,
      })
      setError(`Your quiz was completed, but we couldn't save your result. ${submitError.message || ''}`.trim())
      setQuizState('result')
      setQuizStarted(false)
      setConfirmSubmit(false)
      setQuizAttemptId(null)
      setFeedbackByQuestion({})
    } finally {
      setSubmitting(false)
      submissionStartedRef.current = false
    }
  }, [answers, calculateQuizResult, clerkUserId, loadData, quizAttemptId, selectedQuiz, visibleQuestions])

  useEffect(() => {
    if (!quizStarted || !selectedQuiz || !Number.isFinite(Number(selectedQuiz.time_limit_seconds)) || Number(selectedQuiz.time_limit_seconds) <= 0) return undefined

    const timer = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(timer)
          // Freeze the snapshot at 0 before auto-submit so timeUsed is exact.
          progressSnapshotRef.current = { ...progressSnapshotRef.current, timeLeft: 0 }
          setQuizStarted(false)
          setConfirmSubmit(false)
          window.setTimeout(() => {
            void handleQuizSubmit(true)
          }, 0)
          return 0
        }
        return previous - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [handleQuizSubmit, quizStarted, selectedQuiz])

  const resetQuizSession = () => {
    setQuizState('browse')
    setSelectedQuiz(null)
    setQuizStarted(false)
    setCurrentIndex(0)
    setAnswers({})
    setQuizAttemptId(null)
    setFeedbackByQuestion({})
    setReviewRows([])
    setResult(null)
    setConfirmSubmit(false)
    setTimeLeft(0)
  }

  const startQuiz = (quiz) => {
    setSelectedQuiz(quiz)
    setCurrentIndex(0)
    setAnswers({})
    setQuizAttemptId(null)
    setFeedbackByQuestion({})
    setReviewRows([])
    setResult(null)
    setConfirmSubmit(false)
    setQuizState('intro')
    setQuizStarted(false)
    setTimeLeft(Number(quiz.time_limit_seconds || 0))
  }

  const beginQuiz = () => {
    if (!selectedQuiz || !user?.id) return
    void (async () => {
      let attemptId = quizAttemptId
      if (!attemptId) {
        const draft = await supabase.from('quiz_attempts').insert({
          quiz_id: selectedQuiz.id,
          clerk_user_id: user.id,
          answers: {},
          score: 0,
          total_questions: visibleQuestions.length,
          percentage: 0,
          xp_earned: 0,
          status: 'in_progress',
          time_used: 0,
          started_at: new Date().toISOString(),
          current_question_index: 0,
        }).select('id').single()
        if (draft.error) {
          const existing = await supabase.from('quiz_attempts').select('id,answers,current_question_index,time_used').eq('clerk_user_id', user.id).eq('quiz_id', selectedQuiz.id).eq('status', 'in_progress').maybeSingle()
          if (existing.error || !existing.data) {
            setError(draft.error.message || 'Your quiz could not be started.')
            return
          }
          attemptId = existing.data.id
          setQuizAttemptId(existing.data.id)
          setAnswers(existing.data.answers || {})
          setCurrentIndex(Number(existing.data.current_question_index || 0))
          setTimeLeft(Math.max(0, Number(selectedQuiz.time_limit_seconds || 0) - Number(existing.data.time_used || 0)))
        } else {
          attemptId = draft.data.id
          setQuizAttemptId(draft.data.id)
          setTimeLeft(Number(selectedQuiz.time_limit_seconds || 0))
        }
      }
      if (!attemptId) return
      setQuizState('playing')
      setQuizStarted(true)
    })()
  }

  const retakeQuiz = () => {
    if (!selectedQuiz) return
    setCurrentIndex(0)
    setAnswers({})
    setQuizAttemptId(null)
    setFeedbackByQuestion({})
    setReviewRows([])
    setResult(null)
    setConfirmSubmit(false)
    setQuizState('intro')
    setQuizStarted(false)
    setTimeLeft(Number(selectedQuiz.time_limit_seconds || 0))
  }

  const continueQuiz = (quiz, attempt) => {
    let savedAnswers = attempt.answers || {}
    if (typeof savedAnswers === 'string') {
      try { savedAnswers = JSON.parse(savedAnswers) } catch { savedAnswers = {} }
    }
    const quizQuestions = [...(questionsByQuiz[quiz.id] || [])].sort((first, second) => Number(first.position || 0) - Number(second.position || 0))
    const resumeIndex = Math.max(0, Math.min(Number(attempt.current_question_index || 0), quizQuestions.length - 1))
    setSelectedQuiz(quiz)
    setQuizAttemptId(attempt.id)
    setAnswers(savedAnswers)
    setFeedbackByQuestion({})
    setReviewRows([])
    setCurrentIndex(resumeIndex)
    if (quiz.feedback_mode === 'instant' && savedAnswers[quizQuestions[resumeIndex]?.id] !== undefined) {
      void requestInstantFeedback(quiz.id, quizQuestions[resumeIndex].id, savedAnswers[quizQuestions[resumeIndex].id])
    }
    setResult(null)
    setConfirmSubmit(false)
    setTimeLeft(Math.max(0, Number(quiz.time_limit_seconds || 0) - Number(attempt.time_used || 0)))
    setQuizState('playing')
    setQuizStarted(true)
  }

  const goToQuestion = (index) => {
    const nextIndex = Math.max(0, Math.min(index, visibleQuestions.length - 1))
    const question = visibleQuestions[nextIndex]
    const savedAnswer = question ? answers[question.id] : undefined
    setCurrentIndex(nextIndex)
    if (selectedQuiz?.feedback_mode === 'instant' && savedAnswer !== undefined && feedbackByQuestion[question.id]?.answer !== savedAnswer) {
      void requestInstantFeedback(selectedQuiz.id, question.id, savedAnswer)
    }
  }

  const selectAnswer = (questionId, option) => {
    setAnswers((previous) => ({ ...previous, [questionId]: option }))
    if (selectedQuiz?.feedback_mode === 'instant') void requestInstantFeedback(selectedQuiz.id, questionId, option)
  }

  const summaryCounts = useMemo(() => {
    const finishedAttempts = quizHistory.filter((attempt) => ['completed', 'timed_out'].includes(attempt.status))
    const completed = new Set(finishedAttempts.map((attempt) => attempt.quiz_id)).size
    const quizzesAttempted = new Set(quizHistory.map((attempt) => attempt.quiz_id)).size
    const averageScore = finishedAttempts.length ? Math.round(finishedAttempts.reduce((sum, attempt) => sum + Number(attempt.percentage || 0), 0) / finishedAttempts.length) : 0
    // XP Earned = sum of each quiz's best xp_earned (retakes never stack).
    const totalXp = [...finishedAttempts.reduce((acc, attempt) => {
      const key = attempt.quiz_id
      acc.set(key, Math.max(acc.get(key) || 0, Number(attempt.xp_earned || 0)))
      return acc
    }, new Map()).values()].reduce((sum, best) => sum + best, 0)
    const bestScore = finishedAttempts.length ? Math.max(...finishedAttempts.map((attempt) => Number(attempt.percentage || 0))) : 0
    return { completed, quizzesAttempted, averageScore, totalXp, bestScore }
  }, [quizHistory])

  const difficultyOptions = [...new Set(quizzes.map((quiz) => quiz.difficulty || 'Beginner'))].sort()

  // Deterministic per-attempt display order for answer options. The answer is
  // always stored by option TEXT (stable identity), so randomization can never
  // break scoring. Without randomization the stored order is kept.
  const optionDisplayOrders = useMemo(() => {
    const orders = {}
    const randomize = Boolean(selectedQuiz?.randomize_options)
    visibleQuestions.forEach((question, questionIndex) => {
      const indices = (question.options || []).map((_, optionIndex) => optionIndex)
      if (!randomize) {
        orders[question.id] = indices
        return
      }
      const key = `${selectedQuiz?.id || ''}:${quizAttemptId || 'draft'}:${question.id || questionIndex}`
      let seed = 0
      for (let charIndex = 0; charIndex < key.length; charIndex += 1) seed = (seed * 31 + key.charCodeAt(charIndex)) >>> 0
      const random = () => {
        seed = (seed + 0x6D2B79F5) >>> 0
        let mixed = seed
        mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1)
        mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
        return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
      }
      for (let swapIndex = indices.length - 1; swapIndex > 0; swapIndex -= 1) {
        const swapWith = Math.floor(random() * (swapIndex + 1))
        ;[indices[swapIndex], indices[swapWith]] = [indices[swapWith], indices[swapIndex]]
      }
      orders[question.id] = indices
    })
    return orders
  }, [selectedQuiz, quizAttemptId, visibleQuestions])

  const answeredCount = useMemo(
    () => visibleQuestions.filter((question) => answers[question.id] !== undefined).length,
    [visibleQuestions, answers],
  )

  if (loading) return <FeatureShell active={active} setActive={setActive}><div className="quiz-page"><header className="quiz-page-header"><div className="quiz-page-heading-copy"><span className="quiz-page-eyebrow">QUIZ</span><h1>CodeCraft Quizzes</h1><p>Test your knowledge, earn XP, and master your coding skills.</p></div><span className="quiz-page-emblem"><BookOpenCheck size={26} aria-hidden="true" /></span></header><div className="quiz-loading-state">Loading quizzes…</div></div></FeatureShell>

  if (quizState === 'browse') {
    return <FeatureShell active={active} setActive={setActive}><div className="quiz-page">
      <header className="quiz-page-header"><div className="quiz-page-heading-copy"><span className="quiz-page-eyebrow">QUIZ</span><h1>CodeCraft Quizzes</h1><p>Test your knowledge, earn XP, and master your coding skills.</p></div><span className="quiz-page-emblem"><BookOpenCheck size={26} aria-hidden="true" /></span></header>
      {error && <p className="learner-message" role="alert">{error}</p>}
      <section className="quiz-stats-grid" aria-label="Your quiz statistics">
        <article className="quiz-stat-card"><span className="quiz-stat-icon"><BookOpenCheck size={18} aria-hidden="true" /></span><span><strong className="quiz-stat-value">{quizzes.length}</strong><span className="quiz-stat-label">Quizzes</span></span></article>
        <article className="quiz-stat-card"><span className="quiz-stat-icon"><Trophy size={18} aria-hidden="true" /></span><span><strong className="quiz-stat-value">{summaryCounts.completed}</strong><span className="quiz-stat-label">Completed</span></span></article>
        <article className="quiz-stat-card"><span className="quiz-stat-icon"><Zap size={18} aria-hidden="true" /></span><span><strong className="quiz-stat-value">{summaryCounts.totalXp}</strong><span className="quiz-stat-label">XP Earned</span></span></article>
        <article className="quiz-stat-card"><span className="quiz-stat-icon"><BarChart3 size={18} aria-hidden="true" /></span><span><strong className="quiz-stat-value">{summaryCounts.averageScore}%</strong><span className="quiz-stat-label">Average Score</span></span></article>
      </section>
      <section className="quiz-filter-panel" aria-label="Filter quizzes">
        <label className="quiz-filter-field"><span>Search</span><span className="quiz-search-control"><Search size={16} aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search quizzes..." /></span></label>
        <label className="quiz-filter-field"><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option>All</option>{categoryOptions.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="quiz-filter-field"><span>Difficulty</span><select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option>All</option>{difficultyOptions.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="quiz-filter-field"><span>Status</span><select value={quizStatus} onChange={(event) => setQuizStatus(event.target.value)}>{['All', 'Not started', 'In progress', 'Completed'].map((value) => <option key={value}>{value}</option>)}</select></label>
      </section>
      {!quizzes.length ? <section className="quiz-empty-state"><BookOpenCheck size={30} aria-hidden="true" /><h2>No quizzes available yet</h2><p>New quizzes will appear here when they are published.</p></section> : filteredQuizzes.length ? <section className="quiz-grid" aria-label="Available quizzes">{filteredQuizzes.map((quiz) => {
        const attempts = attemptsByQuiz.get(quiz.id) || []
        const draftAttempt = attempts.find((attempt) => attempt.status === 'in_progress')
        const finishedAttempts = attempts.filter((attempt) => ['completed', 'timed_out'].includes(attempt.status))
        const status = draftAttempt ? 'in-progress' : finishedAttempts.length ? 'completed' : 'not-started'
        const bestScore = finishedAttempts.length ? Math.max(...finishedAttempts.map((attempt) => Number(attempt.percentage || 0))) : 0
        return <QuizCard key={quiz.id} quiz={quiz} questionCount={getQuizQuestionCount(questionsByQuiz[quiz.id] || [])} status={status} bestScore={bestScore} answeredCount={Object.keys(draftAttempt?.answers || {}).length} onStart={() => draftAttempt ? continueQuiz(quiz, draftAttempt) : startQuiz(quiz)} />
      })}</section> : <p className="quiz-no-results">No quizzes match these filters. Try adjusting your search.</p>}
      <section className="quiz-history-section"><div className="quiz-history-heading"><h2>Recent Quiz Activity</h2><span>Your saved attempts</span></div>{quizHistory.length ? <div className="quiz-history-list">{quizHistory.slice(0, 6).map((attempt) => <div className="quiz-history-item" key={attempt.id}><div><strong>{quizzes.find((quiz) => quiz.id === attempt.quiz_id)?.title || 'Quiz'}</strong><span>{attempt.status === 'in_progress' ? 'In progress' : `${attempt.percentage}% · +${attempt.xp_earned || 0} XP`}</span></div><time>{attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleDateString() : 'Recently'}</time></div>)}</div> : <p className="quiz-no-results">No quizzes completed yet.</p>}</section>
    </div></FeatureShell>
  }

  if (quizState === 'playing' && selectedQuiz && currentQuestion) {
    const progressPercent = Math.round(((currentIndex + 1) / visibleQuestions.length) * 100)
    return <FeatureShell active={active} setActive={setActive}><div className="quiz-shell"><header className="quiz-topbar"><div><span className="section-kicker">QUIZ</span><h2>{selectedQuiz.title}</h2></div>{selectedQuiz.time_limit_seconds ? <span className="quiz-timer">Time Remaining <strong>{formatTimeRemaining(timeLeft)}</strong></span> : null}</header>    <div className="quiz-progress"><div className="quiz-progress-bar"><span style={{ width: `${progressPercent}%` }} /></div><div className="quiz-progress-meta"><span>Question {currentIndex + 1} of {visibleQuestions.length}</span><span>{answeredCount}/{visibleQuestions.length} answered</span></div></div><div className="quiz-question-card"><h3>{currentQuestion.question}</h3><div className="quiz-answer-grid">{(optionDisplayOrders[currentQuestion.id] || []).map((optionIndex, displayIndex) => {
  const option = (currentQuestion.options || [])[optionIndex]
  if (option === undefined) return null
  return <button type="button" key={`${optionIndex}-${String(option)}`} className={`quiz-answer-option ${currentAnswer === option ? 'is-selected' : ''}`} aria-pressed={currentAnswer === option} onClick={() => selectAnswer(currentQuestion.id, option)}><span className="quiz-answer-letter" aria-hidden="true">{String.fromCharCode(65 + displayIndex)}</span>{String(option)}</button>
})}</div>{selectedQuiz.feedback_mode === 'instant' && currentAnswer && <div className="quiz-feedback-box"><strong>{String(currentAnswer) === String(currentQuestion.correct_answer ?? currentQuestion.answer ?? currentQuestion.expected_answer ?? '') ? '✓ Correct!' : '✕ Not quite'}</strong>{currentQuestion.explanation && <p>{currentQuestion.explanation}</p>}</div>}</div><div className="quiz-nav-row"><div className="quiz-question-dots">{visibleQuestions.map((_, index) => <button type="button" key={index} className={`quiz-dot ${index === currentIndex ? 'is-active' : ''} ${answers[visibleQuestions[index]?.id] !== undefined ? 'is-answered' : ''}`} onClick={() => goToQuestion(index)}>{index + 1}</button>)}</div><div className="admin-row-actions"><button type="button" onClick={() => goToQuestion(currentIndex - 1)} disabled={currentIndex === 0 || submitting}>Previous</button><button type="button" className="button" disabled={submitting} onClick={() => currentIndex === visibleQuestions.length - 1 ? setConfirmSubmit(true) : goToQuestion(currentIndex + 1)}>{currentIndex === visibleQuestions.length - 1 ? 'Submit Quiz' : 'Next Question →'}</button></div></div>{confirmSubmit && <div className="quiz-confirm-panel"><p>Submit your quiz? You have answered {answeredCount} of {visibleQuestions.length} questions.{visibleQuestions.length - answeredCount > 0 ? ` ${visibleQuestions.length - answeredCount} will be marked unanswered.` : ''}</p><div className="admin-row-actions"><button type="button" onClick={() => setConfirmSubmit(false)} disabled={submitting}>Continue Quiz</button><button type="button" className="button" disabled={submitting} onClick={() => handleQuizSubmit(false)}>{submitting ? 'Submitting…' : 'Submit Quiz'}</button></div></div>}</div></FeatureShell>
  }

  if (quizState === 'intro' && selectedQuiz) {
    return <FeatureShell active={active} setActive={setActive}><div className="quiz-shell"><button type="button" className="challenge-back" onClick={resetQuizSession}>← Back to Quizzes</button><div className="quiz-detail-panel"><span className="section-kicker">QUIZ INTRO</span><h1>{selectedQuiz.title}</h1><p>{selectedQuiz.description}</p>{selectedQuiz.pdf_url && <div className="quiz-pdf-card"><strong>Quiz PDF</strong><a href={selectedQuiz.pdf_url} target="_blank" rel="noreferrer">{selectedQuiz.pdf_name || 'Open quiz PDF'}</a></div>}<div className="quiz-meta-list"><span>{getQuizQuestionCount(visibleQuestions)} Questions</span><span>{selectedQuiz.difficulty || 'Beginner'}</span><span>+{selectedQuiz.xp_reward || 0} XP</span>{selectedQuiz.time_limit_seconds ? <span>Time: {formatTimeRemaining(Number(selectedQuiz.time_limit_seconds))}</span> : null}</div>{selectedQuiz.category && <span className="quiz-category">{selectedQuiz.category}</span>}<button type="button" className="button" onClick={beginQuiz}>Start Quiz</button></div></div></FeatureShell>
  }

  if (quizState === 'review' && selectedQuiz) {
    // Prefer the authoritative server review rows; fall back to the local
    // snapshot so the review ALWAYS renders — every question, answered or not.
    const reviewSource = reviewRows.length ? reviewRows : (result?.localReview || [])
    const normalizedReview = reviewSource.map((row) => {
      const selected = row.selected_option !== undefined && row.selected_option !== null
        ? row.selected_option
        : (row.selectedAnswer ?? null)
      const correct = row.correct_answer !== undefined && row.correct_answer !== null
        ? row.correct_answer
        : (row.correctAnswer ?? null)
      const isUnanswered = selected === null || selected === undefined || selected === ''
      const isCorrect = !isUnanswered && String(selected) === String(correct)
      return {
        question: row.question || row.question_text || 'Question',
        selected,
        correct,
        explanation: row.explanation || '',
        isUnanswered,
        isCorrect,
      }
    })
    const reviewCorrect = normalizedReview.filter((row) => row.isCorrect).length
    const reviewUnanswered = normalizedReview.filter((row) => row.isUnanswered).length
    const reviewWrong = Math.max(0, normalizedReview.length - reviewCorrect - reviewUnanswered)
    return <FeatureShell active={active} setActive={setActive}><div className="quiz-shell quiz-result-shell"><div className="quiz-result-card"><span className="section-kicker">ANSWER REVIEW</span><h1>{selectedQuiz.title}</h1><div className="quiz-score-badge">{reviewCorrect} / {normalizedReview.length}</div><div className="quiz-score-row"><strong>{normalizedReview.length ? Math.round((reviewCorrect / normalizedReview.length) * 100) : 0}%</strong><span>{reviewCorrect} correct · {reviewWrong} wrong · {reviewUnanswered} unanswered</span></div></div><div className="quiz-review-list">{normalizedReview.map((row, index) => <article className={`quiz-review-card ${row.isUnanswered ? 'quiz-review-unanswered' : row.isCorrect ? 'quiz-review-correct' : 'quiz-review-wrong'}`} key={`${row.question}-${index}`}><h3>Question {index + 1}</h3><p>{row.question}</p><div className="quiz-review-row"><span>Your answer:</span><strong className={row.isUnanswered ? 'quiz-answer-unanswered' : row.isCorrect ? 'quiz-answer-correct' : 'quiz-answer-wrong'}>{row.isUnanswered ? 'Not answered' : String(row.selected)}</strong></div><div className="quiz-review-row"><span>Correct answer:</span><strong className="quiz-answer-correct">{row.correct !== null && row.correct !== undefined ? String(row.correct) : 'Not available'}</strong></div><div className="quiz-review-status"><span className={row.isUnanswered ? 'quiz-answer-unanswered' : row.isCorrect ? 'quiz-answer-correct' : 'quiz-answer-wrong'}>{row.isUnanswered ? '— Unanswered' : row.isCorrect ? '✓ Correct' : '✕ Wrong'}</span></div>{row.explanation && <div className="quiz-review-explanation"><span>Explanation:</span><p>{row.explanation}</p></div>}</article>)}</div><div className="admin-row-actions">{result && <button type="button" className="button" onClick={() => setQuizState('result')}>Back to Results</button>}<button type="button" className="button" onClick={retakeQuiz}>Retry Quiz</button><button type="button" onClick={() => setQuizState('browse')}>Back to Quizzes</button></div></div></FeatureShell>
  }

  if (quizState === 'result' && result) {
    // All counts come from the single submission calculation (server-verified
    // when the attempt saved, local snapshot otherwise). Never blank.
    const correctCount = Number(result.correctAnswers || 0)
    const wrongCount = Number(result.wrongAnswers || 0)
    const unansweredCount = Number(result.unansweredQuestions || 0)
    const attemptedCount = Number(result.questionsAttempted ?? Math.max(0, result.totalQuestions - unansweredCount))
    return <FeatureShell active={active} setActive={setActive}><div className="quiz-shell quiz-result-shell"><div className="quiz-result-card"><span className="section-kicker">QUIZ COMPLETED</span><h1>{selectedQuiz?.title}</h1><div className="quiz-score-badge">{result.score} / {result.totalQuestions}</div><div className="quiz-score-row"><strong>{result.percentage}%</strong><span>{correctCount} correct · {wrongCount} wrong · {unansweredCount} unanswered</span></div><p className="quiz-result-xp">+{result.xpEarned} XP</p><div className="quiz-result-summary"><p>{result.totalQuestions} Questions</p><p>{attemptedCount} Attempted</p><p>{correctCount} Correct</p><p>{wrongCount} Wrong</p><p>{unansweredCount} Unanswered</p><p>Score: {result.percentage}%</p><p>XP Earned: +{result.xpEarned} XP</p></div>{result.timeUsed !== null && <p>Time used: {formatTimeRemaining(result.timeUsed)}</p>}{result.timedOut && <p>Submitted automatically — time ran out.</p>}{result.saveError && <p className="quiz-save-warning" role="alert">{result.saveError}</p>}<div className="admin-row-actions"><button type="button" className="button" onClick={() => setQuizState('review')}>Review Answers</button><button type="button" className="button" onClick={retakeQuiz}>Retry Quiz</button><button type="button" onClick={() => resetQuizSession()}>Back to Quizzes</button></div></div></div></FeatureShell>
  }

  return <FeatureShell active={active} setActive={setActive}><header className="learner-feature-heading"><span className="section-kicker">CHECK YOUR UNDERSTANDING</span><h1>CodeCraft Quizzes</h1><p>Test your knowledge, earn XP, and master your coding skills.</p></header>{error && <p className="learner-message" role="alert">{error}</p>}<section className="quiz-home-panel"><div className="quiz-filter-row"><label><span>Search</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search quizzes…" /></label><label><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{['All', ...quizCategoryOptions].map((value) => <option key={value}>{value}</option>)}</select></label><label><span>Difficulty</span><select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>{['All', ...quizDifficultyOptions].map((value) => <option key={value}>{value}</option>)}</select></label></div>{historyLoading ? <p className="learner-empty">Loading your quiz history…</p> : quizHistory.length ? <div className="quiz-progress-summary"><div><strong>{summaryCounts.completed}</strong><span>Quizzes completed</span></div><div><strong>{summaryCounts.averageScore}%</strong><span>Average score</span></div><div><strong>{summaryCounts.totalXp}</strong><span>Quiz XP</span></div><div><strong>{summaryCounts.bestScore}%</strong><span>Best score</span></div></div> : <p className="learner-empty">You haven't completed any quizzes yet.</p>}</section>{filteredQuizzes.length ? <div className="learner-feature-list">{filteredQuizzes.map((quiz) => <article className="learner-feature-item" key={quiz.id}><div className="feature-item-meta"><span>{quiz.category || 'General Programming'}</span><span>{quiz.difficulty || 'Beginner'}</span></div><h2>{quiz.title}</h2><p>{quiz.description}</p><div className="quiz-card-meta"><span>{getQuizQuestionCount(questionsByQuiz[quiz.id] || [])} Questions</span><span>+{quiz.xp_reward || 0} XP</span>{quiz.time_limit_seconds ? <span>{formatTimeRemaining(Number(quiz.time_limit_seconds))}</span> : null}</div><button type="button" className="button" onClick={() => startQuiz(quiz)}>Start Quiz</button></article>)}</div> : <p className="learner-empty">No quizzes found.</p>}<section className="quiz-history-panel"><header className="admin-panel-heading"><h2>Recent Quiz Activity</h2></header>{quizHistory.length ? <div className="admin-record-list">{quizHistory.slice(0, 6).map((attempt) => <div className="admin-record-row" key={attempt.id}><div><strong>{quizzes.find((quiz) => quiz.id === attempt.quiz_id)?.title || 'Quiz'}</strong><span>{attempt.percentage}% · +{attempt.xp_earned || 0} XP</span></div><time>{attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleDateString() : 'Recently'}</time></div>)}</div> : <p className="learner-empty">No quiz history yet.</p>}</section></FeatureShell>
}

export function CertificatesPage({ active, setActive }) {
  const { user } = useUser()
  const [certificates, setCertificates] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    if (user?.id) supabase.from('certificates').select('id,title,certificate_code,issued_at,metadata').eq('clerk_user_id', user.id).order('issued_at', { ascending: false }).then(({ data }) => {
      if (!cancelled) { setCertificates(data || []); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [user?.id])
  return <FeatureShell active={active} setActive={setActive}><header className="learner-feature-heading"><span className="section-kicker">ACHIEVEMENTS</span><h1>Certificates</h1><p>Certificates actually issued to your CodeCraft account.</p></header>{loading ? <p>Loading certificates…</p> : certificates.length ? <div className="learner-feature-list">{certificates.map((certificate) => <article className="learner-feature-item certificate-item" key={certificate.id}><span className="certificate-mark">CC</span><div><h2>{certificate.title}</h2><p>Issued {new Date(certificate.issued_at).toLocaleDateString()}</p><small>Certificate code: {certificate.certificate_code}</small></div></article>)}</div> : <p className="learner-empty">No certificates have been issued to this account yet.</p>}</FeatureShell>
}
