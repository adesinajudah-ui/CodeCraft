import { useEffect, useMemo, useRef } from 'react'
import { highlightToNodes } from './highlight.jsx'

// Lightweight editor: a textarea (real editing, native mobile keyboard) layered
// over a highlighted <pre>. Both share identical metrics and the textarea's
// scroll position drives the highlight and the line-number gutter.
export default function CodeEditor({
  value,
  onChange,
  onRun,
  onReset,
  onCopy,
  copied = false,
  label = 'index.html',
  runLabel = 'Run',
  disabled = false,
  footer = null,
}) {
  const textareaRef = useRef(null)
  const highlightRef = useRef(null)
  const gutterRef = useRef(null)

  const lines = useMemo(() => String(value ?? '').split('\n'), [value])

  useEffect(() => {
    // keep the highlight aligned after external value changes (reset/insert)
    const textarea = textareaRef.current
    if (!textarea || !highlightRef.current) return
    highlightRef.current.scrollTop = textarea.scrollTop
    highlightRef.current.scrollLeft = textarea.scrollLeft
    if (gutterRef.current) gutterRef.current.scrollTop = textarea.scrollTop
  }, [value])

  const handleScroll = (event) => {
    const { scrollTop, scrollLeft } = event.currentTarget
    if (highlightRef.current) {
      highlightRef.current.scrollTop = scrollTop
      highlightRef.current.scrollLeft = scrollLeft
    }
    if (gutterRef.current) gutterRef.current.scrollTop = scrollTop
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Tab') {
      event.preventDefault()
      const textarea = event.currentTarget
      const { selectionStart, selectionEnd } = textarea
      const next = `${value.slice(0, selectionStart)}  ${value.slice(selectionEnd)}`
      onChange(next)
      requestAnimationFrame(() => {
        textarea.selectionStart = selectionStart + 2
        textarea.selectionEnd = selectionStart + 2
      })
      return
    }
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      onRun?.()
    }
  }

  return (
    <div className="learn-editor">
      <div className="learn-editor__bar">
        <span className="learn-editor__file">{label}</span>
        <span className="learn-editor__meta">{lines.length} lines</span>
        <div className="learn-editor__actions">
          <button type="button" className="learn-editor__btn" onClick={onCopy} disabled={disabled}>
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
          <button type="button" className="learn-editor__btn" onClick={onReset} disabled={disabled}>
            Reset
          </button>
          <button type="button" className="learn-editor__btn learn-editor__btn--run" onClick={onRun} disabled={disabled}>
            ▶ {runLabel}
          </button>
        </div>
      </div>

      <div className="learn-editor__body">
        <div className="learn-editor__gutter" ref={gutterRef} aria-hidden="true">
          {lines.map((_, index) => <span key={index}>{index + 1}</span>)}
        </div>
        <div className="learn-editor__surface">
          <pre className="learn-editor__highlight" ref={highlightRef} aria-hidden="true">
            <code>{highlightToNodes(value || '', 'ed')}</code>
          </pre>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            wrap="off"
            aria-label={`HTML editor for ${label}`}
            className="learn-editor__input"
          />
        </div>
      </div>

      {footer}
    </div>
  )
}
