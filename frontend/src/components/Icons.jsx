const common = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export default function Icon({ name, size = 20, className = '' }) {
  const shapes = {
    chat: <><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a9 9 0 0 1-.9-4A8.5 8.5 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5Z" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></>,
    settings: <><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" /><path d="M19.4 15a1.8 1.8 0 0 0 .36 2l-1.7 1.7a1.8 1.8 0 0 0-2-.36 8 8 0 0 1-1.06.44l-.7 2.22h-2.4l-.7-2.22a8 8 0 0 1-1.06-.44 1.8 1.8 0 0 0-2 .36l-1.7-1.7a1.8 1.8 0 0 0 .36-2A8 8 0 0 1 6.35 14L4 13.3v-2.4l2.35-.7A8 8 0 0 1 6.8 9.14a1.8 1.8 0 0 0-.36-2l1.7-1.7a1.8 1.8 0 0 0 2 .36 8 8 0 0 1 1.06-.44L11.9 3h2.4l.7 2.35c.36.12.72.27 1.06.44a1.8 1.8 0 0 0 2-.36l1.7 1.7a1.8 1.8 0 0 0-.36 2c.17.34.32.7.44 1.06l2.16.7v2.4l-2.16.7c-.12.36-.27.72-.44 1.06Z" /></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    close: <><path d="M18 6 6 18M6 6l12 12" /></>,
    arrow: <><path d="M7 17 17 7M8 7h9v9" /></>,
    up: <><path d="M7 14a4 4 0 1 1 8 0v2a3 3 0 0 0 3 3H8a3 3 0 0 0-3-3v-2" /></>,
    good: <><path d="M7 10v12H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h3Zm0 0 5-8c1.8 0 2.6 1.2 2.2 3l-.9 4H20a2 2 0 0 1 2 2l-1 8a3 3 0 0 1-3 3H7" /></>,
    bad: <><path d="M7 14V2H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3Zm0 0 5 8c1.8 0 2.6-1.2 2.2-3l-.9-4H20a2 2 0 0 0 2-2l-1-8a3 3 0 0 0-3-3H7" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
    trash: <><path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 10v7M14 10v7" /></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14.5-4.5L3 9M3 3v6h6M4 13a8 8 0 0 0 14.5 4.5L21 15M21 21v-6h-6" /></>,
    cube: <><path d="m12 2 9 5v10l-9 5-9-5V7Z" /><path d="m3 7 9 5 9-5M12 12v10" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      {...common}
    >
      {shapes[name] || shapes.info}
    </svg>
  )
}
