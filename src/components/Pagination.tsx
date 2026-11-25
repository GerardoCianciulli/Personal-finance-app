import { IconCaretLeft, IconCaretRight } from './icons'
import './Pagination.css'

interface PaginationProps {
  page: number
  pageCount: number
  onChange: (page: number) => void
}

/**
 * Page numbers to show. All pages fit on desktop/tablet; on mobile the CSS hides the
 * entries marked "compact-hidden" so the row stays short (1 … current … last).
 */
function getPages(page: number, pageCount: number) {
  return Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => ({
    n,
    compactHidden: pageCount > 4 && n !== 1 && n !== pageCount && Math.abs(n - page) > 0,
    gapBefore: pageCount > 4 && n === pageCount && page < pageCount - 1,
    gapAfter: pageCount > 4 && n === 1 && page > 2,
  }))
}

export default function Pagination({ page, pageCount, onChange }: PaginationProps) {
  if (pageCount <= 1) return null

  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        type="button"
        className="pagination__btn pagination__btn--step"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
      >
        <IconCaretLeft aria-hidden="true" />
        <span className="pagination__step-label">Prev</span>
      </button>

      <ol className="pagination__pages">
        {getPages(page, pageCount).map(({ n, compactHidden, gapBefore, gapAfter }) => (
          <li key={n} className={`pagination__item${compactHidden ? ' is-compact-hidden' : ''}`}>
            {gapBefore && (
              <span className="pagination__gap" aria-hidden="true">
                …
              </span>
            )}
            <button
              type="button"
              className={`pagination__btn${n === page ? ' is-active' : ''}`}
              onClick={() => onChange(n)}
              aria-current={n === page ? 'page' : undefined}
              aria-label={`Page ${n}`}
            >
              {n}
            </button>
            {gapAfter && (
              <span className="pagination__gap" aria-hidden="true">
                …
              </span>
            )}
          </li>
        ))}
      </ol>

      <button
        type="button"
        className="pagination__btn pagination__btn--step"
        onClick={() => onChange(page + 1)}
        disabled={page === pageCount}
        aria-label="Next page"
      >
        <span className="pagination__step-label">Next</span>
        <IconCaretRight aria-hidden="true" />
      </button>
    </nav>
  )
}
