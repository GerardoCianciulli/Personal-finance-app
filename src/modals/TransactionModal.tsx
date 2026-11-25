import { Form, Formik } from 'formik'
import { useState } from 'react'
import { DateField, SelectField, TextField } from '../components/form/fields'
import Modal from '../components/Modal'
import { CATEGORIES } from '../constants'
import { useData } from '../context/DataContext'
import type { Category } from '../types'
import { transactionSchema } from '../validation'

export default function TransactionModal({ onClose }: { onClose: () => void }) {
  const { addTransaction, referenceDate } = useData()
  const [formError, setFormError] = useState('')

  return (
    <Modal
      title="Add New Transaction"
      description="Record money you have received or spent. Use a negative amount for spending, e.g. -25.50."
      onClose={onClose}
    >
      {(close) => (
        <Formik
          initialValues={{
            name: '',
            category: '',
            date: referenceDate.toISOString().slice(0, 10),
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
          {({ isSubmitting }) => (
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
                <TextField
                  name="amount"
                  label="Amount"
                  prefix="$"
                  placeholder="e.g. -25.50 or 120"
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
