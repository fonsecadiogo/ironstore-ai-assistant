// API communication is kept separate from the React UI.
// In development, Vite proxies /api to the local FastAPI server.
// For deployment, set VITE_API_BASE_URL to your public backend URL before building.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '')

export const apiUrl = (path) => `${API_BASE_URL}${path}`

export function sourceLink(source) {
  if (!source) return '#'

  const fallbackPath = source.filename
    ? `/api/documents/${encodeURIComponent(source.filename)}#page=${Number(source.page) || 1}`
    : null

  try {
    const parsed = new URL(source.url || fallbackPath, window.location.origin)

    // Document links provided by the backend may contain 127.0.0.1:8000.
    // Rewrite these to the configured API origin, for local proxy and production.
    if (parsed.pathname.startsWith('/api/documents/')) {
      return `${API_BASE_URL}${parsed.pathname}${parsed.search}${parsed.hash}`
    }
  } catch {
    // Ignore invalid link; show a safe fallback instead.
  }

  return fallbackPath ? `${API_BASE_URL}${fallbackPath}` : '#'
}

export async function healthCheck() {
  const response = await fetch(apiUrl('/api/health'))
  if (!response.ok) throw new Error(`Backend returned ${response.status}`)
  const data = await response.json()
  return data.status === 'ok'
}

export async function submitFeedback(messageId, rating) {
  const response = await fetch(apiUrl('/api/feedback'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message_id: messageId, rating }),
  })

  if (!response.ok) {
    throw new Error(`Feedback could not be saved (${response.status}).`)
  }
}

// The FastAPI endpoint emits newline-delimited JSON (NDJSON), not SSE.
export async function streamAnswer(question, callbacks = {}, signal) {
  const response = await fetch(apiUrl('/api/chat/stream'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
    signal,
  })

  if (!response.ok) {
    let detail = `Request failed (${response.status}).`
    try {
      const data = await response.json()
      if (typeof data.detail === 'string') detail = data.detail
    } catch {
      // The server may return a non-JSON error.
    }
    throw new Error(detail)
  }

  if (!response.body) {
    throw new Error('Your browser does not support streaming responses.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let receivedDone = false

  function processLine(line) {
    if (!line.trim()) return
    const event = JSON.parse(line)
    const eventType = event.type || event.event

    if (eventType === 'start') {
      callbacks.onStart?.(event.message_id)
    } else if (eventType === 'token') {
      // The existing IronStore backend uses `token`. Accept `content` too.
      callbacks.onToken?.(event.token ?? event.content ?? event.text ?? '')
    } else if (eventType === 'sources') {
      callbacks.onSources?.(Array.isArray(event.sources) ? event.sources : [])
    } else if (eventType === 'done') {
      receivedDone = true
      callbacks.onDone?.(event.message_id)
    } else if (eventType === 'error') {
      throw new Error(event.message || event.content || event.detail || 'The AI could not complete the response.')
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) processLine(line)
    }

    buffer += decoder.decode()
    if (buffer.trim()) processLine(buffer)

    if (!receivedDone) {
      throw new Error('The response stream ended before completion.')
    }
  } finally {
    reader.releaseLock()
  }
}
