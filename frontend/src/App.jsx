import { useEffect, useMemo, useRef, useState } from 'react'
import Sidebar from './components/Sidebar'
import MessageBubble from './components/MessageBubble'
import SourcePanel from './components/SourcePanel'
import Icon from './components/Icons'
import { apiUrl, healthCheck, sourceLink, streamAnswer, submitFeedback } from './lib/api'

const STORAGE_KEY = 'ironstore-v5-conversations'
const ACTIVE_KEY = 'ironstore-v5-active-chat'

const examples = [
  'What is IronStore’s remote work policy?',
  'Which office monitors appear in the product catalog?',
  'What does the returns policy say?',
]

function loadConversations() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(saved) ? saved.filter((chat) => chat && chat.id && Array.isArray(chat.messages)) : []
  } catch {
    return []
  }
}

function Brand({ compact = false }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/30 bg-gradient-to-br from-sky-400/20 to-indigo-500/30 text-sky-300 shadow-[0_0_30px_rgba(35,171,250,.17)]">
        <Icon name="cube" size={27} />
      </span>
      <div className="min-w-0">
        <span className="block truncate text-xl font-extrabold tracking-tight text-white sm:text-2xl">IronStore</span>
        {!compact && <span className="hidden text-xs text-slate-300 sm:block">AI Assistant</span>}
      </div>
    </div>
  )
}

