// Minimal HTML tokenizer for lesson code examples and the lesson editor.
// Returns [{ type, value }] — rendering lives in components, not here.

const TAG_NAME = /^<\/?([a-zA-Z][a-zA-Z0-9:-]*)/
const ATTR_NAME = /^[a-zA-Z_:][a-zA-Z0-9:._-]*/

export function tokenizeHtml(source = '') {
  const text = String(source)
  const tokens = []
  let index = 0

  const push = (type, value) => {
    if (!value) return
    const previous = tokens[tokens.length - 1]
    if (previous && previous.type === type) previous.value += value
    else tokens.push({ type, value })
  }

  while (index < text.length) {
    const rest = text.slice(index)

    if (rest.startsWith('<!--')) {
      const end = text.indexOf('-->', index + 4)
      const stop = end === -1 ? text.length : end + 3
      push('comment', text.slice(index, stop))
      index = stop
      continue
    }

    if (rest[0] === '<' && (rest[1] === '!' || rest[1] === '?')) {
      const end = text.indexOf('>', index)
      const stop = end === -1 ? text.length : end + 1
      push('declaration', text.slice(index, stop))
      index = stop
      continue
    }

    const tagMatch = TAG_NAME.exec(rest)
    if (tagMatch) {
      push('punct', '<')
      if (rest[1] === '/') push('punct', '/')
      push('tag', tagMatch[0].replace(/^<\/?/, ''))
      index += tagMatch[0].length

      // attributes until the closing bracket
      while (index < text.length && text[index] !== '>') {
        const char = text[index]
        if (/\s/.test(char)) {
          push('plain', char)
          index += 1
          continue
        }
        if (char === '=' ) {
          push('punct', '=')
          index += 1
          continue
        }
        if (char === '"' || char === "'") {
          const end = text.indexOf(char, index + 1)
          const stop = end === -1 ? text.length : end + 1
          push('string', text.slice(index, stop))
          index = stop
          continue
        }
        const attrMatch = ATTR_NAME.exec(text.slice(index))
        if (attrMatch) {
          push('attr', attrMatch[0])
          index += attrMatch[0].length
          continue
        }
        push('punct', char)
        index += 1
      }

      if (index < text.length) {
        push('punct', text[index])
        index += 1
      }
      continue
    }

    const nextTag = text.indexOf('<', index)
    if (nextTag === -1) {
      push('text', text.slice(index))
      break
    }
    if (nextTag === index) {
      push('punct', '<')
      index += 1
      continue
    }
    push('text', text.slice(index, nextTag))
    index = nextTag
  }

  return tokens
}
