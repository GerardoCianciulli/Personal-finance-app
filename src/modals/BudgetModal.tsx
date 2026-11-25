import { Form, Formik } from 'formik'
import { useState } from 'react'
import { SelectField, TextField } from '../components/form/fields'
import Modal from '../components/Modal'
import { CATEGORIES } from '../constants'
import { useData } from '../context/DataContext'
import type { Budget, Category } from '../types'
import { budgetSchema } from '../validation'
import { firstFreeTheme, themeOptions } from './themeOptions'

interface BudgetModalProps {
  /** Edit this budget; omit to add a new one (same modal) */
  budget?: Budget
  onClose: () => void
}

export default function BudgetModal({ budget, onClose }: BudgetModalProps) {
  const { budgets, addBudget, updateBudget } = useData()
  const [formError, setFormError] = useState('')
  const editing = Boolean(budget)

  const others = budgets.filter((b) => b.id !== budget?.id)
  const usedCategories = new Set(others.map((b) => b.category))
  const usedColors = others.map((b) => b.theme)

  const categoryOptions = CATEGORIES.map((c) => ({
    value: c,
    label: c,
    disabled: usedCategories.has(c),
    hint: usedCategories.has(c) ? 'Already used' : undefined,
  }))

  return (
    <Modal
      title={editing ? 'Edit Budget' : 'Add New Budget'}
      description={
        editing
          ? 'As your budgets change, feel free to update your spending limits.'
          : 'Choose a category to set a spending budget. These categories can help you monitor spending.'
      }
      onClose={onClose}
    >
      {(close) => (
        <Formik
          initialValues={{
            category: budget?.category ?? CATEGORIES.find((c) => !usedCategories.has(c)) ?? '',
            maximum: budget ? String(budget.maximum) : '',
            theme: budget?.theme ?? firstFreeTheme(usedColors),
          }}
          validationSchema={budgetSchema}
          onSubmit={async (values) => {
            setFormError('')
            const input = { category: values.category as Category, maximum: Number(values.maximum), theme: values.theme }
            try {
              if (budget) await updateBudget(budget.id, input)
              else await addBudget(input)
              close()
            } catch {
              setFormError('Something went wrong. Please try again.')
            }
          }}
        >
          {({ isSubmitting }) => (
            <Form className="modal__form" noValidate>
              <div className="modal__fields">
                <SelectField name="category" label="Budget Category" options={categoryOptions} />
                <TextField
                  name="maximum"
                  label="Maximum Spend"
                  prefix="$"
                  placeholder="e.g. 2000"
                  inputMode="decimal"
                  autoComplete="off"
                />
                <SelectField name="theme" label="Theme" options={themeOptions(usedColors, budget?.theme)} />
              </div>
              {formError && <p className="modal__form-error text-preset-5">{formError}</p>}
              <button type="submit" className="btn btn--primary btn--block" disabled={isSubmitting}>
                {editing ? 'Save Changes' : 'Add Budget'}
              </button>
            </Form>
          )}
        </Formik>
      )}
    </Modal>
  )
}
