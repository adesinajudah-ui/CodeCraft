import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { UserButton, useUser } from '@clerk/clerk-react'
import { ArrowLeft, Check, ChevronRight, Code2, Search, Trophy } from 'lucide-react'
import CourseSearch from './CourseSearch'
import { supabase } from './lib/supabase'
import { NotificationBell } from './NotificationSystem'
import MobileNavigation from './MobileNavigation'
import './challenge-system.css'
import './challenge-project-submission.css'

const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced']
const leaderboardPeriods = [
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'all_time', label: 'All Time' },
]
const levelXp = 500
export const ChallengeSidebarContext = createContext(null)

function ChallengeShell({ active, setActive, children }) {
  const MainSidebar = useContext(ChallengeSidebarContext)
  const items = [
    ['/', 'Home'],
    ['/learn', 'Learn'],
    ['/code-editor', 'Code Editor'],
    ['/dashboard', 'Community'],
    ['/challenges', 'Challenges'],
    ['/quizzes', 'Quizzes'],
    ['/certificates', 'Certificates'],
    ['/profile', 'Profile'],
  ]
  const mobileItems = items.map(([route, label]) => ({
    id: route,
    label,
    isActive: active === (route.slice(1) || 'home'),
    onSelect: () => {
      setActive(route.slice(1) || 'home')
      window.history.pushState({}, '', route)
      window.dispatchEvent(new PopStateEvent('popstate'))
    },
  }))
  return <main className="dashboard-shell challenge-app-shell">{MainSidebar ? <MainSidebar active={active} setActive={setActive} /> : <><aside className="sidebar challenge-sidebar"><strong className="challenge-sidebar-brand">CodeCraft</strong><nav className="sidebar-nav" aria-label="Main navigation">{items.map(([route, label]) => <button type="button" key={route} className={`sidebar-nav-item ${active === (route.slice(1) || 'home') ? 'active' : ''}`} onClick={() => { setActive(route.slice(1) || 'home'); window.history.pushState({}, '', route); window.dispatchEvent(new PopStateEvent('popstate')) }}><span>{label}</span></button>)}</nav></aside><MobileNavigation items={mobileItems} /></>}<div className="dashboard-main"><header className="dashboard-header challenge-header"><span className="challenge-header-title">CodeCraft Challenges</span><CourseSearch className="global-header-search" /><div className="profile-actions"><NotificationBell /><UserButton afterSignOutUrl="/" /></div></header><div className="challenge-page-content">{children}</div></div></main>
}

function DifficultyBadge({ difficulty }) {
  const tone = (difficulty || 'Beginner').toLowerCase()
  return <span className={`challenge-difficulty ${tone}`}>{difficulty || 'Beginner'}</span>
}

function LanguageBadge({ language }) {
  return <span className="challenge-language">{(language || 'JavaScript').toUpperCase()}</span>
}

function Leaderboard({ period, onPeriodChange, rows, loading }) {
  if (loading === 'error') return <section className="challenge-panel challenge-leaderboard"><header className="challenge-section-heading"><div><span className="section-kicker">COMMUNITY RANKING</span><h2><Trophy size={19} aria-hidden="true" /> Leaderboard</h2></div></header><p className="challenge-empty">Leaderboard data is currently unavailable. Please retry later.</p></section>
  return <section className="challenge-panel challenge-leaderboard"><header className="challenge-section-heading"><div><span className="section-kicker">COMMUNITY RANKING</span><h2><Trophy size={19} aria-hidden="true" /> Leaderboard</h2></div><div className="challenge-period-tabs" role="tablist" aria-label="Leaderboard period">{leaderboardPeriods.map((entry) => <button type="button" role="tab" aria-selected={period === entry.id} className={period === entry.id ? 'is-active' : ''} key={entry.id} onClick={() => onPeriodChange(entry.id)}>{entry.label}</button>)}</div></header>{loading ? <p className="challenge-empty">Loading leaderboard…</p> : rows.length ? <ol className="challenge-leaderboard-list">{rows.map((row) => <li className={row.is_current_user ? 'is-current-user' : ''} key={`${row.rank}-${row.username}`}><span className="leaderboard-rank">{row.rank}</span><span className="leaderboard-avatar">{(row.username || 'C').slice(0, 1).toUpperCase()}</span><strong>{row.username || 'CodeCraft learner'}{row.is_current_user && <small>You</small>}</strong><span className="leaderboard-xp">{row.xp} XP</span></li>)}</ol> : <p className="challenge-empty">No challenge XP has been earned in this period yet.</p>}</section>
}

