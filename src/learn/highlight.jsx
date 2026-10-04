import { tokenizeHtml } from './syntax.js'

const TOKEN_CLASS = {
  tag: 'tok-tag',
  attr: 'tok-attr',
  string: 'tok-string',
  comment: 'tok-comment',
  declaration: 'tok-declaration',
  punct: 'tok-punct',
  text: 'tok-text',
  plain: 'tok-plain',
}

export function highlightToNodes(source, keyPrefix = 't') {
  return tokenizeHtml(source).map((token, index) => (
    <span key={`${keyPrefix}-${index}`} className={TOKEN_CLASS[token.type] || 'tok-plain'}>
      {token.value}
    </span>
  ))
}
