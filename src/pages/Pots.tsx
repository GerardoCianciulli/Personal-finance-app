import { useState } from 'react'
import EllipsisMenu from '../components/EllipsisMenu'
import PageHeader from '../components/PageHeader'
import { useData } from '../context/DataContext'
import DeleteModal from '../modals/DeleteModal'
import PotModal from '../modals/PotModal'
import PotMoneyModal from '../modals/PotMoneyModal'
import type { Pot } from '../types'
import { formatMoney, formatMoneyShort, formatPercent } from '../utils/format'
import './Pots.css'

type Dialog =
  | { type: 'add' }
  | { type: 'edit' | 'delete' | 'deposit' | 'withdraw'; pot: Pot }
  | null

export default function Pots() {
  const { pots, deletePot } = useData()
  const [dialog, setDialog] = useState<Dialog>(null)
  const close = () => setDialog(null)

  return (
    <div className="page pots">
      <PageHeader
        title="Pots"
        action={
          <button type="button" className="btn btn--primary" onClick={() => setDialog({ type: 'add' })}>
            + Add New Pot
          </button>
        }
      />

      {pots.length === 0 ? (
        <section className="card">
          <p className="empty-state">You don’t have any pots yet. Add one to start saving for something special.</p>
        </section>
      ) : (
        <div className="pots__grid">
          {pots.map((pot) => {
            const ratio = pot.target > 0 ? pot.total / pot.target : 0
            const titleId = `pot-${pot.id}-title`
            return (
              <article key={pot.id} className="card pot-card" aria-labelledby={titleId}>
                <header className="pot-card__header">
                  <span className="color-dot" style={{ backgroundColor: pot.theme }} />
                  <h2 className="text-preset-2" id={titleId}>
                    {pot.name}
                  </h2>
                  <EllipsisMenu
                    label={pot.name}
                    items={[
                      { label: 'Edit Pot', onSelect: () => setDialog({ type: 'edit', pot }) },
                      { label: 'Delete Pot', danger: true, onSelect: () => setDialog({ type: 'delete', pot }) },
                    ]}
                  />
                </header>

                <div className="pot-card__progress">
                  <div className="pot-card__total">
                    <span className="text-preset-4 text-muted">Total Saved</span>
                    <span className="text-preset-1">{formatMoney(pot.total)}</span>
                  </div>
                  <div
                    className="pot-card__bar"
                    role="progressbar"
                    aria-label={`${pot.name} savings progress`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(Math.min(ratio, 1) * 100)}
                  >
                    <span style={{ width: `${Math.min(ratio, 1) * 100}%`, backgroundColor: pot.theme }} />
                  </div>
                  <div className="pot-card__meta">
                    <span className="text-preset-5-bold text-muted">{formatPercent(ratio * 100)}</span>
                    <span className="text-preset-5 text-muted">Target of {formatMoneyShort(pot.target)}</span>
                  </div>
                </div>

                <div className="pot-card__actions">
                  <button type="button" className="btn btn--secondary" onClick={() => setDialog({ type: 'deposit', pot })}>
                    + Add Money
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={() => setDialog({ type: 'withdraw', pot })}
                    disabled={pot.total <= 0}
                  >
                    Withdraw
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {dialog?.type === 'add' && <PotModal onClose={close} />}
      {dialog?.type === 'edit' && <PotModal pot={dialog.pot} onClose={close} />}
      {dialog?.type === 'deposit' && <PotMoneyModal pot={dialog.pot} mode="add" onClose={close} />}
      {dialog?.type === 'withdraw' && <PotMoneyModal pot={dialog.pot} mode="withdraw" onClose={close} />}
      {dialog?.type === 'delete' && (
        <DeleteModal name={dialog.pot.name} kind="pot" onConfirm={() => deletePot(dialog.pot.id)} onClose={close} />
      )}
    </div>
  )
}
