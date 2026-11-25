import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { IconCaretRight } from './icons'

interface SectionCardProps {
  title: string
  linkLabel: string
  to: string
  className?: string
  children: ReactNode
}

/** White overview card with a title and a "See Details" tertiary link */
export default function SectionCard({ title, linkLabel, to, className = '', children }: SectionCardProps) {
  return (
    <section className={`card section-card ${className}`}>
      <div className="card__header">
        <h2 className="text-preset-2">{title}</h2>
        <Link to={to} className="btn btn--tertiary text-preset-4" aria-label={`${linkLabel}: ${title}`}>
          {linkLabel}
          <IconCaretRight aria-hidden="true" />
        </Link>
      </div>
      {children}
    </section>
  )
}
