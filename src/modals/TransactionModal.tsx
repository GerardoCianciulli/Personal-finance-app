import { Form, Formik } from 'formik'
import { useState } from 'react'
import { DateField, RadioField, SelectField, TextField } from '../components/form/fields'
import Modal from '../components/Modal'
import { CATEGORIES } from '../constants'
import { useData } from '../context/DataContext'
import type { Category } from '../types'
import { transactionSchema } from '../validation'

const AMOUNT_PLACEHOLDER: Record<string, string> = {
  deposit: 'e.g. 120',
  debit: 'e.g. -25.50',
}

export default function TransactionModal({ onClose }: { onClose: () => void }) {
  const { addTransaction, referenceDate } = useData()
  const [formError, setFormError] = useState('')

  return (
    <Modal
      title="Add New Transaction"
      description="Record money you have received or spent. Choose Deposit for money in (above $0) or Debit for money out (below $0)."
      onClose={onClose}
    >
      {(close) => (
        <Formik
          initialValues={{
            name: '',
            category: '',
            date: referenceDate.toISOString().slice(0, 10),
            type: '',
            amount: '',
          }}
          validationSchema={transactionSchema}
          onSubmit={async (values) => {
            setFormError('')
            try {
              const now = new Date()
              // Keep the time of day so new entries sort after earlier ones on the same date
              const time = now.toISOString().slice(10)
              await addTransaction({
                name: values.name.trim(),
                category: values.category as Category,
                date: `${values.date}${time}`,
                amount: Number(values.amount),
              })
              close()
            } catch {
              setFormError('Something went wrong. Please try again.')
            }
          }}
        >
          {({ values, isSubmitting }) => (
            <Form className="modal__form" noValidate>
              <div className="modal__fields">
                <TextField name="name" label="Recipient / Sender" placeholder="e.g. Emma Richardson" autoComplete="off" />
                <SelectField
                  name="category"
                  label="Category"
                  placeholder="Choose a category"
                  options={CATEGORIES.map((c) => ({ value: c, label: c }))}
                />
                <DateField name="date" label="Transaction Date" />
                <RadioField
                  name="type"
                  label="Transaction Type"
                  options={[
                    { value: 'deposit', label: 'Deposit' },
                    { value: 'debit', label: 'Debit' },
                  ]}
                />
                <TextField
                  name="amount"
                  label="Amount"
                  prefix="$"
                  placeholder={AMOUNT_PLACEHOLDER[values.type] ?? 'e.g. -25.50 or 120'}
                  inputMode="decimal"
                  autoComplete="off"
                />
              </div>
              {formError && <p className="modal__form-error text-preset-5">{formError}</p>}
              <button type="submit" className="btn btn--primary btn--block" disabled={isSubmitting}>
                Add Transaction
              </button>
            </Form>
          )}
        </Formik>
      )}
    </Modal>
  )
}
