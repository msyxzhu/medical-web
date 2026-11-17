import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { STAGE_LABELS, statusOf } from './domain.ts'
import type { Participant } from './domain.ts'
import { Icon } from '../shared/ui.tsx'

export function StatusTag({ person }: { person: Participant }) {
  const status = statusOf(person)
  const tone = status === 'support' ? 'tag-alert' : status === 'waiting' || status === 'post' ? 'tag-warm'
    : ['paused', 'withdrawn', 'baseline'].includes(status) ? 'tag-neutral' : ''
  return <span className={`tag ${tone}`}>{STAGE_LABELS[status]}</span>
}
export function PageHeading({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="muted small">{description}</p></div><div className="heading-actions">{children}</div></div>
}
export function Panel({ title, children, action, className = '' }: { title: string; children: ReactNode; action?: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}><header className="panel-heading"><h2>{title}</h2>{action}</header>{children}</section>
}
export function ParticipantLink({ person }: { person: Participant }) {
  return <Link className="person-link" to={`/participants/${person.id}`}><span className="avatar">{person.alias.slice(-1)}</span><span>{person.alias}<small>{person.id}</small></span></Link>
}
export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return <Link className="back-link" to={to}><span className="back-icon"><Icon name="arrow" size={16} /></span>{children}</Link>
}