function ChallengeCard({ challenge, completed, locked, attempts, onStart }) {
  return <article className={`challenge-card ${locked ? 'is-locked' : ''}`}><div className="challenge-card-icon"><Code2 size={20} aria-hidden="true" /></div><div className="challenge-card-content"><div className="challenge-card-meta"><DifficultyBadge difficulty={challenge.difficulty} /><LanguageBadge language={challenge.language} />{completed && <span className="challenge-completed-chip"><Check size={13} /> Completed</span>}</div><h2>{challenge.title}</h2><p>{challenge.description}</p><div className="challenge-card-footer"><span className="challenge-xp">+{challenge.xp_reward} XP</span><span>{attempts} {attempts === 1 ? 'attempt' : 'attempts'}</span><button type="button" className="button button-small" disabled={locked} onClick={onStart}>{locked ? 'Locked' : 'View Challenge'}<ChevronRight size={15} /></button></div>{locked && <p className="challenge-lock-copy">Complete “{challenge.prerequisite_title}” to unlock this challenge.</p>}</div></article>
}

export function UpcomingChallenges() {
  const [challenges, setChallenges] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    supabase.from('challenges').select('id,title,description,difficulty,xp_reward,position').eq('published', true).order('position').limit(3).then(({ data }) => {
      if (!cancelled) {
        setChallenges(data || [])
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [])
  const openChallenge = (challenge) => {
    window.history.pushState({}, '', `/challenges?search=${encodeURIComponent(challenge.title)}`)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }
  if (loading) return <p className="challenge-home-empty">Loading published challenges…</p>
  if (!challenges.length) return <p className="challenge-home-empty">No published challenges yet.</p>
  return <div className="challenge-list">{challenges.map((challenge) => <button type="button" className="challenge-item" key={challenge.id} onClick={() => openChallenge(challenge)}><span className="challenge-icon"><Code2 size={17} aria-hidden="true" /></span><span><strong>{challenge.title}</strong><small>{challenge.difficulty} · +{challenge.xp_reward} XP</small></span><span className="card-arrow"><ChevronRight size={16} aria-hidden="true" /></span></button>)}</div>
}

export function ChallengesPage({ active, setActive }) {
  const { user } = useUser()
  const [challenges, setChallenges] = useState([])
  const [completions, setCompletions] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [progress, setProgress] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('all_time')
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [submissionFilter, setSubmissionFilter] = useState('All')
  const [submissionReviewMigrationRequired, setSubmissionReviewMigrationRequired] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get('search') || '')
  const [difficulty, setDifficulty] = useState('All')
  const [language, setLanguage] = useState('All')
  const [status, setStatus] = useState('All')
  const [activeChallenge, setActiveChallenge] = useState(null)
  const [challengeStarted, setChallengeStarted] = useState(false)
  const [projectPickerOpen, setProjectPickerOpen] = useState(false)
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [projectsLoaded, setProjectsLoaded] = useState(false)
  const [projectsError, setProjectsError] = useState('')
  const [editorProjects, setEditorProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [submissionBusy, setSubmissionBusy] = useState(false)
  const [submissionError, setSubmissionError] = useState('')
  const [submissionResult, setSubmissionResult] = useState(null)
  const [officialSolution, setOfficialSolution] = useState('')
  const [solutionError, setSolutionError] = useState('')

  const refresh = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setLoadError('')

    const loadUserSubmissions = async () => {
      const reviewedSubmissions = await supabase.from('challenge_submissions')
        .select('id,challenge_id,status,score,review_score,review_decision,submitted_at,passed')
        .eq('clerk_user_id', user.id)
        .order('submitted_at', { ascending: false })

      if (!reviewedSubmissions.error) return { ...reviewedSubmissions, reviewMigrationRequired: false }
      if (!/review_score|review_decision|schema cache/i.test(reviewedSubmissions.error.message || '')) {
        return { ...reviewedSubmissions, reviewMigrationRequired: false }
      }

      const legacySubmissions = await supabase.from('challenge_submissions')
        .select('id,challenge_id,status,score,submitted_at,passed')
        .eq('clerk_user_id', user.id)
        .order('submitted_at', { ascending: false })

      return {
        ...legacySubmissions,
        data: (legacySubmissions.data || []).map((submission) => ({
          ...submission,
          review_score: null,
          review_decision: 'pending',
        })),
        reviewMigrationRequired: true,
      }
    }

    const [challengeResult, completionResult, submissionResult, progressResult] = await Promise.all([
      supabase.from('challenges').select('id,slug,title,description,instructions,difficulty,language,starter_code,xp_reward,category,examples,requirements,position,prerequisite_challenge_id').eq('published', true).order('position'),
      supabase.from('challenge_completions').select('id,challenge_id,challenge_title,xp_awarded,score,completed_at').eq('clerk_user_id', user.id).order('completed_at', { ascending: false }),
      loadUserSubmissions(),
      supabase.from('challenge_progress').select('xp,level,completed_challenges,current_streak,last_activity_date').eq('clerk_user_id', user.id).maybeSingle(),
    ])
    const failures = [
      challengeResult.error,
      completionResult.error,
      submissionResult.error,
      progressResult.error,
    ].filter(Boolean)
    if (failures.length) {
      console.error('Challenge data load failed:', failures)
      const missingSchema = failures.some((failure) =>
        ['PGRST204', 'PGRST205', '42P01', '42703'].includes(failure.code)
        || /schema cache|does not exist|could not find/i.test(failure.message || ''),
      )
      const denied = failures.some((failure) => failure.code === '42501')
      setLoadError(missingSchema
        ? 'Challenge database setup is incomplete. Ask an administrator to apply Supabase migrations 008 and 009, then retry.'
        : denied
          ? 'Your account could not access challenge data. Ask an administrator to check Supabase access policies.'
          : 'Challenge data is temporarily unavailable. Please retry in a moment.')
    }
    const completionRows = completionResult.data || []
    const challengeRows = (challengeResult.data || []).map((challenge) => ({
      ...challenge,
      prerequisite_title: challengeResult.data.find((entry) => entry.id === challenge.prerequisite_challenge_id)?.title || 'the prerequisite challenge',
    }))
    setChallenges(challengeRows)
    setCompletions(completionRows)
    setSubmissions(submissionResult.data || [])
    setSubmissionReviewMigrationRequired(Boolean(submissionResult.reviewMigrationRequired))
    setProgress(progressResult.data || null)
    setLoading(false)
  }, [user])

  useEffect(() => { if (user?.id) refresh() }, [user?.id, refresh])

  useEffect(() => {
    if (!user?.id) return undefined
    const refreshOnFocus = () => refresh()
    window.addEventListener('focus', refreshOnFocus)
    return () => window.removeEventListener('focus', refreshOnFocus)
  }, [user?.id, refresh])

  const loadLeaderboard = useCallback(async (period) => {
    setLeaderboardLoading(true)
    const { data, error } = await supabase.rpc('get_codecraft_challenge_leaderboard', { p_period: period })
    setLeaderboard(error ? [] : data || [])
    setLeaderboardLoading(error ? 'error' : false)
  }, [])

  useEffect(() => { loadLeaderboard(leaderboardPeriod) }, [leaderboardPeriod, loadLeaderboard])

  const completedIds = useMemo(() => new Set(completions.map((entry) => entry.challenge_id).filter(Boolean)), [completions])
  const languages = useMemo(() => ['All', ...new Set(challenges.map((entry) => entry.language).filter(Boolean))], [challenges])
  const attemptsByChallenge = useMemo(() => submissions.reduce((result, submission) => {
    result[submission.challenge_id] = (result[submission.challenge_id] || 0) + 1
    return result
  }, {}), [submissions])
  const filteredChallenges = useMemo(() => challenges.filter((challenge) => {
    const matchesText = `${challenge.title} ${challenge.description} ${challenge.category}`.toLowerCase().includes(search.trim().toLowerCase())
    const matchesDifficulty = difficulty === 'All' || challenge.difficulty === difficulty
    const matchesLanguage = language === 'All' || challenge.language === language
    const isCompleted = completedIds.has(challenge.id)
    const matchesStatus = status === 'All' || (status === 'Completed' && isCompleted) || (status === 'In Progress' && !isCompleted && Boolean(attemptsByChallenge[challenge.id])) || (status === 'Not Started' && !isCompleted && !attemptsByChallenge[challenge.id])
    return matchesText && matchesDifficulty && matchesLanguage && matchesStatus
  }), [challenges, search, difficulty, language, status, completedIds, attemptsByChallenge])

  const openChallenge = (challenge) => {
    setActiveChallenge(challenge)
    setChallengeStarted(false)
    setProjectPickerOpen(false)
    setProjectsLoaded(false)
    setEditorProjects([])
    setSelectedProject(null)
    setSubmissionResult(null)
    setSubmissionError('')
    setOfficialSolution('')
    setSolutionError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const startChallenge = openChallenge

  const loadEditorProjects = async () => {
    if (!user?.id) return
    setProjectPickerOpen(true)
    setProjectsError('')
    if (projectsLoaded) return
    setProjectsLoading(true)
    try {
      const projectQuery = supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false })

      const { data: projectRows, error: projectError } = await projectQuery
      if (projectError) throw projectError

      const userProjectRows = (projectRows || []).filter((project) => {
        const owner = project.clerk_user_id || project.user_id
        return owner === user.id
      })

      let fileRows = []
      if (userProjectRows.length) {
        const fileQuery = supabase
          .from('project_files')
          .select('*')
          .in('project_id', userProjectRows.map((project) => project.id))
          .order('created_at', { ascending: true })

        const { data, error } = await fileQuery
        if (error) throw error

        fileRows = (data || []).filter((file) => {
          const owner = file.clerk_user_id || file.user_id
          return owner === user.id || !owner
        })
      }

      const normalizedProjects = (userProjectRows || []).map((project) => ({
        ...project,
        title: project.title || project.name || 'Untitled project',
        files: fileRows.filter((file) => file.project_id === project.id),
      }))

      setEditorProjects(normalizedProjects)
      setProjectsLoaded(true)
      if (!normalizedProjects.length) {
        setProjectsError('No Code Editor projects were found for your account yet. Create one in the editor and try again.')
      }
    } catch (error) {
      console.error('Could not load Code Editor projects for challenge submission:', error)
      setProjectsError('Your Code Editor projects could not be loaded. Please retry.')
    } finally {
      setProjectsLoading(false)
    }
  }

  const submitSelectedProject = async () => {
    if (!activeChallenge || !selectedProject || !user?.id || submissionBusy) return
    setSubmissionBusy(true)
    setSubmissionError('')
    try {
      const { data, error } = await supabase.rpc('submit_codecraft_project_challenge', {
        p_challenge_id: activeChallenge.id,
        p_project_id: selectedProject.id,
      })
      if (error) throw error
      if (!data?.submission_id) throw new Error('Submission confirmation was missing.')
      setSubmissionResult(data)
      await refresh()
    } catch (error) {
      console.error('Challenge project submission failed:', error)
      const message = error?.message || 'Unknown submission error.'
      setSubmissionError(error.code === 'PGRST202' || /submit_codecraft_project_challenge|schema cache/i.test(message)
        ? 'Project submissions are not enabled yet. Ask an administrator to apply Supabase migration 009.'
        : `Your project could not be submitted. Please retry. ${message}`)
    } finally {
      setSubmissionBusy(false)
    }
  }

  const showOfficialSolution = async () => {
    if (!activeChallenge) return
    setSolutionError('')
    const { data, error } = await supabase.rpc('get_codecraft_challenge_solution', { p_challenge_id: activeChallenge.id })
    if (error) setSolutionError(completions.some((item) => item.challenge_id === activeChallenge.id) ? 'The official solution is not available yet.' : 'Complete this challenge before viewing its solution.')
    else if (!data) setSolutionError('No official solution has been added for this challenge yet.')
    else setOfficialSolution(data)
  }

  const submissionStats = useMemo(() => {
    const latestSubmissionByChallenge = new Map()
    const acceptedChallengeIds = new Set()

    submissions.forEach((submission) => {
      if (!submission.challenge_id) return
      if (!latestSubmissionByChallenge.has(submission.challenge_id)) {
        latestSubmissionByChallenge.set(submission.challenge_id, submission)
      }
      if (submission.review_decision === 'accepted') acceptedChallengeIds.add(submission.challenge_id)
    })

    const inProgress = [...latestSubmissionByChallenge.entries()].filter(([challengeId, submission]) =>
      !acceptedChallengeIds.has(challengeId) && submission.review_decision === 'pending',
    ).length

    return {
      participated: latestSubmissionByChallenge.size,
      completed: acceptedChallengeIds.size,
      inProgress,
    }
  }, [submissions])
  const inProgressCount = submissionStats.inProgress
  const maxXpForLevel = (progress?.level || 1) * levelXp
  const currentLevelFloor = ((progress?.level || 1) - 1) * levelXp
  const levelPercent = progress ? Math.min(100, Math.round(((progress.xp - currentLevelFloor) / (maxXpForLevel - currentLevelFloor)) * 100)) : 0
  const challengeTitles = new Map(challenges.map((challenge) => [challenge.id, challenge.title]))
  const visibleSubmissions = submissions.filter((submission) => submissionFilter === 'All' || submission.review_decision === submissionFilter.toLowerCase())
  const recentItems = [
    ...completions.map((entry) => ({ id: `completion-${entry.id}`, title: entry.challenge_title, status: 'Completed', xp: entry.xp_awarded, created_at: entry.completed_at })),
    ...submissions.filter((entry) => !entry.passed && entry.review_decision !== 'accepted').map((entry) => ({ id: `submission-${entry.id}`, title: challengeTitles.get(entry.challenge_id) || 'Challenge', status: entry.review_decision === 'declined' ? 'Declined' : 'In Progress', xp: 0, created_at: entry.submitted_at })),
  ].sort((first, second) => new Date(second.created_at) - new Date(first.created_at)).slice(0, 6)

  if (activeChallenge) {
    const challengeCompleted = completedIds.has(activeChallenge.id)
    return <ChallengeShell active={active} setActive={setActive}>
      <button type="button" className="challenge-back" onClick={() => setActiveChallenge(null)}><ArrowLeft size={16} /> Back to Challenges</button>
      <header className="challenge-workspace-heading">
        <div>
          <div className="challenge-card-meta"><DifficultyBadge difficulty={activeChallenge.difficulty} /><LanguageBadge language={activeChallenge.language} /><span className="challenge-xp">+{activeChallenge.xp_reward} XP</span></div>
          <h1>{activeChallenge.title}</h1>
          <p>{activeChallenge.description}</p>
        </div>
        <span className="challenge-attempt-count">{attemptsByChallenge[activeChallenge.id] || 0} submissions</span>
      </header>
      <div className="challenge-workspace-grid">
        <section className="challenge-panel challenge-instructions">
          <span className="section-kicker">CHALLENGE BRIEF</span>
          <h2>Instructions</h2>
          <div className="challenge-instruction-block"><h3>Task</h3><p>{activeChallenge.instructions || activeChallenge.description}</p></div>
          {Array.isArray(activeChallenge.requirements) && activeChallenge.requirements.length > 0 && <div className="challenge-instruction-block"><h3>Requirements</h3><ul>{activeChallenge.requirements.map((requirement, index) => <li key={`${index}-${requirement}`}>{requirement}</li>)}</ul></div>}
          {Array.isArray(activeChallenge.examples) && activeChallenge.examples.length > 0 && <div className="challenge-instruction-block"><h3>Examples</h3>{activeChallenge.examples.map((example, index) => <pre key={index}><code>{example.input}{'\n'}// {example.output}</code></pre>)}</div>}
        </section>
        <section className="challenge-panel challenge-project-submission">
          <span className="section-kicker">CODE EDITOR PROJECT</span>
          <h2>{challengeStarted ? 'Submit your project' : 'Ready to begin?'}</h2>
          {!challengeStarted ? <><p>Choose a project from your CodeCraft Editor to submit for this challenge.</p><button type="button" className="button" onClick={() => setChallengeStarted(true)}>Start Challenge <ChevronRight size={15} /></button></> : submissionResult ? <div className="challenge-submit-success" role="status"><Check size={22} /><div><strong>✓ Solution submitted successfully</strong><span>{submissionResult.project_name} · {new Date(submissionResult.submitted_at).toLocaleString()}</span></div><button type="button" className="challenge-run-button" onClick={() => setActiveChallenge(null)}>Back to Challenges</button></div> : <>
            <button type="button" className="challenge-run-button challenge-upload-project" onClick={loadEditorProjects} disabled={projectsLoading}><Code2 size={16} />{projectsLoading ? 'Loading your projects…' : 'Upload from your Code Editor'}</button>
            {projectsError && <p className="challenge-load-error" role="alert">{projectsError} <button type="button" onClick={loadEditorProjects}>Retry</button></p>}
            {projectPickerOpen && !projectsError && (projectsLoading ? <p className="challenge-empty">Loading your Code Editor projects…</p> : editorProjects.length ? <div className="challenge-project-picker" role="radiogroup" aria-label="Choose a Code Editor project">{editorProjects.map((project) => <button type="button" role="radio" aria-checked={selectedProject?.id === project.id} className={`challenge-project-option ${selectedProject?.id === project.id ? 'is-selected' : ''}`} key={project.id} onClick={() => { setSelectedProject(project); setSubmissionError('') }}><span className="challenge-project-option-heading"><strong>{project.title}</strong><span>{project.language || 'Project'}</span></span><span>{project.files.length} {project.files.length === 1 ? 'file' : 'files'} · Updated {new Date(project.updated_at).toLocaleDateString()}</span>{project.description && <small>{project.description}</small>}</button>)}</div> : <p className="challenge-empty">No Code Editor projects found. Create a project in Code Editor first.</p>)}
            {selectedProject && <div className="challenge-selected-project"><span className="section-kicker">SELECTED PROJECT</span><strong>{selectedProject.title}</strong><span>{selectedProject.language || 'Project'} · {selectedProject.files.length} {selectedProject.files.length === 1 ? 'file' : 'files'}</span>{selectedProject.description && <p>{selectedProject.description}</p>}<button type="button" className="button" onClick={submitSelectedProject} disabled={submissionBusy}>{submissionBusy ? 'Submitting…' : 'Submit Solution'}</button></div>}
            {submissionError && <p className="challenge-load-error" role="alert">{submissionError}</p>}
          </>}
          {challengeCompleted && <div className="challenge-solution-access"><button type="button" className="challenge-run-button" onClick={showOfficialSolution}>View Official Solution</button>{solutionError && <p role="alert">{solutionError}</p>}{officialSolution && <pre className="challenge-official-solution"><code>{officialSolution}</code></pre>}</div>}
        </section>
      </div>
    </ChallengeShell>
  }

  return <ChallengeShell active={active} setActive={setActive}><header className="challenge-page-heading"><span className="section-kicker">PRACTICE BY BUILDING</span><h1>Coding Challenges</h1><p>Sharpen your skills with hands-on coding challenges. Solve problems, earn points, and level up!</p></header>{loadError && <div className="challenge-load-error" role="alert">{loadError}<button type="button" onClick={refresh}>Retry</button></div>}<section className="challenge-progress-layout"><article className="challenge-panel challenge-progress-panel"><header className="challenge-section-heading"><div><span className="section-kicker">YOUR JOURNEY</span><h2>My Challenge Progress</h2></div><span className="challenge-level">Level {progress?.level || 1}</span></header><div className="challenge-xp-summary"><strong>{progress?.xp || 0}</strong><span>total XP</span></div><div className="challenge-level-progress"><div><span>Level {progress?.level || 1}</span><span>{progress?.xp || 0} / {maxXpForLevel} XP</span></div><div className="challenge-progress-track"><i style={{ width: `${levelPercent}%` }} /></div></div><div className="challenge-progress-stats"><div><strong>{submissionStats.completed}</strong><span>Completed</span></div><div><strong>{inProgressCount}</strong><span>In Progress</span></div><div><strong>{submissionStats.participated}</strong><span>Total Challenges</span></div></div></article><section className="challenge-panel challenge-recent-panel"><header className="challenge-section-heading"><div><span className="section-kicker">YOUR RECENT WORK</span><h2>Recent Activity</h2></div></header>{recentItems.length ? <ol className="challenge-activity-list">{recentItems.map((item) => <li key={item.id}><span className={`challenge-activity-icon ${item.status === 'Completed' ? 'is-done' : ''}`}>{item.status === 'Completed' ? <Check size={15} /> : <Code2 size={15} />}</span><div><strong>{item.title}</strong><span>{item.status} · {new Date(item.created_at).toLocaleDateString()}</span></div>{item.xp > 0 && <b>+{item.xp} XP</b>}</li>)}</ol> : <p className="challenge-empty">No recent challenge activity.</p>}</section></section><section className="challenge-panel challenge-submission-history"><header className="challenge-section-heading"><div><span className="section-kicker">YOUR CHALLENGE WORK</span><h2>Challenge Submissions</h2></div><label><span>Show</span><select aria-label="Filter challenge submissions" value={submissionFilter} onChange={(event) => setSubmissionFilter(event.target.value)}>{['All', 'Accepted', 'Declined'].map((value) => <option key={value}>{value}</option>)}</select></label></header>{submissionReviewMigrationRequired && <p className="challenge-load-error" role="status">Review decisions require Supabase migration 010. Pending submissions remain visible.</p>}{loading ? <p className="challenge-empty">Loading submissions…</p> : visibleSubmissions.length ? <ol className="challenge-activity-list">{visibleSubmissions.map((submission) => { const decision = submission.review_decision || 'pending'; const score = submission.review_score ?? (submission.status === 'submitted' ? null : submission.score); return <li key={submission.id}><span className={`challenge-activity-icon ${decision === 'accepted' ? 'is-done' : ''}`}>{decision === 'accepted' ? <Check size={15} /> : <Code2 size={15} />}</span><div><strong>{challengeTitles.get(submission.challenge_id) || 'Challenge'}</strong><span>{decision[0].toUpperCase() + decision.slice(1)} · {new Date(submission.submitted_at).toLocaleDateString()}</span></div><b>{score == null ? 'Not scored' : `${score}%`}</b></li> })}</ol> : <p className="challenge-empty">{submissions.length ? `No ${submissionFilter.toLowerCase()} submissions yet.` : 'You have not submitted a challenge yet.'}</p>}</section><section className="challenge-list-section"><header className="challenge-section-heading"><div><span className="section-kicker">THE PRACTICE SET</span><h2>Find a Challenge</h2></div><span className="challenge-count">{filteredChallenges.length} challenges</span></header><div className="challenge-filters"><label className="challenge-search"><Search size={17} /><input aria-label="Search challenges" placeholder="Search challenges..." value={search} onChange={(event) => setSearch(event.target.value)} /></label><label><span>Difficulty</span><select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>{difficulties.map((value) => <option key={value}>{value}</option>)}</select></label><label><span>Language</span><select value={language} onChange={(event) => setLanguage(event.target.value)}>{languages.map((value) => <option key={value}>{value}</option>)}</select></label><label><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value)}>{['All', 'Not Started', 'In Progress', 'Completed'].map((value) => <option key={value}>{value}</option>)}</select></label></div>{loading ? <p className="challenge-empty">Loading challenges…</p> : filteredChallenges.length ? <div className="challenge-card-list">{filteredChallenges.map((challenge) => { const completed = completedIds.has(challenge.id); const locked = Boolean(challenge.prerequisite_challenge_id && !completedIds.has(challenge.prerequisite_challenge_id)); return <ChallengeCard key={challenge.id} challenge={challenge} completed={completed} locked={locked} attempts={attemptsByChallenge[challenge.id] || 0} onStart={() => startChallenge(challenge)} /> })}</div> : <div className="challenge-empty-block"><Code2 size={25} /><h3>No challenges found</h3><p>Try a different search or adjust your filters.</p></div>}</section><Leaderboard period={leaderboardPeriod} onPeriodChange={setLeaderboardPeriod} rows={leaderboard} currentUserId={user?.id} loading={leaderboardLoading} /></ChallengeShell>
}
