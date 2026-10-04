import { useEffect, useMemo, useState } from 'react'
import { UserButton } from '@clerk/clerk-react'
import { Sidebar } from '../App.jsx'
import CourseSearch from '../CourseSearch.jsx'
import AdminHeaderAction from '../AdminHeaderAction.jsx'
import { NotificationBell } from '../NotificationSystem.jsx'
import { RichText } from './RichText.jsx'
import {
  computeCourseProgress,
  computeSummary,
  getBadgeDefinition,
  getLessonState,
  isLessonUnlocked,
} from './progress.js'
import { useLearning } from './useLearning.js'
import { estimateLessonMinutes, formatMinutes, getModuleLessons, listEngineCourses } from '../courses/index.js'
import './learn.css'

const go = (path) => {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

const BOOKMARK_KEY = 'codecraft:bookmarked-courses:v1'

function readBookmarks() {
  try {
    return JSON.parse(window.localStorage.getItem(BOOKMARK_KEY) || '[]')
  } catch {
    return []
  }
}

function CurriculumModule({ course, module, moduleNumber, state, expanded, onToggle, onPick }) {
  const lessons = getModuleLessons(course, module)
  const progress = computeCourseProgress(course, state)
  const moduleCompleted = lessons.filter((lesson) => progress.completedIds.has(lesson.id)).length

  return (
    <section className={`overview-module ${expanded ? 'is-open' : ''}`} data-module-id={module.id}>
      <button type="button" className="overview-module__head" aria-expanded={expanded} onClick={onToggle}>
        <span className="overview-module__number">{String(moduleNumber).padStart(2, '0')}</span>
        <span className="overview-module__copy">
          <strong>{module.title}</strong>
          <small>{module.description}</small>
        </span>
        <span className="overview-module__stats">
          <strong>{moduleCompleted}/{lessons.length}</strong>
          <small>{formatMinutes(lessons.reduce((sum, lesson) => sum + estimateLessonMinutes(lesson), 0))}</small>
        </span>
        <span className="overview-module__chevron" aria-hidden="true">{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <ol className="overview-module__lessons">
          {lessons.map((lesson) => {
            const lessonState = getLessonState(state, course.id, lesson.id)
            const completed = Boolean(lessonState?.completedAt)
            const unlocked = isLessonUnlocked(course, lesson.id, state)
            const globalIndex = course.lessons.findIndex((entry) => entry.id === lesson.id) + 1
            return (
              <li key={lesson.id} className={completed ? 'is-done' : !unlocked ? 'is-locked' : ''}>
                <button type="button" onClick={() => onPick(lesson, unlocked)}>
                  <span className="overview-lesson__index" aria-hidden="true">{completed ? '✓' : globalIndex}</span>
                  <span className="overview-lesson__title">
                    <strong>{lesson.title}</strong>
                    <small>{estimateLessonMinutes(lesson)} min{!unlocked ? ' · Locked — finish the previous lesson first' : ''}</small>
                  </span>
                  <span className="overview-lesson__action">{completed ? 'Review' : unlocked ? 'Start' : '🔒'}</span>
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

export default function CourseOverview({ course, active, setActive }) {
  const { state } = useLearning()
  const [expanded, setExpanded] = useState([])
  const [bookmarked, setBookmarked] = useState(false)
  const [announcement, setAnnouncement] = useState('')

  const progress = useMemo(() => computeCourseProgress(course, state), [course, state])
  const summary = useMemo(() => computeSummary(state, listEngineCourses()), [state])

  useEffect(() => {
    setBookmarked(readBookmarks().includes(course.id))
    // Deep link from search: /learn/course/<id>?module=<moduleId>
    const requestedModuleId = new URLSearchParams(window.location.search).get('module')
    const isValidRequest = requestedModuleId && course.modules.some((module) => module.id === requestedModuleId)
    const moduleWithCurrent = course.modules.find((module) => progress.currentLessonId && module.lessonIds.includes(progress.currentLessonId))
    setExpanded(
      isValidRequest
        ? [requestedModuleId]
        : moduleWithCurrent
          ? [moduleWithCurrent.id]
          : course.modules.slice(0, 1).map((module) => module.id),
    )
    if (isValidRequest) {
      requestAnimationFrame(() => {
        document.querySelector(`[data-module-id="${requestedModuleId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course.id])

  const toggleBookmark = () => {
    const current = readBookmarks()
    const next = bookmarked ? current.filter((id) => id !== course.id) : [...current, course.id]
    try {
      window.localStorage.setItem(BOOKMARK_KEY, JSON.stringify(next))
    } catch {
      // storage unavailable — keep the in-memory state
    }
    setBookmarked(!bookmarked)
    setAnnouncement(bookmarked ? 'Removed from your saved courses.' : 'Saved to your courses.')
    setTimeout(() => setAnnouncement(''), 2500)
  }

  const handlePick = (lesson, unlocked) => {
    if (!unlocked) {
      const index = course.lessons.findIndex((entry) => entry.id === lesson.id)
      const blocker = course.lessons[index - 1]
      setAnnouncement(`Finish “${blocker.title}” first — it takes about ${estimateLessonMinutes(blocker)} minutes.`)
      setTimeout(() => setAnnouncement(''), 3500)
      return
    }
    go(`/learn/course/${course.id}/lesson/${lesson.id}`)
  }

  const continueLesson = progress.currentLesson

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

        <div className="dashboard-content learn-overview">
          <nav className="learn-breadcrumb" aria-label="Breadcrumb">
            <button type="button" onClick={() => go('/learn')}>Learn</button>
            <span aria-hidden="true">/</span>
            <span>{course.language} Development</span>
            <span aria-hidden="true">/</span>
            <strong>{course.title}</strong>
          </nav>

          <header className="course-hero">
            <div className="course-hero__main">
              <span className="course-hero__icon" style={{ background: course.color }} aria-hidden="true">{course.icon}</span>
              <div className="course-hero__copy">
                <div className="course-hero__badges">
                  <span className="pill pill--level">{course.difficulty}</span>
                  <span className="pill">{course.lessons.length} lessons</span>
                  <span className="pill">{formatMinutes(course.estimatedMinutes)}</span>
                  {progress.completed > 0 && <span className="pill pill--done">Completed</span>}
                </div>
                <h1>{course.title}</h1>
                <RichText text={course.description} as="p" />
                <div className="course-hero__actions">
                  <button
                    type="button"
                    className="learn-btn learn-btn--primary learn-btn--lg"
                    onClick={() => go(continueLesson ? `/learn/course/${course.id}/lesson/${continueLesson.id}` : `/learn/course/${course.id}/lesson/${course.lessons[0].id}`)}
                  >
                    {progress.completedLessons > 0 ? 'Continue Learning' : progress.enrolled ? 'Resume Course' : 'Start Course'} →
                  </button>
                  <button
                    type="button"
                    className={`learn-btn learn-btn--lg ${bookmarked ? 'is-active' : ''}`}
                    aria-pressed={bookmarked}
                    onClick={toggleBookmark}
                  >
                    {bookmarked ? '★ Saved' : '☆ Save course'}
                  </button>
                </div>
                {announcement && <p className="course-hero__note" role="status">{announcement}</p>}
              </div>
            </div>

            <div className="course-progress-card">
              <span className="section-kicker">YOUR PROGRESS</span>
              <div className="course-progress-card__ring" style={{ '--pct': `${progress.percentage}%` }}>
                <strong>{progress.percentage}%</strong>
                <span>complete</span>
              </div>
              <ul className="course-progress-card__stats">
                <li><span>Completed lessons</span><strong>{progress.completedLessons} / {progress.totalLessons}</strong></li>
                <li><span>Modules finished</span><strong>{progress.completedModules} / {progress.totalModules}</strong></li>
                <li><span>Estimated time left</span><strong>{progress.remainingMinutes ? formatMinutes(progress.remainingMinutes) : '—'}</strong></li>
                <li>
                  <span>Current lesson</span>
                  <strong>{continueLesson ? continueLesson.title : progress.completed ? 'All done 🎉' : 'Not started'}</strong>
                </li>
              </ul>
              <div className="course-progress-card__bar"><span style={{ width: `${progress.percentage}%` }} /></div>
            </div>
          </header>

          <section className="course-outcomes">
            <span className="section-kicker">WHAT YOU WILL LEARN</span>
            <ul>
              {course.outcomes.map((outcome, index) => <li key={index}><RichText text={outcome} /></li>)}
            </ul>
          </section>

          <section className="course-rewards" aria-label="Your rewards">
            <div className="course-rewards__points">
              <strong>{summary.points}</strong>
              <span>points earned</span>
            </div>
            <div className="course-rewards__badges">
              {summary.badges.length === 0 ? (
                <p>Earn your first badge by completing a lesson.</p>
              ) : (
                summary.badges.map((badge) => {
                  const definition = getBadgeDefinition(badge.id) || badge
                  return (
                    <span className="reward-badge" key={badge.id} title={definition.description || ''}>
                      <span aria-hidden="true">{definition.icon || '🏅'}</span> {definition.title || badge.id}
                    </span>
                  )
                })
              )}
            </div>
            <div className="course-rewards__streak">
              <strong>{summary.streak.current}</strong>
              <span>day streak</span>
            </div>
          </section>

          <section className="course-curriculum">
            <header className="section-header">
              <div>
                <span className="section-kicker">CURRICULUM</span>
                <h2>{course.modules.length} modules · {course.lessons.length} lessons</h2>
                <p>Lessons unlock one after another so you always know what to study next.</p>
              </div>
              <button
                type="button"
                className="section-link"
                onClick={() => setExpanded((current) => (current.length === course.modules.length ? [] : course.modules.map((module) => module.id)))}
              >
                {expanded.length === course.modules.length ? 'Collapse all' : 'Expand all'} →
              </button>
            </header>

            <div className="overview-modules">
              {course.modules.map((module, index) => (
                <CurriculumModule
                  key={module.id}
                  course={course}
                  module={module}
                  moduleNumber={index + 1}
                  state={state}
                  expanded={expanded.includes(module.id)}
                  onToggle={() => setExpanded((current) => (current.includes(module.id) ? current.filter((id) => id !== module.id) : [...current, module.id]))}
                  onPick={handlePick}
                />
              ))}
            </div>
          </section>

          <section className="course-cta">
            <div>
              <span className="section-kicker">READY WHEN YOU ARE</span>
              <h2>{continueLesson ? `Next up: ${continueLesson.title}` : 'Start your first lesson'}</h2>
              <p>{continueLesson ? 'Your progress is saved automatically on this device and to your CodeCraft account.' : 'Four modules of fundamentals, then a final assessment.'}</p>
            </div>
            <button
              type="button"
              className="learn-btn learn-btn--primary learn-btn--lg"
              onClick={() => go(continueLesson ? `/learn/course/${course.id}/lesson/${continueLesson.id}` : `/learn/course/${course.id}/lesson/${course.lessons[0].id}`)}
            >
              {continueLesson ? 'Resume lesson →' : 'Begin course →'}
            </button>
          </section>
        </div>
      </div>
    </main>
  )
}
