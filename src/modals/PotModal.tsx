import { Form, Formik } from 'formik'
import { useState } from 'react'
import { SelectField, TextField } from '../components/form/fields'
import Modal from '../components/Modal'
import { POT_NAME_MAX_LENGTH } from '../constants'
import { useData } from '../context/DataContext'
import type { Pot } from '../types'
import { potSchema } from '../validation'
import { firstFreeTheme, themeOptions } from './themeOptions'

interface PotModalProps {
  /** Edit this pot; omit to add a new one (same modal) */
  pot?: Pot
  onClose: () => void
}

export default function PotModal({ pot, onClose }: PotModalProps) {
  const { pots, addPot, updatePot } = useData()
  const [formError, setFormError] = useState('')
  const editing = Boolean(pot)
  const usedColors = pots.filter((p) => p.id !== pot?.id).map((p) => p.theme)

  return (
    <Modal
      title={editing ? 'Edit Pot' : 'Add New Pot'}
      description={
        editing
          ? 'If your saving targets change, feel free to update your pots.'
          : 'Create a pot to set savings targets. These can help keep you on track as you save for special purchases.'
      }
      onClose={onClose}
    >
      {(close) => (
        <Formik
          initialValues={{
            name: pot?.name ?? '',
            target: pot ? String(pot.target) : '',
            theme: pot?.theme ?? firstFreeTheme(usedColors),
          }}
          validationSchema={potSchema}
          onSubmit={async (values) => {
            setFormError('')
            const input = { name: values.name.trim(), target: Number(values.target), theme: values.theme }
            try {
              if (pot) await updatePot(pot.id, input)
              else await addPot(input)
              close()
            } catch {
              setFormError('Something went wrong. Please try again.')
            }
          }}
        >
          {({ isSubmitting }) => (
            <Form className="modal__form" noValidate>
              <div className="modal__fields">
                <TextField
                  name="name"
                  label="Pot Name"
                  placeholder="e.g. Rainy Days"
                  characterLimit={POT_NAME_MAX_LENGTH}
                  autoComplete="off"
                />
                <TextField
                  name="target"
                  label="Target"
                  prefix="$"
                  placeholder="e.g. 2000"
                  inputMode="decimal"
                  autoComplete="off"
                />
                <SelectField name="theme" label="Theme" options={themeOptions(usedColors, pot?.theme)} />
              </div>
              {formError && <p className="modal__form-error text-preset-5">{formError}</p>}
              <button type="submit" className="btn btn--primary btn--block" disabled={isSubmitting}>
                {editing ? 'Save Changes' : 'Add Pot'}
              </button>
            </Form>
          )}
        </Formik>
      )}
    </Modal>
  )
}
