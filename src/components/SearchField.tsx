import { useId } from 'react'
import { IconSearch } from './icons'
import './form/fields.css'

interface SearchFieldProps {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
}

export default function SearchField({ label, placeholder, value, onChange }: SearchFieldProps) {
  const id = useId()
  return (
    <div className="search-field" role="search">
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <div className="field__control">
        <input
          id={id}
          type="search"
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
