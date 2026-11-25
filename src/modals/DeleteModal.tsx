import { useState } from 'react'
import Modal from '../components/Modal'

interface DeleteModalProps {
  /** Name of the item, shown as Delete ‘Name’? */
  name: string
  /** budget | pot | bill */
  kind: string
  onConfirm: () => Promise<void>
  onClose: () => void
}

export default function DeleteModal({ name, kind, onConfirm, onClose }: DeleteModalProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  return (
    <Modal
      title={`Delete ‘${name}’?`}
      description={`Are you sure you want to delete this ${kind}? This action cannot be reversed, and all the data inside it will be removed forever.`}
      onClose={onClose}
    >
      {(close) => (
        <div className="modal__actions">
          {error && <p className="modal__form-error text-preset-5">{error}</p>}
          <button
            type="button"
            className="btn btn--destroy"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await onConfirm()
                close()
              } catch {
                setError('Something went wrong. Please try again.')
                setBusy(false)
              }
            }}
          >
            Yes, Confirm Deletion
          </button>
          <button type="button" className="btn btn--plain" data-modal-close>
            No, Go Back
          </button>
        </div>
      )}
    </Modal>
  )
}
