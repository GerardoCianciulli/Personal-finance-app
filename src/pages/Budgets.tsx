import { useState } from 'react'
import { Link } from 'react-router-dom'
import DonutChart from '../components/DonutChart'
import EllipsisMenu from '../components/EllipsisMenu'
import { IconCaretRight } from '../components/icons'
import PageHeader from '../components/PageHeader'
import TransactionItem from '../components/TransactionItem'
import { CATEGORIES } from '../constants'
import { useData } from '../context/DataContext'
import BudgetModal from '../modals/BudgetModal'
import DeleteModal from '../modals/DeleteModal'
import type { Budget } from '../types'
import { getBudgetSpent, getLatestSpending } from '../utils/finance'
import { formatMoney } from '../utils/format'
import './Budgets.css'

type Dialog = { type: 'add' } | { type: 'edit'; budget: Budget } | { type: 'delete'; budget: Budget } | null

export default function Budgets() {
  const { budgets, transactions, referenceDate, deleteBudget } = useData()
  const [dialog, setDialog] = useState<Dialog>(null)

  const rows = budgets.map((budget) => {
    const spent = getBudgetSpent(budget.category, transactions, referenceDate)
    return { budget, spent, remaining: Math.max(budget.maximum - spent, 0) }
  })
  const totalSpent = rows.reduce((sum, r) => sum + r.spent, 0)
  const totalLimit = budgets.reduce((sum, b) => sum + b.maximum, 0)
  const allCategoriesUsed = budgets.length >= CATEGORIES.length

  return (
    <div className="page budgets">
      <PageHeader
        title="Budgets"
        action={
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setDialog({ type: 'add' })}
            disabled={allCategoriesUsed}
            title={allCategoriesUsed ? 'Every category already has a budget' : undefined}
          >
            + Add New Budget
          </button>
        }
      />

      {budgets.length === 0 ? (
        <section className="card">
          <p className="empty-state">You don’t have any budgets yet. Add one to start tracking your spending.</p>
        </section>
      ) : (
        <div className="budgets__layout">
          <section className="card budgets-summary" aria-labelledby="spending-summary-title">
            <DonutChart
              spent={totalSpent}
              limit={totalLimit}
              segments={budgets.map((b) => ({ label: b.category, value: b.maximum, color: b.theme }))}
            />
            <div className="budgets-summary__details">
              <h2 className="text-preset-2" id="spending-summary-title">
                Spending Summary
              </h2>
              <ul className="budgets-summary__list">
                {rows.map(({ budget, spent }) => (
                  <li key={budget.id} className="budgets-summary__row">
                    <span className="budgets-summary__category">
                      <span className="color-tag" style={{ backgroundColor: budget.theme }} />
                      <span className="text-preset-4 text-muted">{budget.category}</span>
                    </span>
                    <span className="budgets-summary__amounts">
                      <span className="text-preset-3">{formatMoney(spent)}</span>
                      <span className="text-preset-5 text-muted">of {formatMoney(budget.maximum)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <div className="budgets__list">
            {rows.map(({ budget, spent, remaining }) => {
              const percent = budget.maximum > 0 ? Math.min(spent / budget.maximum, 1) * 100 : 0
              const latest = getLatestSpending(budget.category, transactions)
              const titleId = `budget-${budget.id}-title`
              return (
                <article key={budget.id} className="card budget-card" aria-labelledby={titleId}>
                  <header className="budget-card__header">
                    <span className="color-dot" style={{ backgroundColor: budget.theme }} />
                    <h2 className="text-preset-2" id={titleId}>
                      {budget.category}
                    </h2>
                    <EllipsisMenu
                      label={budget.category}
                      items={[
                        { label: 'Edit Budget', onSelect: () => setDialog({ type: 'edit', budget }) },
                        { label: 'Delete Budget', danger: true, onSelect: () => setDialog({ type: 'delete', budget }) },
                      ]}
                    />
                  </header>

                  <div className="budget-card__progress">
                    <p className="text-preset-4 text-muted">Maximum of {formatMoney(budget.maximum)}</p>
                    <div
                      className="budget-card__bar"
                      role="progressbar"
                      aria-label={`${budget.category} spending`}
                      aria-valuemin={0}
                      aria-valuemax={budget.maximum}
                      aria-valuenow={spent}
                      aria-valuetext={`${formatMoney(spent)} of ${formatMoney(budget.maximum)} spent`}
                    >
                      <span style={{ width: `${percent}%`, backgroundColor: budget.theme }} />
                    </div>
                    <dl className="budget-card__stats">
                      <div className="budget-card__stat">
                        <span className="color-tag" style={{ backgroundColor: budget.theme }} />
                        <div>
                          <dt className="text-preset-5 text-muted">Spent</dt>
                          <dd className="text-preset-4-bold">{formatMoney(spent)}</dd>
                        </div>
                      </div>
                      <div className="budget-card__stat">
                        <span className="color-tag" style={{ backgroundColor: 'var(--color-beige-100)' }} />
                        <div>
                          <dt className="text-preset-5 text-muted">Remaining</dt>
                          <dd className="text-preset-4-bold">{formatMoney(remaining)}</dd>
                        </div>
                      </div>
                    </dl>
                  </div>

                  <section className="latest-spending" aria-labelledby={`${titleId}-latest`}>
                    <div className="latest-spending__header">
                      <h2 className="text-preset-3" id={`${titleId}-latest`}>
                        Latest Spending
                      </h2>
                      <Link
                        to={`/transactions?category=${encodeURIComponent(budget.category)}`}
                        className="btn btn--tertiary text-preset-4"
                        aria-label={`See all ${budget.category} transactions`}
                      >
                        See All
                        <IconCaretRight aria-hidden="true" />
                      </Link>
                    </div>
                    {latest.length ? (
                      <ul className="tx-list">
                        {latest.map((t) => (
                          <TransactionItem key={t.id} transaction={t} variant="compact" />
                        ))}
                      </ul>
                    ) : (
                      <p className="text-preset-5 text-muted">No spending in this category yet.</p>
                    )}
                  </section>
                </article>
              )
            })}
          </div>
        </div>
      )}

      {dialog?.type === 'add' && <BudgetModal onClose={() => setDialog(null)} />}
      {dialog?.type === 'edit' && <BudgetModal budget={dialog.budget} onClose={() => setDialog(null)} />}
      {dialog?.type === 'delete' && (
        <DeleteModal
          name={dialog.budget.category}
          kind="budget"
          onConfirm={() => deleteBudget(dialog.budget.id)}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}
