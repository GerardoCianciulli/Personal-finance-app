import { Form, Formik } from 'formik'
import { useState } from 'react'
import { DateField, RadioField, SelectField, TextField } from '../components/form/fields'
import Modal from '../components/Modal'
import { CATEGORIES } from '../constants'
import { useData } from '../context/DataContext'
import type { Category, Transaction } from '../types'
import { transactionSchema } from '../validation'

const AMOUNT_PLACEHOLDER: Record<string, string> = {
  deposit: 'e.g. 120',
  debit: 'e.g. -25.50',
}

interface TransactionModalProps {
  /** Edit this transaction; omit to add a new one (same modal) */
  transaction?: Transaction
  onClose: () => void
}

export default function TransactionModal({ transaction, onClose }: TransactionModalProps) {
  const { addTransaction, updateTransaction, referenceDate } = useData()
  const [formError, setFormError] = useState('')
  const editing = Boolean(transaction)

  return (
    <Modal
      title={editing ? 'Edit Transaction' : 'Add New Transaction'}
      description={
        editing
          ? 'Update the details of this transaction. Choose Deposit for money in (above $0) or Debit for money out (below $0).'
          : 'Record money you have received or spent. Choose Deposit for money in (above $0) or Debit for money out (below $0).'
      }
      onClose={onClose}
    >
      {(close) => (
        <Formik
          initialValues={{
            name: transaction?.name ?? '',
            category: transaction?.category ?? '',
            date: (transaction?.date ?? referenceDate.toISOString()).slice(0, 10),
            type: transaction ? (transaction.amount < 0 ? 'debit' : 'deposit') : '',
            amount: transaction ? String(transaction.amount) : '',
          }}
          validationSchema={transactionSchema}
          onSubmit={async (values) => {
            setFormError('')
            // Keep the time of day so entries on the same date keep a stable order:
            // the original time when editing, the current time for new transactions
            const time = (transaction?.date ?? new Date().toISOString()).slice(10)
            const input = {
              name: values.name.trim(),
              category: values.category as Category,
              date: `${values.date}${time}`,
              amount: Number(values.amount),
            }
            try {
              if (transaction) await updateTransaction(transaction.id, input)
              else await addTransaction(input)
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
                {editing ? 'Save Changes' : 'Add Transaction'}
              </button>
            </Form>
          )}
        </Formik>
      )}
    </Modal>
  )
}
