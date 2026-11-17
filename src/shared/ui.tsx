import { Component, useEffect, useId, useRef } from 'react'
import type { ButtonHTMLAttributes, ErrorInfo, ReactNode } from 'react'

const paths = {
  home: 'm3 10 9-7 9 7v11h-6v-7H9v7H3z',
  people: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  book: 'M12 5v16M3 3h5a4 4 0 0 1 4 2 4 4 0 0 1 4-2h5v16h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3z',
  message: 'M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9H13a8.5 8.5 0 0 1 8 8v.5z',
  shield: 'M12 22s9-4 9-11V5l-9-3-9 3v6c0 7 9 11 9 11M12 8v5M12 16h.01',
  log: 'M9 5H5v16h14V5h-4M9 3h6v4H9zM8 11h8M8 15h8',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  chevron: 'm9 5 7 7-7 7',
  check: 'm5 12 4 4L19 6',
  close: 'm6 6 12 12M6 18 18 6',
  search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  refresh: 'M3 10a9 9 0 0 1 15-6l3 3M21 2v5h-5M21 14a9 9 0 0 1-15 6l-3-3M3 22v-5h5',
  logout: 'M9 21H3V3h6M10 12h11m-4-4 4 4-4 4',
  menu: 'M3 6h18M3 12h18M3 18h18',
  download: 'M12 3v12m-5-5 5 5 5-5M3 16v5h18v-5',
  clock: 'M12 8v4l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  leaf: 'M20 3C10 2 3 6 4 13c1 6 7 8 12 4 4-3 4-9 4-14ZM5 20 16 8',
}
export type IconName = keyof typeof paths
export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}
export function Brand({ small = false }: { small?: boolean }) {
  return <span className={`brand ${small ? 'brand-small' : ''}`}><span className="brand-mark"><Icon name="leaf" size={25} /></span><span>情绪与行动<small>EVERY SMALL STEP</small></span></span>
}
export function Button({ children, variant = 'primary', busy = false, ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; busy?: boolean }) {
  return <button {...props} type={props.type ?? 'button'} className={`btn btn-${variant} ${props.className ?? ''}`}
    disabled={props.disabled || busy} aria-busy={busy}>{busy && <span className="spinner" />}{children}</button>
}
export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warning' | 'error' | 'success' }) {
  return <div className={`notice notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}><Icon name={tone === 'success' ? 'check' : 'shield'} /><div>{children}</div></div>
}
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="empty"><span className="empty-symbol"><Icon name="leaf" size={26} /></span><h3>{title}</h3>{children && <p>{children}</p>}</div>
}
export function Modal({ title, children, onClose, busy = false }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  const heading = useId()
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    const old = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { dialog?.close(); document.body.style.overflow = old }
  }, [])
  return <dialog ref={ref} className="modal" aria-labelledby={heading}
    onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); if (!busy) onClose() } }}
    onCancel={event => { event.preventDefault(); if (!busy) onClose() }}
    onClick={event => { if (!busy && event.target === event.currentTarget) onClose() }}>
    <div className="modal-inner">
      <header className="modal-heading"><h2 id={heading}>{title}</h2><button className="icon-btn" aria-label="关闭" onClick={onClose} disabled={busy}><Icon name="close" /></button></header>
      {children}
    </div>
  </dialog>
}
export function PlantArt() {
  return <div className="plant-art" aria-hidden="true"><div className="art-arch"><i className="art-sun" /><i className="art-hill art-hill-back" /><i className="art-hill art-hill-front" /></div>
    <div className="art-branch"><i /><i /><i /><i /><i /></div><div className="art-ground" /><i className="art-dot art-dot-one" /><i className="art-dot art-dot-two" /></div>
}
export function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value))
}
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  override componentDidCatch(error: Error, info: ErrorInfo) { console.error('[web.render]', error, info.componentStack) }
  override render() {
    return this.state.failed
      ? <main className="fatal"><Notice tone="error">页面暂时无法显示，已保存的记录不会被自动清理。请刷新重试。</Notice><Button onClick={() => location.reload()}>刷新页面</Button></main>
      : this.props.children
  }
}
