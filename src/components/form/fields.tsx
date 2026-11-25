import { useField } from 'formik'
import { useId, useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { useDatePicker, usePasswordToggle } from '../../lib/interactions'
import Dropdown, { type DropdownOption } from '../Dropdown'
import { IconHidePassword, IconShowPassword } from '../icons'
import './fields.css'

interface ShellProps {
  id: string
  label: string
  /** Use a plain element instead of <label> for controls that are not inputs (dropdowns) */
  labelIsElement?: boolean
  error?: string
  helper?: ReactNode
  children: ReactNode
}

/** Label + control + helper text, switching to the error style when validation fails */
function FieldShell({ id, label, labelIsElement = false, error, helper, children }: ShellProps) {
  const LabelTag = labelIsElement ? 'span' : 'label'
  return (
    <div className={`field${error ? ' field--error' : ''}`}>
      <LabelTag className="field__label" id={`${id}-label`} {...(labelIsElement ? {} : { htmlFor: id })}>
        {label}
      </LabelTag>
      {children}
      {error ? (
        <p className="field__message field__message--error" id={`${id}-message`}>
          {error}
        </p>
      ) : (
        helper && (
          <p className="field__message" id={`${id}-message`}>
            {helper}
          </p>
        )
      )}
    </div>
  )
}

/** Formik error to display, only once the field was touched (blur or submit) */
function useFieldError(name: string) {
  const [, meta] = useField(name)
  return meta.touched && meta.error ? meta.error : undefined
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'name' | 'id' | 'prefix'>

interface TextFieldProps extends InputProps {
  name: string
  label: string
  prefix?: string
  helper?: ReactNode
  /** Shows "N of max characters left" under the field */
  characterLimit?: number
}

export function TextField({ name, label, prefix, helper, characterLimit, ...inputProps }: TextFieldProps) {
  const id = useId()
  const [field] = useField<string>(name)
  const error = useFieldError(name)
  const remaining = characterLimit ? characterLimit - String(field.value ?? '').length : undefined
  const message = characterLimit ? `${Math.max(remaining ?? 0, 0)} of ${characterLimit} characters left` : helper
  const hasMessage = Boolean(error || message)

  return (
    <FieldShell id={id} label={label} error={error} helper={message}>
      <div className="field__control">
        {prefix && (
          <span className="field__prefix" aria-hidden="true">
            {prefix}
          </span>
        )}
        <input
          {...field}
          {...inputProps}
          id={id}
          className="field__input"
          maxLength={characterLimit}
          aria-invalid={Boolean(error)}
          aria-describedby={hasMessage ? `${id}-message` : undefined}
        />
      </div>
    </FieldShell>
  )
}

interface PasswordFieldProps extends InputProps {
  name: string
  label: string
  helper?: ReactNode
}

/** Password input with a show/hide toggle handled by jQuery */
export function PasswordField({ name, label, helper, ...inputProps }: PasswordFieldProps) {
  const id = useId()
  const controlRef = useRef<HTMLDivElement>(null)
  const [field] = useField<string>(name)
  const error = useFieldError(name)
  const [visible, setVisible] = useState(false)
  usePasswordToggle(controlRef, setVisible)

  return (
    <FieldShell id={id} label={label} error={error} helper={helper}>
      <div className="field__control" ref={controlRef}>
        <input
          {...field}
          {...inputProps}
          id={id}
          type={visible ? 'text' : 'password'}
          className="field__input"
          aria-invalid={Boolean(error)}
          aria-describedby={error || helper ? `${id}-message` : undefined}
        />
        <button
          type="button"
          className="field__toggle"
          data-password-toggle
          aria-pressed="false"
          aria-label="Show password"
          aria-controls={id}
        >
          <IconShowPassword className="field__toggle-show" aria-hidden="true" />
          <IconHidePassword className="field__toggle-hide" aria-hidden="true" />
        </button>
      </div>
    </FieldShell>
  )
}

interface SelectFieldProps {
  name: string
  label: string
  options: DropdownOption[]
  placeholder?: string
}

/** Formik-bound dropdown (budget category, theme, transaction category) */
export function SelectField({ name, label, options, placeholder }: SelectFieldProps) {
  const id = useId()
  const [field, , helpers] = useField<string>(name)
  const error = useFieldError(name)

  return (
    <FieldShell id={id} label={label} labelIsElement error={error}>
      <Dropdown
        id={id}
        label={label}
        labelledBy={`${id}-label`}
        variant="field"
        options={options}
        value={field.value}
        placeholder={placeholder}
        invalid={Boolean(error)}
        describedBy={error ? `${id}-message` : undefined}
        onChange={(value) => {
          void helpers.setValue(value)
          void helpers.setTouched(true, false)
        }}
      />
    </FieldShell>
  )
}

interface DateFieldProps {
  name: string
  label: string
}

/** Native date input: clicking anywhere in the field opens the calendar (jQuery) */
export function DateField({ name, label }: DateFieldProps) {
  const id = useId()
  const controlRef = useRef<HTMLDivElement>(null)
  const [field] = useField<string>(name)
  const error = useFieldError(name)
  useDatePicker(controlRef)

  return (
    <FieldShell id={id} label={label} error={error}>
      <div className="field__control field__control--date" ref={controlRef}>
        <input
          {...field}
          id={id}
          type="date"
          className={`field__input${field.value ? '' : ' is-empty'}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-message` : undefined}
        />
      </div>
    </FieldShell>
  )
}
