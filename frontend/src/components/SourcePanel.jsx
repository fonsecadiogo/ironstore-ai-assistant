import Icon from './Icons'
import { sourceLink } from '../lib/api'

export default function SourcePanel({ sources, preview, onPreview, lastAnswer, onFeedback, feedbackBusy, mobile, onClose }) {
  return (
    <aside className={`source-glass ${mobile ? 'fixed inset-y-0 right-0 z-50 flex w-[min(95vw,390px)] flex-col overflow-y-auto border-l border-white/15 p-5 shadow-2xl xl:hidden' : 'hidden w-[315px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-white/10 p-5 xl:flex'}`}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Document Preview</h2>
          <p className="mt-1 text-xs text-slate-400">Source documents consulted by the AI</p>
        </div>
        {mobile && <button type="button" className="icon-button" onClick={onClose} aria-label="Close sources"><Icon name="close" /></button>}
      </div>

      <div className="rounded-2xl border border-cyan-300/15 bg-slate-900/35 p-3 shadow-inner">
        {preview ? (
          <>
            <div className="mb-3 flex items-center gap-2 text-xs text-sky-200">
              <Icon name="file" size={16} />
              <span className="min-w-0 flex-1 truncate" title={preview.filename}>{preview.filename}</span>
            </div>
            <iframe
              key={sourceLink(preview)}
              title={`Document preview: ${preview.filename}`}
              src={sourceLink(preview)}
              className="h-64 w-full rounded-xl border-0 bg-white"
              loading="lazy"
            />
            <a href={sourceLink(preview)} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-cyan-300 hover:text-cyan-100">
              Open PDF · Page {preview.page ?? '?'} <Icon name="arrow" size={15} />
            </a>
          </>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-center text-sm text-slate-400">
            <Icon name="file" size={36} className="text-cyan-400/60" />
            Document previews appear here after your first question.
          </div>
        )}
      </div>

      <div className="mt-3">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[.13em] text-slate-400">Available Sources · {sources.length}</p>
        {sources.length ? (
          <div className="slim-scroll max-h-40 space-y-2 overflow-y-auto">
            {sources.map((source, index) => (
              <button
                key={`${source.filename}-${source.page}-${index}`}
                type="button"
                onClick={() => onPreview(source)}
                className={`w-full rounded-xl border p-3 text-left text-xs transition ${preview?.filename === source.filename && preview?.page === source.page ? 'border-cyan-400/45 bg-cyan-400/15 text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}
              >
                <span className="block truncate">{source.filename}</span>
                <span className="mt-1 block text-[11px] text-cyan-300">Page {source.page ?? '?'}</span>
              </button>
            ))}
          </div>
        ) : <p className="text-sm text-slate-500">No documents consulted yet.</p>}
      </div>

      <div className="mt-3 rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-4">
        <h3 className="text-sm font-semibold">Feedback</h3>
        <p className="mt-2 text-xs text-slate-300">Was the latest answer helpful?</p>
        {lastAnswer ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {['up', 'down'].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => onFeedback(lastAnswer, rating)}
                disabled={Boolean(lastAnswer.feedback) || feedbackBusy}
                className={`flex items-center justify-center gap-2 rounded-xl border px-2 py-3 text-xs font-medium transition disabled:cursor-not-allowed ${rating === 'up' ? 'border-emerald-400/35 bg-emerald-400/10 text-emerald-300' : 'border-rose-400/35 bg-rose-400/10 text-rose-300'} ${lastAnswer.feedback === rating ? 'ring-2 ring-white/40' : ''} disabled:opacity-65`}
              ><Icon name={rating === 'up' ? 'good' : 'bad'} size={18} /> {rating === 'up' ? 'Yes' : 'No'}</button>
            ))}
          </div>
        ) : <p className="mt-3 text-xs text-slate-500">Ask a question to leave feedback.</p>}
      </div>
    </aside>
  )
}
