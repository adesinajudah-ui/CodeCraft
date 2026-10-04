// Builds the document rendered inside the sandboxed preview iframe.
// Student code runs in an opaque origin (sandbox="allow-scripts", no
// allow-same-origin) so it can never touch the main application.

export const ERROR_BRIDGE = `
window.onerror = function (message, source, line) {
  try { parent.postMessage({ __ccLearn: true, message: String(message) + ' (line ' + line + ')' }, '*') } catch (error) {}
  return true;
};
window.addEventListener('unhandledrejection', function (event) {
  try { parent.postMessage({ __ccLearn: true, message: String(event.reason) }, '*') } catch (error) {}
});
`

export const BASE_STYLE = `
  :root { color-scheme: light; }
  body { margin: 0; padding: 16px; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #0f2540; background: #fff; line-height: 1.6; }
  img { max-width: 100%; }
  table { border-collapse: collapse; }
  td, th { border: 1px solid #cfdcea; padding: 6px 10px; }
  video, audio { max-width: 100%; }
`

const OPEN_SCRIPT = '<scr' + 'ipt>'
const CLOSE_SCRIPT = '</scr' + 'ipt>'
const CLOSE_STYLE = '</sty' + 'le>'

export function buildPreviewDocument(code) {
  const source = String(code ?? '')
  if (!source.trim()) return ''
  const bridge = `${OPEN_SCRIPT}${ERROR_BRIDGE}${CLOSE_SCRIPT}`

  if (/<!doctype/i.test(source)) {
    if (/<head[^>]*>/i.test(source)) return source.replace(/<head[^>]*>/i, (tag) => `${tag}${bridge}`)
    if (/<html[^>]*>/i.test(source)) return source.replace(/<html[^>]*>/i, (tag) => `${tag}${bridge}`)
    return `${bridge}${source}`
  }

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${BASE_STYLE}${CLOSE_STYLE}
${bridge}
</head>
<body>
${source}
</body>
</html>`
}
