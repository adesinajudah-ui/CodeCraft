import { useId, useMemo, useState } from 'react'
import { courseCatalog } from './course-search-data'
import { searchLearningEngine } from './courses/index.js'

export default function CourseSearch({ className = '', initialQuery = '' }) {
  const resultsId = `course-search-results-${useId().replaceAll(':', '')}`
  const [query, setQuery] = useState(initialQuery)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const normalizedQuery = query.trim().toLowerCase()
  const engineResults = useMemo(
    () => (normalizedQuery ? searchLearningEngine(normalizedQuery, 4) : []),
    [normalizedQuery],
  )
  const matches = useMemo(() => {
    const catalogMatches = courseCatalog.filter((course) => {
      if (!normalizedQuery) return true
      return [course.title, course.description, course.category, course.difficulty, `${course.lessons} lessons`]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    }).slice(0, 6)
    const seen = new Set(engineResults.map((result) => result.title.toLowerCase()))
    return [...engineResults, ...catalogMatches.filter((course) => !seen.has(course.title.toLowerCase()))].slice(0, 6)
  }, [normalizedQuery, engineResults])

  const submitSearch = (value = query) => {
    const searchQuery = value.trim()
    if (!searchQuery) return
    setIsOpen(false)
    window.history.pushState({}, '', `/learn?search=${encodeURIComponent(searchQuery)}`)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  // Engine results deep-link straight to the course, module or lesson.
  const activateResult = (match) => {
    setIsOpen(false)
    if (match.route) {
      window.history.pushState({}, '', match.route)
      window.dispatchEvent(new PopStateEvent('popstate'))
      return
    }
    submitSearch(match.title)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setIsOpen(false)
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setIsOpen(true)
      setHighlightedIndex((index) => Math.min(index + 1, Math.max(matches.length - 1, 0)))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightedIndex((index) => Math.max(index - 1, 0))
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      if (matches[highlightedIndex]) activateResult(matches[highlightedIndex])
      else submitSearch()
    }
  }

  return <div className={`course-search ${className}`}>
    <div className="course-search-input-wrap">
      <span className="course-search-icon" aria-hidden="true">⌕</span>
      <input
        value={query}
        placeholder="Search courses, lessons, or topics..."
        aria-label="Search courses, lessons, or topics"
        aria-expanded={isOpen}
        aria-controls={resultsId}
        onFocus={() => setIsOpen(true)}
        onChange={(event) => { setQuery(event.target.value); setHighlightedIndex(0); setIsOpen(true) }}
        onKeyDown={handleKeyDown}
      />
      {query && <button type="button" className="course-search-clear" aria-label="Clear search" onClick={() => { setQuery(''); setIsOpen(false) }}>×</button>}
    </div>
    {isOpen && <div className="course-search-dropdown" id={resultsId}>
      {!normalizedQuery && <div className="course-search-heading">Popular Courses</div>}        {matches.length > 0 ? matches.map((match, index) => {
          const isEngineResult = Boolean(match.route)
          const icon = match.icon || 'CC'
          const color = match.color || '#2388ff'
          const meta = isEngineResult ? `${match.eyebrow} · ${match.subtitle}` : `${match.difficulty} • ${match.lessons} lessons`
          const description = match.description || (isEngineResult ? 'Open in the interactive course' : '')
          return (
            <button
              type="button"
              className={`course-search-result ${index === highlightedIndex ? 'is-highlighted' : ''} ${isEngineResult ? 'is-engine' : ''}`}
              key={`${match.route || 'catalog'}-${match.title}`}
              onMouseEnter={() => setHighlightedIndex(index)}
              onClick={() => activateResult(match)}
            >
              <span className="course-search-result-icon" style={{ background: color }}>{icon}</span>
              <span className="course-search-result-copy"><strong>{match.title}</strong><small>{meta}</small>{description ? <em>{description}</em> : null}</span>
              <span className="course-search-arrow">→</span>
            </button>
          )
        }) : <div className="course-search-empty"><strong>No courses found</strong><span>Try searching for another course, language, or topic.</span></div>}
      {matches.length > 0 && normalizedQuery && <button type="button" className="course-search-all" onClick={() => submitSearch()}>View all results <span>→</span></button>}
    </div>}
  </div>
}