export default function App() {
  const [conversations, setConversations] = useState(loadConversations)
  const [activeId, setActiveId] = useState(() => localStorage.getItem(ACTIVE_KEY) || null)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [feedbackPending, setFeedbackPending] = useState(null)
  const [error, setError] = useState('')
  const [activeView, setActiveView] = useState('chat')
  const [health, setHealth] = useState('checking')
  const [mobileNav, setMobileNav] = useState(false)
  const [mobileSources, setMobileSources] = useState(false)
  const [selectedSource, setSelectedSource] = useState(null)

  const messagesEndRef = useRef(null)
  const abortRef = useRef(null)

  const activeChat = conversations.find((chat) => chat.id === activeId)
  const messages = activeChat?.messages || []

  const latestSources = useMemo(() => {
    return [...messages].reverse().find((message) => message.role === 'assistant' && message.sources?.length)?.sources || []
  }, [messages])

  const latestAnswer = useMemo(() => {
    return [...messages].reverse().find((message) => message.role === 'assistant' && message.status === 'done' && message.messageId) || null
  }, [messages])

  const allSources = useMemo(() => {
    const distinct = new Map()
    for (const chat of conversations) {
      for (const message of chat.messages) {
        for (const source of message.sources || []) {
          const key = `${source.filename || ''}:${source.page || ''}`
          if (!distinct.has(key)) distinct.set(key, source)
        }
      }
    }
    return [...distinct.values()]
  }, [conversations])

  const preview = selectedSource || latestSources[0] || null

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))
    } catch {
      // The chat still works if local browser storage becomes unavailable.
    }
  }, [conversations])

  useEffect(() => {
    if (activeId) localStorage.setItem(ACTIVE_KEY, activeId)
    else localStorage.removeItem(ACTIVE_KEY)
  }, [activeId])

  useEffect(() => {
    if (activeView === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: isLoading ? 'auto' : 'smooth', block: 'end' })
    }
  }, [messages, activeView, isLoading])

  useEffect(() => {
    let mounted = true
    const refresh = () => healthCheck()
      .then((ok) => { if (mounted) setHealth(ok ? 'connected' : 'offline') })
      .catch(() => { if (mounted) setHealth('offline') })

    refresh()
    const interval = setInterval(refresh, 45000)
    return () => { mounted = false; clearInterval(interval) }
  }, [])

  function updateMessage(chatId, messageId, updater) {
    setConversations((previous) => previous.map((chat) => {
      if (chat.id !== chatId) return chat
      return {
        ...chat,
        messages: chat.messages.map((message) => message.id === messageId ? updater(message) : message),
      }
    }))
  }

  function handleNewChat() {
    if (isLoading) return
    setActiveId(null)
    setInput('')
    setError('')
    setSelectedSource(null)
    setActiveView('chat')
    setMobileNav(false)
    setMobileSources(false)
  }

  function handleOpenChat(id) {
    if (isLoading) return
    setActiveId(id)
    setActiveView('chat')
    setError('')
    setSelectedSource(null)
    setMobileNav(false)
  }

  function handleNavigate(view) {
    if (isLoading) return
    setActiveView(view)
    setError('')
    setMobileNav(false)
    setMobileSources(false)
  }

  function handlePreview(source) {
    setSelectedSource(source)
    if (window.innerWidth < 1280) setMobileSources(true)
  }

  async function sendQuestion(value) {
    const question = value.trim()
    if (!question || isLoading || question.length > 3000) {
      if (question.length > 3000) setError('Questions must be 3,000 characters or fewer.')
      return
    }

    const chatId = activeId || crypto.randomUUID()
    const assistantId = crypto.randomUUID()
    const now = new Date().toISOString()
    const userMessage = { id: crypto.randomUUID(), role: 'user', content: question, createdAt: now }
    const assistantMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt: now,
      status: 'streaming',
      sources: [],
      messageId: null,
      feedback: null,
    }

    setConversations((previous) => {
      const chatExists = previous.some((chat) => chat.id === chatId)
      if (!chatExists) {
        return [{ id: chatId, title: question.slice(0, 48), messages: [userMessage, assistantMessage] }, ...previous]
      }
      return previous.map((chat) => chat.id === chatId
        ? { ...chat, messages: [...chat.messages, userMessage, assistantMessage] }
        : chat)
    })

    setActiveId(chatId)
    setInput('')
    setError('')
    setSelectedSource(null)
    setActiveView('chat')
    setIsLoading(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      await streamAnswer(question, {
        onStart: (messageId) => updateMessage(chatId, assistantId, (message) => ({ ...message, messageId })),
        onToken: (token) => updateMessage(chatId, assistantId, (message) => ({ ...message, content: message.content + token })),
        onSources: (sources) => updateMessage(chatId, assistantId, (message) => ({ ...message, sources })),
        onDone: (messageId) => updateMessage(chatId, assistantId, (message) => ({ ...message, status: 'done', messageId: messageId || message.messageId })),
      }, controller.signal)
      setHealth('connected')
    } catch (caughtError) {
      if (caughtError.name !== 'AbortError') {
        setError(caughtError.message || 'Unable to contact the assistant.')
        updateMessage(chatId, assistantId, (message) => ({
          ...message,
          status: 'error',
          content: message.content || 'Sorry, something went wrong while generating the answer.',
        }))
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      setIsLoading(false)
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    void sendQuestion(input)
  }

  async function handleFeedback(message, rating) {
    if (!activeId || !message.messageId || message.feedback || feedbackPending) return

    const chatId = activeId
    setFeedbackPending(message.id)
    setError('')
    try {
      await submitFeedback(message.messageId, rating)
      updateMessage(chatId, message.id, (current) => ({ ...current, feedback: rating }))
    } catch (caughtError) {
      setError(caughtError.message || 'Unable to save feedback.')
    } finally {
      setFeedbackPending(null)
    }
  }

  function clearHistory() {
    if (isLoading || !window.confirm('Delete all locally saved chats? This cannot be undone.')) return
    setConversations([])
    setActiveId(null)
    setSelectedSource(null)
    setInput('')
    setError('')
    setActiveView('chat')
  }

  return (
    <div className="relative h-dvh min-h-[500px] overflow-hidden bg-[#050b21] text-white">
      <div className="pointer-events-none absolute -left-24 top-[15%] h-[430px] w-[430px] rounded-full bg-cyan-500/20 blur-[100px]" />
      <div className="pointer-events-none absolute -right-28 top-0 h-[560px] w-[560px] rounded-full bg-blue-600/25 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-180px] left-[30%] h-[460px] w-[560px] rounded-full bg-violet-700/30 blur-[110px]" />

      <div className="relative mx-auto flex h-full max-w-[1700px] flex-col p-2 sm:p-4 lg:p-6">
        <div className="dashboard-shell flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-sky-300/20 shadow-[0_25px_100px_rgba(0,0,0,.45)]">

          {/* Global top bar */}
          <header className="top-glass flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-7 sm:py-4">
            <div className="flex items-center gap-3 sm:gap-6">
              <button type="button" className="icon-button lg:hidden" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Icon name="menu" /></button>
              <Brand />
              <span className="hidden border-l border-white/15 pl-6 text-sm font-medium text-slate-300 md:inline">Enterprise Knowledge Assistant</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium ${health === 'connected' ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200' : health === 'checking' ? 'border-slate-400/20 bg-white/5 text-slate-300' : 'border-rose-400/25 bg-rose-400/10 text-rose-200'}`}>
                <span className={`h-2 w-2 rounded-full ${health === 'connected' ? 'bg-emerald-400' : health === 'checking' ? 'bg-slate-400' : 'bg-rose-400'}`} />
                {health === 'connected' ? 'Connected' : health === 'checking' ? 'Checking' : 'Offline'}
              </span>
              <button type="button" onClick={() => handleNavigate('about')} className="icon-button" title="About IronStore" aria-label="About IronStore"><Icon name="info" /></button>
            </div>
          </header>

          <div className="flex min-h-0 flex-1">
            <Sidebar
              conversations={conversations}
              activeId={activeId}
              activeView={activeView}
              busy={isLoading}
              onNewChat={handleNewChat}
              onOpenChat={handleOpenChat}
              onNavigate={handleNavigate}
              mobileOpen={mobileNav}
              onCloseMobile={() => setMobileNav(false)}
            />

            <main className="flex min-h-0 min-w-0 flex-1 flex-col">
              {activeView === 'chat' ? (
                <>
                  <div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-7">
                    <div>
                      <h1 className="text-lg font-semibold sm:text-xl">AI Assistant</h1>
                      <p className="mt-1 hidden text-xs text-slate-400 sm:block">Ask about company policies, products and procedures</p>
                    </div>
                    <button type="button" onClick={() => setMobileSources(true)} className="flex items-center gap-2 rounded-xl border border-sky-400/25 bg-sky-400/10 px-3 py-2 text-xs text-sky-200 xl:hidden">
                      <Icon name="file" size={16} /> Sources {latestSources.length > 0 ? `(${latestSources.length})` : ''}
                    </button>
                  </div>

                  <section className="slim-scroll min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8" aria-label="Conversation">
                    {messages.length === 0 ? (
                      <div className="flex h-full min-h-72 flex-col items-center justify-center text-center">
                        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[25px] border border-cyan-400/25 bg-cyan-400/10 text-cyan-300 shadow-[0_0_65px_rgba(0,186,255,.13)]"><Icon name="cube" size={43} /></div>
                        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Welcome to IronStore AI</h2>
                        <p className="mt-3 max-w-lg text-sm leading-7 text-slate-400">Your enterprise knowledge, one question away. Explore internal policies and the product catalog with document-backed answers.</p>
                        <div className="mt-7 flex max-w-xl flex-wrap justify-center gap-2">
                          {examples.map((example) => (
                            <button type="button" key={example} onClick={() => void sendQuestion(example)} disabled={isLoading} className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-left text-xs text-slate-300 transition hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-white disabled:opacity-50">{example}</button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <MessageBubble
                          key={message.id}
                          message={message}
                          onFeedback={handleFeedback}
                          feedbackBusy={Boolean(feedbackPending)}
                          onPreview={handlePreview}
                        />
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </section>

                  <div className="shrink-0 border-t border-white/10 bg-slate-950/20 p-3 sm:p-5">
                    {error && <div role="alert" className="mb-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">{error}</div>}
                    <form onSubmit={handleSubmit} className="flex items-end gap-2 rounded-2xl border border-sky-300/20 bg-slate-800/45 p-2.5 shadow-[0_12px_35px_rgba(0,0,0,.18)] transition focus-within:border-cyan-400/50 sm:gap-3 sm:p-3">
                      <textarea
                        aria-label="Ask a question"
                        placeholder="Ask a question about IronStore..."
                        rows={1}
                        maxLength={3000}
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                            event.preventDefault()
                            event.currentTarget.form?.requestSubmit()
                          }
                        }}
                        disabled={isLoading}
                        className="slim-scroll max-h-32 min-h-11 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-2 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-400 disabled:opacity-60 sm:px-3"
                      />
                      <button type="submit" disabled={isLoading || !input.trim()} aria-label="Send question" className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-600 px-4 text-sm font-bold text-white shadow-[0_7px_28px_rgba(80,89,255,.28)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45 sm:px-5">
                        <Icon name="send" size={18} /><span className="hidden sm:inline">{isLoading ? 'Thinking' : 'Send'}</span>
                      </button>
                    </form>
                    <p className="mt-2 text-center text-[11px] text-slate-500">Enter to send · Shift+Enter for a new line · Verify important information</p>
                  </div>
                </>
              ) : activeView === 'documents' ? (
                <section className="slim-scroll min-h-0 flex-1 overflow-y-auto p-6 lg:p-9">
                  <h1 className="text-2xl font-bold">Documents</h1>
                  <p className="mt-2 text-sm text-slate-400">PDF references retrieved in your previous conversations. This is not the full document inventory.</p>
                  <div className="mt-7 grid gap-3 sm:grid-cols-2">
                    {allSources.length ? allSources.map((source, index) => (
                      <a key={`${source.filename}-${source.page}-${index}`} href={sourceLink(source)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/30 hover:bg-cyan-400/10">
                        <Icon name="file" className="shrink-0 text-rose-300" />
                        <span className="min-w-0 flex-1"><span className="block truncate text-sm">{source.filename}</span><span className="mt-1 block text-xs text-cyan-300">Page {source.page}</span></span>
                        <Icon name="arrow" size={17} className="text-sky-300" />
                      </a>
                    )) : <p className="col-span-full rounded-2xl border border-white/10 bg-white/5 p-7 text-sm text-slate-400">No sources yet. Ask the assistant a question to retrieve documents.</p>}
                  </div>
                </section>
              ) : activeView === 'settings' ? (
                <section className="slim-scroll min-h-0 flex-1 overflow-y-auto p-6 lg:p-9">
                  <h1 className="text-2xl font-bold">Settings</h1>
                  <p className="mt-2 text-sm text-slate-400">Local application settings and diagnostic information.</p>
                  <div className="mt-7 max-w-xl space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5"><p className="text-xs uppercase tracking-widest text-slate-400">Backend status</p><p className="mt-2 text-base font-semibold">{health === 'connected' ? 'Connected' : health === 'checking' ? 'Checking...' : 'Disconnected'}</p><p className="mt-2 break-all text-xs text-slate-400">{apiUrl('/api/health')}</p></div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5"><p className="text-xs uppercase tracking-widest text-slate-400">Local conversation history</p><p className="mt-2 text-sm text-slate-200">{conversations.length} saved conversations</p><p className="mt-2 text-xs text-slate-400">Stored in this browser only. No account synchronization.</p><button type="button" onClick={clearHistory} disabled={isLoading} className="mt-5 flex items-center gap-2 rounded-xl border border-rose-400/35 bg-rose-500/10 px-4 py-2.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/20 disabled:opacity-50"><Icon name="trash" size={16} /> Clear local history</button></div>
                    {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
                  </div>
                </section>
              ) : (
                <section className="slim-scroll min-h-0 flex-1 overflow-y-auto p-6 lg:p-9">
                  <h1 className="text-2xl font-bold">About IronStore AI</h1>
                  <p className="mt-4 max-w-2xl text-sm leading-8 text-slate-300">IronStore AI Assistant helps employees explore company policies and product catalogs using a retrieval-augmented AI assistant.</p>
                  <div className="mt-7 max-w-xl space-y-3 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm leading-7 text-slate-300"><p><strong className="text-white">Powered by:</strong> FastAPI, LangChain, OpenAI, Pinecone, React, Vite and Tailwind CSS.</p><p><strong className="text-white">Sources:</strong> Answers may include links to the PDF pages consulted by the assistant.</p><p><strong className="text-white">Note:</strong> Historic catalogs cannot confirm live stock or current prices. AI responses should be verified before important decisions.</p></div>
                </section>
              )}
            </main>

            {activeView === 'chat' && (
              <SourcePanel
                sources={latestSources}
                preview={preview}
                onPreview={handlePreview}
                lastAnswer={latestAnswer}
                onFeedback={handleFeedback}
                feedbackBusy={Boolean(feedbackPending)}
              />
            )}
          </div>
        </div>
      </div>

      {mobileSources && (
        <>
          <button type="button" aria-label="Close document preview" onClick={() => setMobileSources(false)} className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm xl:hidden" />
          <SourcePanel
            mobile
            sources={latestSources}
            preview={preview}
            onPreview={handlePreview}
            lastAnswer={latestAnswer}
            onFeedback={handleFeedback}
            feedbackBusy={Boolean(feedbackPending)}
            onClose={() => setMobileSources(false)}
          />
        </>
      )}
    </div>
  )
}
