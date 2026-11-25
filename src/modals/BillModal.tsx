import { Form, Formik } from 'formik'
import { useState } from 'react'
import { DateField, TextField } from '../components/form/fields'
import Modal from '../components/Modal'
import { useData } from '../context/DataContext'
import type { RecurringBill } from '../types'
import { billSchema } from '../validation'

interface BillModalProps {
  /** Edit this bill; omit to add a new one (same modal) */
  bill?: RecurringBill
  onClose: () => void
}

export default function BillModal({ bill, onClose }: BillModalProps) {
  const { addBill, updateBill, referenceDate } = useData()
  const [formError, setFormError] = useState('')
  const editing = Boolean(bill)

  return (
    <Modal
      title={editing ? 'Edit Bill' : 'Add New Bill'}
      description={
        editing
          ? 'If a bill changes, update its details. The day of the due date is when it repeats every month.'
          : 'Add a bill you pay every month. The day of the due date is when it repeats every month.'
      }
      onClose={onClose}
    >
      {(close) => (
        <Formik
          initialValues={{
            name: bill?.name ?? '',
            dueDate: bill?.dueDate ?? referenceDate.toISOString().slice(0, 10),
            amount: bill ? String(bill.amount) : '',
          }}
          validationSchema={billSchema}
          onSubmit={async (values) => {
            setFormError('')
            const input = { name: values.name.trim(), dueDate: values.dueDate, amount: Number(values.amount) }
            try {
              if (bill) await updateBill(bill.id, input)
              else await addBill(input)
              close()
            } catch {
              setFormError('Something went wrong. Please try again.')
            }
          }}
        >
          {({ isSubmitting }) => (
            <Form className="modal__form" noValidate>
              <div className="modal__fields">
                <TextField name="name" label="Bill Title" placeholder="e.g. Spark Electric Solutions" autoComplete="off" />
                <DateField name="dueDate" label="Due Date" />
                <TextField
                  name="amount"
                  label="Amount"
                  prefix="$"
                  placeholder="e.g. 100"
                  inputMode="decimal"
                  autoComplete="off"
                />
              </div>
              {formError && <p className="modal__form-error text-preset-5">{formError}</p>}
              <button type="submit" className="btn btn--primary btn--block" disabled={isSubmitting}>
                {editing ? 'Save Changes' : 'Add Bill'}
              </button>
            </Form>
          )}
        </Formik>
      )}
    </Modal>
  )
}
