import { useRef, type ComponentType, type SVGProps } from 'react'
import { useDropdown } from '../lib/interactions'
import { IconCaretDown, IconSelected } from './icons'
import './Dropdown.css'

export interface DropdownOption {
  value: string
  label: string
  /** Theme color shown as a dot before the label */
  color?: string
  disabled?: boolean
  /** Text shown on the right of the option, e.g. "Already used" */
  hint?: string
}

interface DropdownProps {
  id: string
  /** Accessible name; shown as "Sort by" / "Category" text in the toolbar variant */
  label: string
  options: DropdownOption[]
  value: string
  onChange: (value: string) => void
  /** toolbar: compact filter next to a label. field: full width form control */
  variant?: 'toolbar' | 'field'
  /** id of an external element labelling the control (field variant) */
  labelledBy?: string
  /** Toolbar only: icon button that replaces the control on mobile */
  mobileIcon?: ComponentType<SVGProps<SVGSVGElement>>
  invalid?: boolean
  describedBy?: string
  placeholder?: string
}

/** Select menu built from buttons; opening, closing and keyboard support run on jQuery */
export default function Dropdown({
  id,
  label,
  options,
  value,
  onChange,
  variant = 'toolbar',
  labelledBy,
  mobileIcon: MobileIcon,
  invalid = false,
  describedBy,
  placeholder = 'Select…',
}: DropdownProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  useDropdown(rootRef, onChange)

  const selected = options.find((option) => option.value === value)
  const labelId = labelledBy ?? `${id}-label`
  const showsSelectedIcon = variant === 'field'

  return (
    <div className={`dropdown dropdown--${variant}`} ref={rootRef}>
      {variant === 'toolbar' && (
        <span className="dropdown__label text-preset-4" id={labelId}>
          {label}
        </span>
      )}

      <button
        type="button"
        id={id}
        className={`dropdown__control${invalid ? ' is-invalid' : ''}`}
        data-dropdown-trigger
        aria-haspopup="listbox"
        aria-expanded="false"
        aria-labelledby={`${labelId} ${id}-value`}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
      >
        {selected?.color && <span className="color-dot" style={{ backgroundColor: selected.color }} />}
        <span className={`dropdown__value${selected ? '' : ' is-placeholder'}`} id={`${id}-value`}>
          {selected?.label ?? placeholder}
        </span>
        <IconCaretDown className="dropdown__caret" aria-hidden="true" />
      </button>

      {MobileIcon && (
        <button
          type="button"
          className="dropdown__icon-trigger"
          data-dropdown-trigger
          aria-haspopup="listbox"
          aria-expanded="false"
          aria-label={`${label}: ${selected?.label ?? placeholder}`}
        >
          <MobileIcon aria-hidden="true" />
        </button>
      )}

      <div className="dropdown__menu" data-dropdown-menu role="listbox" aria-labelledby={labelId}>
        {options.map((option) => {
          const isSelected = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              role="option"
              tabIndex={-1}
              className={`dropdown__option${isSelected ? ' is-selected' : ''}`}
              data-dropdown-option
              data-value={option.value}
              aria-selected={isSelected}
              disabled={option.disabled}
            >
              <span className="dropdown__option-main">
                {option.color && <span className="color-dot" style={{ backgroundColor: option.color }} />}
                <span>{option.label}</span>
              </span>
              {option.hint && <span className="dropdown__hint text-preset-5">{option.hint}</span>}
              {showsSelectedIcon && isSelected && !option.hint && (
                <IconSelected className="dropdown__check" aria-hidden="true" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
