import { FieldArray, Form, Formik, useFormikContext } from 'formik'
import { useEffect, useRef, useState } from 'react'
import { DateField, SelectField, TextField } from '../components/form/fields'
import { IconCloseModal } from '../components/icons'
import Modal from '../components/Modal'
import { INCOME_FREQUENCIES } from '../constants'
import { useData } from '../context/DataContext'
import { focusFirstInput } from '../lib/interactions'
import type { IncomeFrequency } from '../types'
import { getMonthlyIncome } from '../utils/finance'
import { formatMoney } from '../utils/format'
import { incomesSchema } from '../validation'
import './IncomeModal.css'

interface IncomeRow {
  /** Stable React key: existing incomes use their id, new rows get a temporary one */
  key: string
  id?: number
  amount: string
  frequency: string
  /** yyyy-mm-dd */
  firstPaymentDate: string
}

interface IncomeForm {
  incomes: IncomeRow[]
}

const FREQUENCY_OPTIONS = INCOME_FREQUENCIES.map(({ value, label }) => ({ value, label }))
const FREQUENCY_VALUES: string[] = INCOME_FREQUENCIES.map(({ value }) => value)

/** August 2024 */
const monthName = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })

let newRowCount = 0

function IncomeRows({ referenceDate }: { referenceDate: Date }) {
  const { values } = useFormikContext<IncomeForm>()
  const listRef = useRef<HTMLOListElement>(null)
  const previousCount = useRef(values.incomes.length)

  // After "+ Add Income", put the cursor in the new row's Amount field
  useEffect(() => {
    if (values.incomes.length > previousCount.current) focusFirstInput(listRef.current?.lastElementChild)
    previousCount.current = values.incomes.length
  }, [values.incomes.length])

  // Live total: only complete rows, and only payments dated in the current month
  const validRows = values.incomes
    .map((row) => ({
      amount: Number(row.amount),
      frequency: row.frequency as IncomeFrequency,
      firstPaymentDate: row.firstPaymentDate,
    }))
    .filter(
      (row) =>
        row.amount > 0 &&
        Number.isFinite(row.amount) &&
        FREQUENCY_VALUES.includes(row.frequency) &&
        /^\d{4}-\d{2}-\d{2}$/.test(row.firstPaymentDate),
    )

  return (
    <FieldArray name="incomes">
      {({ push, remove }) => (
        <div className="income-editor">
          <button
            type="button"
            className="btn btn--secondary btn--block"
            onClick={() =>
              push({
                key: `new-${++newRowCount}`,
                amount: '',
                frequency: '',
                firstPaymentDate: referenceDate.toISOString().slice(0, 10),
              } satisfies IncomeRow)
            }
          >
            + Add Income
          </button>

          {values.incomes.length ? (
            <ol className="income-list" ref={listRef} aria-label="Incomes">
              {values.incomes.map((row, index) => (
                <li key={row.key} className="income-row">
                  <div className="income-row__fields">
                    <TextField
                      name={`incomes.${index}.amount`}
                      label="Amount"
                      prefix="$"
                      placeholder="e.g. 2500"
                      inputMode="decimal"
                      autoComplete="off"
                    />
                    <SelectField
                      name={`incomes.${index}.frequency`}
                      label="Frequency"
                      placeholder="Select"
                      options={FREQUENCY_OPTIONS}
                    />
                    <div className="income-row__date">
                      <DateField name={`incomes.${index}.firstPaymentDate`} label="First Payment Date" />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="income-row__remove"
                    aria-label={`Remove income ${index + 1}`}
                    onClick={() => remove(index)}
                  >
                    <IconCloseModal aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="income-list__empty text-preset-4">No incomes yet. Add one to see your monthly income.</p>
          )}

          <p className="income-total">
            <span className="text-preset-4 text-muted">Total monthly income ({monthName(referenceDate)})</span>
            <span className="text-preset-3">{formatMoney(getMonthlyIncome(validRows, referenceDate))}</span>
          </p>
        </div>
      )}
    </FieldArray>
  )
}

/** Edit Income: same layout as the Edit Budget modal, with a list of incomes */
export default function IncomeModal({ onClose }: { onClose: () => void }) {
  const { incomes, saveIncomes, referenceDate } = useData()
  const [formError, setFormError] = useState('')

  const initialValues: IncomeForm = {
    incomes: incomes.map((income) => ({
      key: `id-${income.id}`,
      id: income.id,
      amount: String(income.amount),
      frequency: income.frequency,
      firstPaymentDate: income.firstPaymentDate,
    })),
  }

  return (
    <Modal
      title="Edit Income"
      description={`List each source of income, how often you receive it and its first payment date. Payments are added to your transactions up to the end of the month, and the total only counts payments received in ${monthName(referenceDate)}.`}
      onClose={onClose}
    >
      {(close) => (
        <Formik
          initialValues={initialValues}
          validationSchema={incomesSchema}
          onSubmit={async (values) => {
            setFormError('')
            try {
              await saveIncomes(
                values.incomes.map(({ id, amount, frequency, firstPaymentDate }) => ({
                  id,
                  amount: Number(amount),
                  frequency: frequency as IncomeFrequency,
                  firstPaymentDate,
                })),
              )
              close()
            } catch {
              setFormError('Something went wrong. Please try again.')
            }
          }}
        >
          {({ isSubmitting }) => (
            <Form className="modal__form" noValidate>
              <IncomeRows referenceDate={referenceDate} />
              {formError && <p className="modal__form-error text-preset-5">{formError}</p>}
              <button type="submit" className="btn btn--primary btn--block" disabled={isSubmitting}>
                Save Changes
              </button>
            </Form>
          )}
        </Formik>
      )}
    </Modal>
  )
}
