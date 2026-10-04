import { useState } from 'react'
import { copyText } from './clipboard.js'
import { highlightToNodes } from './highlight.jsx'

export default function CodeBlock({ code = '', caption = '', copyable = true }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const ok = await copyText(code)
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    }
  }

  return (
    <figure className="learn-codeblock">
      <div className="learn-codeblock__head">
        <span className="learn-codeblock__lang">HTML</span>
        {copyable && (
          <button type="button" className="learn-codeblock__copy" onClick={handleCopy}>
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
        )}
      </div>
      <pre className="learn-codeblock__pre" tabIndex={0}>
        <code>{highlightToNodes(code, 'cb')}</code>
      </pre>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}
