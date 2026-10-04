// Content authoring helpers for the CodeCraft learning engine.
// These produce plain data objects — no UI code lives here (see src/learn/*).

export const para = (text) => ({ type: 'paragraph', text })

export const list = (items, ordered = false) => ({ type: 'list', items, ordered })

export const codeExample = (snippet, caption = '') => ({ type: 'code', snippet, caption })

export const callout = (tone, title, text) => ({ type: 'callout', tone, title, text })

export const tip = (text, title = 'Tip') => callout('tip', title, text)

export const keyPoint = (text, title = 'Key idea') => callout('key', title, text)

export const warning = (text, title = 'Common mistake') => callout('warning', title, text)

export const note = (text, title = 'Good to know') => callout('note', title, text)

export const table = (headers, rows) => ({ type: 'table', headers, rows })

export const question = (q, options, answer, explanation = '') => ({ q, options, answer, explanation })

// --- practice tasks -------------------------------------------------------
// types: 'fill-blank' | 'choice' | 'reorder' | 'code'
// checks are either a case-insensitive substring (string) or a regex object:
//   { pattern: '<h1>', flags: 'i', not: true, message: '…' }

export const fillBlank = ({ id, prompt, blanks, hints = [], explanation = '' }) => ({
  id,
  type: 'fill-blank',
  prompt,
  blanks,
  hints,
  explanation,
})

export const choiceTask = ({ id, prompt, snippet = '', options, answer, hints = [], explanation = '' }) => ({
  id,
  type: 'choice',
  prompt,
  snippet,
  options,
  answer,
  hints,
  explanation,
})

export const reorderTask = ({ id, prompt, fragments, answer = [], hints = [], explanation = '' }) => ({
  id,
  type: 'reorder',
  prompt,
  fragments,
  answer,
  hints,
  explanation,
})

export const codeTask = ({ id, prompt, starter = '', checks = [], solution = '', hints = [], explanation = '' }) => ({
  id,
  type: 'code',
  prompt,
  starter,
  checks,
  solution,
  hints,
  explanation,
})

export const lesson = (definition) => ({
  duration: 8,
  objectives: [],
  sections: [],
  takeaways: [],
  practice: [],
  quiz: [],
  ...definition,
})
