import Icon from './Icons'
import { sourceLink } from '../lib/api'

function SourceCard({ source, onPreview }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-slate-800/45 px-3 py-2.5 transition hover:border-cyan-400/35 hover:bg-cyan-400/10">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/20 text-rose-300"><Icon name="file" size={18} /></span>
      <a
        href={sourceLink(source)}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 flex-1 focus-visible:outline-cyan-300"
        title="Open PDF in a new tab"
      >
        <span className="block truncate text-xs font-medium text-slate-100">{source.filename || 'Document'}</span>
        <span className="mt-0.5 block text-[11px] text-slate-400">Page {source.page ?? '?'}</span>
      </a>
      <button
        type="button"
        onClick={() => onPreview(source)}
        className="icon-button shrink-0 text-sky-300"
        aria-label={`Preview ${source.filename || 'document'}`}
        title="Preview document"
      ><Icon name="arrow" size={17} /></button>
    </div>
  )
}

export default function MessageBubble({ message, onFeedback, feedbackBusy, onPreview }) {
  const isUser = message.role === 'user'
  const pending = message.status === 'streaming' && !message.content
  const stamp = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="mt-2 hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-500/20 text-cyan-300 sm:flex"><Icon name="cube" size={23} /></div>
      )}

      <article className={`min-w-0 max-w-[96%] rounded-2xl border p-4 shadow-xl sm:max-w-[88%] sm:p-5 ${isUser ? 'border-indigo-300/25 bg-indigo-400/15' : 'border-cyan-200/15 bg-gradient-to-br from-slate-800/90 to-blue-950/80'}`}>
        <div className="mb-3 flex items-center justify-between gap-4">
          <p className={`text-xs font-semibold uppercase tracking-[.12em] ${isUser ? 'text-indigo-200' : 'text-cyan-300'}`}>
            {isUser ? 'You' : 'IronStore AI'}
          </p>
          <time className="text-[11px] text-slate-400">{stamp}</time>
        </div>

        {pending ? (
          <div className="flex items-center gap-2 py-2 text-sm text-slate-400" role="status">
            <span className="typing-dots"><i /><i /><i /></span>
            Searching company knowledge...
          </div>
        ) : (
          <div className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-100 sm:text-[15px]">{message.content}</div>
        )}

        {!isUser && message.status === 'error' && (
          <p className="mt-3 text-xs text-rose-300">This response was interrupted. You can try again.</p>
        )}

        {!isUser && message.sources?.length > 0 && (
          <section className="mt-5 border-t border-white/10 pt-4" aria-label="Consulted documents">
            <div className="mb-3 flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-2 font-semibold text-slate-200"><Icon name="file" size={16} /> Consulted Sources</span>
              <span className="text-slate-400">{message.sources.length} references</span>
            </div>
            <div className="slim-scroll max-h-56 space-y-2 overflow-y-auto pr-1">
              {message.sources.map((source, i) => (
                <SourceCard key={`${source.filename}-${source.page}-${i}`} source={source} onPreview={onPreview} />
              ))}
            </div>
          </section>
        )}

        {!isUser && message.status === 'done' && message.messageId && (
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
            <span className="text-[11px] text-slate-400">Was this helpful?</span>
            <div className="flex items-center gap-1.5">
              {['up', 'down'].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  title={rating === 'up' ? 'Helpful' : 'Not helpful'}
                  aria-label={rating === 'up' ? 'Helpful answer' : 'Unhelpful answer'}
                  aria-pressed={message.feedback === rating}
                  disabled={Boolean(message.feedback) || feedbackBusy}
                  onClick={() => onFeedback(message, rating)}
                  className={`icon-button border border-white/10 ${message.feedback === rating ? 'border-cyan-400/50 bg-cyan-400/20 text-cyan-300' : 'text-slate-400 hover:text-cyan-300'} disabled:cursor-not-allowed`}
                ><Icon name={rating === 'up' ? 'good' : 'bad'} size={17} /></button>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  )
}
