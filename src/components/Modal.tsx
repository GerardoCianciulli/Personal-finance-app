import { useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useModal } from '../lib/interactions'
import { IconCloseModal } from './icons'
import './Modal.css'

interface ModalProps {
  title: string
  description?: ReactNode
  onClose: () => void
  /** Receives `close`, which fades the modal out (jQuery) before calling onClose */
  children: (close: () => void) => ReactNode
}

export default function Modal({ title, description, onClose, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const close = useModal(overlayRef, dialogRef, onClose)
  const titleId = useId()
  const descriptionId = useId()

  return createPortal(
    <div className="modal-overlay" ref={overlayRef}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        ref={dialogRef}
      >
        <div className="modal__header">
          <h2 className="modal__title" id={titleId}>
            {title}
          </h2>
          <button type="button" className="modal__close" data-modal-close aria-label="Close">
            <IconCloseModal aria-hidden="true" />
          </button>
        </div>
        {description && (
          <p className="modal__description text-preset-4" id={descriptionId}>
            {description}
          </p>
        )}
        {children(close)}
      </div>
    </div>,
    document.body,
  )
}
