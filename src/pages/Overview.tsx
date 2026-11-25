import { useMemo } from 'react'
import DonutChart from '../components/DonutChart'
import { IconPot } from '../components/icons'
import PageHeader from '../components/PageHeader'
import SectionCard from '../components/SectionCard'
import TransactionItem from '../components/TransactionItem'
import { useData } from '../context/DataContext'
import { getBillSummary, getBudgetSpent, sortTransactions } from '../utils/finance'
import { formatMoney, formatMoneyShort } from '../utils/format'
import './Overview.css'

export default function Overview() {
  const { balance, pots, budgets, transactions, recurringBills, referenceDate } = useData()

  const totalSaved = pots.reduce((sum, pot) => sum + pot.total, 0)
  const latestTransactions = useMemo(() => sortTransactions(transactions, 'Latest').slice(0, 5), [transactions])
  const budgetSpent = budgets.reduce((sum, b) => sum + getBudgetSpent(b.category, transactions, referenceDate), 0)
  const budgetLimit = budgets.reduce((sum, b) => sum + b.maximum, 0)
  const bills = getBillSummary(recurringBills, transactions, referenceDate)

  const summary = [
    { label: 'Current Balance', value: balance.current, dark: true },
    { label: 'Income', value: balance.income, dark: false },
    { label: 'Expenses', value: balance.expenses, dark: false },
  ]

  return (
    <div className="page overview">
      <PageHeader title="Overview" />

      <section className="overview__summary" aria-label="Balance summary">
        {summary.map(({ label, value, dark }) => (
          <article key={label} className={`summary-card${dark ? ' summary-card--dark' : ''}`}>
            <h2 className="summary-card__label text-preset-4">{label}</h2>
            <p className="text-preset-1">
              {value < 0 ? '-' : ''}
              {formatMoney(value)}
            </p>
          </article>
        ))}
      </section>

      <div className="overview__grid">
        <div className="overview__column">
          <SectionCard title="Pots" linkLabel="See Details" to="/pots" className="overview-pots">
            <div className="overview-pots__content">
              <div className="overview-pots__total">
                <IconPot className="overview-pots__icon" aria-hidden="true" />
                <div>
                  <p className="text-preset-4 text-muted">Total Saved</p>
                  <p className="text-preset-1">{formatMoneyShort(totalSaved)}</p>
                </div>
              </div>
              <ul className="legend legend--grid">
                {pots.slice(0, 4).map((pot) => (
                  <li key={pot.id} className="legend__item">
                    <span className="color-tag" style={{ backgroundColor: pot.theme }} />
                    <span className="legend__text">
                      <span className="text-preset-5 text-muted">{pot.name}</span>
                      <span className="text-preset-4-bold">{formatMoneyShort(pot.total)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </SectionCard>

          <SectionCard title="Transactions" linkLabel="View All" to="/transactions" className="overview-transactions">
            {latestTransactions.length ? (
              <ul className="tx-list">
                {latestTransactions.map((t) => (
                  <TransactionItem key={t.id} transaction={t} />
                ))}
              </ul>
            ) : (
              <p className="empty-state">No transactions yet.</p>
            )}
          </SectionCard>
        </div>

        <div className="overview__column">
          <SectionCard title="Budgets" linkLabel="See Details" to="/budgets" className="overview-budgets">
            {budgets.length ? (
              <div className="overview-budgets__content">
                <DonutChart
                  spent={budgetSpent}
                  limit={budgetLimit}
                  segments={budgets.map((b) => ({ label: b.category, value: b.maximum, color: b.theme }))}
                />
                <ul className="legend overview-budgets__legend">
                  {budgets.map((b) => (
                    <li key={b.id} className="legend__item">
                      <span className="color-tag" style={{ backgroundColor: b.theme }} />
                      <span className="legend__text">
                        <span className="text-preset-5 text-muted">{b.category}</span>
                        <span className="text-preset-4-bold">{formatMoney(b.maximum)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="empty-state">No budgets yet.</p>
            )}
          </SectionCard>

          <SectionCard title="Recurring Bills" linkLabel="See Details" to="/recurring-bills" className="overview-bills">
            <ul className="overview-bills__list">
              <li className="overview-bills__item" style={{ borderLeftColor: 'var(--color-green)' }}>
                <span className="text-preset-4 text-muted">Paid Bills</span>
                <span className="text-preset-4-bold">{formatMoney(bills.paid.total)}</span>
              </li>
              <li className="overview-bills__item" style={{ borderLeftColor: 'var(--color-yellow)' }}>
                <span className="text-preset-4 text-muted">Total Upcoming</span>
                <span className="text-preset-4-bold">{formatMoney(bills.upcoming.total)}</span>
              </li>
              <li className="overview-bills__item" style={{ borderLeftColor: 'var(--color-cyan)' }}>
                <span className="text-preset-4 text-muted">Due Soon</span>
                <span className="text-preset-4-bold">{formatMoney(bills.dueSoon.total)}</span>
              </li>
            </ul>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
