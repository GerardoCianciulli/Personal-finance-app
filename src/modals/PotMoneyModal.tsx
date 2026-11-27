import { Form, Formik } from 'formik'
import { useState } from 'react'
import { TextField } from '../components/form/fields'
import Modal from '../components/Modal'
import { useData } from '../context/DataContext'
import type { Pot } from '../types'
import { getCurrentBalance } from '../utils/finance'
import { formatMoney, formatMoneyShort, formatPercent } from '../utils/format'
import { potMoneySchema } from '../validation'
import './PotMoneyModal.css'

interface PotMoneyModalProps {
  pot: Pot
  mode: 'add' | 'withdraw'
  onClose: () => void
}

const COPY = {
  add: {
    title: (name: string) => `Add to ‘${name}’`,
    description:
      'Add money to your pot to keep it separate from your main balance. As soon as you add this money, it will be deducted from your current balance.',
    field: 'Amount to Add',
    submit: 'Confirm Addition',
  },
  withdraw: {
    title: (name: string) => `Withdraw from ‘${name}’`,
    description:
      'Withdraw from your pot to put money back in your main balance. This will reduce the amount you have in this pot.',
    field: 'Amount to Withdraw',
    submit: 'Confirm Withdrawal',
  },
}

const pct = (value: number, target: number) => (target > 0 ? Math.min(Math.max(value / target, 0), 1) * 100 : 0)

export default function PotMoneyModal({ pot, mode, onClose }: PotMoneyModalProps) {
  const { transactions, movePotMoney } = useData()
  const [formError, setFormError] = useState('')
  const copy = COPY[mode]
  // Adding is limited to the Current Balance shown on Overview (the sum of all transactions)
  const max = mode === 'add' ? Math.max(getCurrentBalance(transactions), 0) : pot.total
  const overMessage =
    mode === 'add'
      ? `You only have ${formatMoney(max)} in your current balance`
      : `This pot only has ${formatMoney(pot.total)}`

  return (
    <Modal title={copy.title(pot.name)} description={copy.description} onClose={onClose}>
      {(close) => (
        <Formik
          initialValues={{ amount: '' }}
          validationSchema={potMoneySchema(max, overMessage)}
          onSubmit={async (values) => {
            setFormError('')
            const amount = Number(values.amount)
            try {
              await movePotMoney(pot.id, mode === 'add' ? amount : -amount)
              close()
            } catch {
              setFormError('Something went wrong. Please try again.')
            }
          }}
        >
          {({ values, isSubmitting }) => {
            const entered = Number(values.amount)
            const change = Number.isFinite(entered) && entered > 0 ? Math.min(entered, max) : 0
            const newTotal = mode === 'add' ? pot.total + change : pot.total - change
            // Bar: what stays in the pot (dark) + what is added (green) or removed (red)
            const base = pct(mode === 'add' ? pot.total : newTotal, pot.target)
            const delta = pct(mode === 'add' ? newTotal : pot.total, pot.target) - base

            return (
              <Form className="modal__form" noValidate>
                <div className="pot-change">
                  <div className="pot-change__amount">
                    <span className="text-preset-4 text-muted">New Amount</span>
                    <span className="text-preset-1">{formatMoney(newTotal)}</span>
                  </div>
                  <div
                    className="pot-change__bar"
                    role="progressbar"
                    aria-label="New amount compared to target"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(pct(newTotal, pot.target))}
                  >
                    <span className="pot-change__base" style={{ width: `${base}%` }} />
                    {delta > 0 && (
                      <span className={`pot-change__delta pot-change__delta--${mode}`} style={{ width: `${delta}%` }} />
                    )}
                  </div>
                  <div className="pot-change__meta text-preset-5">
                    <span className={`text-preset-5-bold ${mode === 'add' ? 'text-positive' : 'text-danger'}`}>
                      {formatPercent(pot.target > 0 ? (newTotal / pot.target) * 100 : 0)}
                    </span>
                    <span className="text-muted">Target of {formatMoneyShort(pot.target)}</span>
                  </div>
                </div>

                <TextField
                  name="amount"
                  label={copy.field}
                  prefix="$"
                  placeholder="e.g. 20"
                  inputMode="decimal"
                  autoComplete="off"
                />
                {formError && <p className="modal__form-error text-preset-5">{formError}</p>}
                <button type="submit" className="btn btn--primary btn--block" disabled={isSubmitting}>
                  {copy.submit}
                </button>
              </Form>
            )
          }}
        </Formik>
      )}
    </Modal>
  )
}
