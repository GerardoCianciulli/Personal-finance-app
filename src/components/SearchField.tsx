import { IconSearch } from './icons'
import './form/fields.css'

interface SearchFieldProps {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
}

export default function SearchField({ label, placeholder, value, onChange }: SearchFieldProps) {
  return (
    <div className="search-field" role="search">
      <div className="field__control">
        <input
          type="search"
          aria-label={label}
          className="field__input"
          placeholder={placeholder}
          value={value}
          autoComplete="off"
          onChange={(event) => onChange(event.target.value)}
        />
        <IconSearch aria-hidden="true" />
      </div>
    </div>
  )
}
