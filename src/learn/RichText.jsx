import { useMemo } from 'react'

const INLINE_PATTERN = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\n]+\*)/g

// Renders the tiny inline-markup subset used in lesson copy:
// `code`, **bold**, *italic*.
export function RichText({ text = '', as: Tag = 'span', className = '' }) {
  const nodes = useMemo(() => {
    const source = String(text)
    const output = []
    const pattern = new RegExp(INLINE_PATTERN.source, 'g')
    let cursor = 0
    let match = pattern.exec(source)

    while (match !== null) {
      if (match.index > cursor) output.push(source.slice(cursor, match.index))
      const token = match[0]
      if (token.startsWith('`')) {
        output.push(<code key={`${match.index}-c`}>{token.slice(1, -1)}</code>)
      } else if (token.startsWith('**')) {
        output.push(<strong key={`${match.index}-b`}>{token.slice(2, -2)}</strong>)
      } else {
        output.push(<em key={`${match.index}-i`}>{token.slice(1, -1)}</em>)
      }
      cursor = match.index + token.length
      match = pattern.exec(source)
    }

    if (cursor < source.length) output.push(source.slice(cursor))
    return output
  }, [text])

  return <Tag className={className}>{nodes}</Tag>
}
