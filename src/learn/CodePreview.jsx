import { useEffect, useMemo, useState } from 'react'
import { buildPreviewDocument } from './preview-document.js'

export default function CodePreview({ code, runId = 0, height }) {
  const [runtimeError, setRuntimeError] = useState('')
  const documentSource = useMemo(() => buildPreviewDocument(code), [code])

  useEffect(() => {
    setRuntimeError('')
  }, [runId])

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.__ccLearn) setRuntimeError(String(event.data.message || 'Something went wrong.'))
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  if (!documentSource) {
    return (
      <div className="learn-preview learn-preview--empty" style={height ? { height } : undefined}>
        <span aria-hidden="true">▶</span>
        <p>Press <strong>Run</strong> to see your page appear here.</p>
      </div>
    )
  }

  return (
    <div className="learn-preview">
      <div className="learn-preview__bar">
        <span className="learn-preview__dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="learn-preview__label">Live preview</span>
        {runtimeError ? (
          <span className="learn-preview__status is-error">Error</span>
        ) : (
          <span className="learn-preview__status">Updated</span>
        )}
      </div>
      <div className="learn-preview__frame-wrap" style={height ? { height } : undefined}>
        <iframe
          key={runId}
          title="HTML output preview"
          className="learn-preview__frame"
          sandbox="allow-scripts allow-modals allow-popups"
          srcDoc={documentSource}
        />
      </div>
      {runtimeError && (
        <p className="learn-preview__error" role="alert">
          <strong>JavaScript error:</strong> {runtimeError}
        </p>
      )}
    </div>
  )
}
