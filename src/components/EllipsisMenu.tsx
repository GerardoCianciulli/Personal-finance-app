import { useRef } from 'react'
import { useDropdown } from '../lib/interactions'
import { IconEllipsis } from './icons'
import './EllipsisMenu.css'

interface EllipsisMenuItem {
  label: string
  onSelect: () => void
  danger?: boolean
}

interface EllipsisMenuProps {
  /** Name of the item the menu acts on, used for the button's accessible name */
  label: string
  items: EllipsisMenuItem[]
}

/** The "..." button on budgets, pots and bills, with an Edit / Delete menu driven by jQuery */
export default function EllipsisMenu({ label, items }: EllipsisMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  useDropdown(rootRef, (value) => items.find((item) => item.label === value)?.onSelect())

  return (
    <div className="ellipsis-menu" ref={rootRef}>
      <button
        type="button"
        className="ellipsis-menu__trigger"
        data-dropdown-trigger
        aria-haspopup="menu"
        aria-expanded="false"
        aria-label={`${label} options`}
      >
        <IconEllipsis aria-hidden="true" />
      </button>
      <div className="ellipsis-menu__menu" data-dropdown-menu role="menu" aria-label={`${label} options`}>
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            tabIndex={-1}
            className={`ellipsis-menu__item${item.danger ? ' is-danger' : ''}`}
            data-dropdown-option
            data-value={item.label}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}
