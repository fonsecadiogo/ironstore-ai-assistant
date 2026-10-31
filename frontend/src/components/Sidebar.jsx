import Icon from './Icons'

const navigation = [
  { id: 'chat', title: 'AI Assistant', icon: 'chat' },
  { id: 'documents', title: 'Documents', icon: 'file' },
  { id: 'settings', title: 'Settings', icon: 'settings' },
]

export default function Sidebar({
  conversations,
  activeId,
  activeView,
  busy,
  onNewChat,
  onOpenChat,
  onNavigate,
  mobileOpen,
  onCloseMobile,
}) {
  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onCloseMobile}
          className="fixed inset-0 z-30 bg-slate-950/75 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`sidebar-glass fixed inset-y-0 left-0 z-40 flex w-[270px] shrink-0 flex-col border-r border-white/10 p-5 transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile navigation header */}
        <div className="mb-8 flex items-center justify-between px-2 pt-2 lg:hidden">
          <span className="font-semibold">Navigation</span>

          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close menu"
            className="icon-button"
          >
            <Icon name="close" />
          </button>
        </div>

        {/* New Chat */}
        <button
          type="button"
          onClick={onNewChat}
          disabled={busy}
          className="flex items-center justify-center gap-3 rounded-2xl border border-indigo-300/40 bg-gradient-to-r from-indigo-600/80 to-blue-600/50 px-5 py-4 text-sm font-semibold text-white shadow-[0_10px_35px_rgba(73,61,214,.24)] transition hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon name="plus" size={20} />
          New Chat
        </button>

        {/* Workspace navigation */}
        <p className="mt-6 px-3 text-xs font-semibold uppercase tracking-[.18em] text-slate-400">
          Workspace
        </p>

        <nav className="mt-3 space-y-1" aria-label="Workspace">
          {navigation.map((item) => (
            <button
              type="button"
              key={item.id}
              disabled={busy}
              onClick={() => onNavigate(item.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                activeView === item.id
                  ? 'border border-cyan-400/25 bg-cyan-400/10 font-semibold text-cyan-200'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon name={item.icon} size={18} />
              {item.title}
            </button>
          ))}
        </nav>

        {/* Recent Chats */}
        <div className="mt-5 flex min-h-0 flex-1 flex-col overflow-hidden border-t border-white/10 pt-4">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-[.18em] text-slate-400">
            Recent Chats
          </p>

          <div className="slim-scroll min-h-0 flex-1 space-y-1 overflow-y-auto pb-2">
            {conversations.length === 0 ? (
              <p className="px-3 py-3 text-sm leading-6 text-slate-500">
                No conversations yet
              </p>
            ) : (
              conversations.map((chat) => (
                <button
                  type="button"
                  key={chat.id}
                  disabled={busy}
                  onClick={() => onOpenChat(chat.id)}
                  className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    activeView === 'chat' && activeId === chat.id
                      ? 'border border-indigo-400/30 bg-indigo-400/15 text-white'
                      : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <Icon
                    name="chat"
                    size={18}
                    className="mt-0.5 shrink-0 text-sky-300"
                  />

                  <span className="min-w-0">
                    <span className="block truncate text-sm">
                      {chat.title}
                    </span>

                    <span className="mt-1 block text-xs text-slate-500">
                      {chat.messages?.length || 0} messages
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* About footer */}
        <div className="shrink-0 border-t border-white/10 px-3 pt-3">
          <button
            type="button"
            onClick={() => onNavigate('about')}
            className="flex items-center gap-3 py-2 text-sm font-medium text-slate-200 transition hover:text-cyan-300"
          >
            <Icon name="info" className="text-cyan-300" />
            About
          </button>
        </div>
      </aside>
    </>
  )
}
