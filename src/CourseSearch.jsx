import { useId, useState } from 'react'
import { courseCatalog } from './course-search-data'

export default function CourseSearch({ className = '', initialQuery = '' }) {
  const resultsId = `course-search-results-${useId().replaceAll(':', '')}`
  const [query, setQuery] = useState(initialQuery)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const normalizedQuery = query.trim().toLowerCase()
  const matches = courseCatalog.filter((course) => {
    if (!normalizedQuery) return true
    return [course.title, course.description, course.category, course.difficulty, `${course.lessons} lessons`]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery)
  }).slice(0, 6)

  const submitSearch = (value = query) => {
    const searchQuery = value.trim()
    if (!searchQuery) return
    setIsOpen(false)
    window.history.pushState({}, '', `/learn?search=${encodeURIComponent(searchQuery)}`)
    window.dispatchEvent(new PopStateEvent('popstate'))
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
      if (matches[highlightedIndex]) submitSearch(matches[highlightedIndex].title)
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
      {!normalizedQuery && <div className="course-search-heading">Popular Courses</div>}
      {matches.length > 0 ? matches.map((course, index) => <button type="button" className={`course-search-result ${index === highlightedIndex ? 'is-highlighted' : ''}`} key={course.title} onMouseEnter={() => setHighlightedIndex(index)} onClick={() => submitSearch(course.title)}>
        <span className="course-search-result-icon" style={{ background: course.color }}>{course.icon}</span>
        <span className="course-search-result-copy"><strong>{course.title}</strong><small>{course.difficulty} <span>•</span> {course.lessons} lessons</small><em>{course.description}</em></span>
        <span className="course-search-arrow">→</span>
      </button>) : <div className="course-search-empty"><strong>No courses found</strong><span>Try searching for another course, language, or topic.</span></div>}
      {matches.length > 0 && normalizedQuery && <button type="button" className="course-search-all" onClick={() => submitSearch()}>View all results <span>→</span></button>}
    </div>}
  </div>
}
