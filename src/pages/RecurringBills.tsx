import { useMemo, useState } from 'react'
import Dropdown from '../components/Dropdown'
import EllipsisMenu from '../components/EllipsisMenu'
import { IconBillDue, IconBillPaid, IconRecurringBills, IconSortMobile } from '../components/icons'
import PageHeader from '../components/PageHeader'
import SearchField from '../components/SearchField'
import { SORT_OPTIONS } from '../constants'
import { useData } from '../context/DataContext'
import BillModal from '../modals/BillModal'
import DeleteModal from '../modals/DeleteModal'
import type { RecurringBill, SortOption } from '../types'
import { getBillStatus, getBillSummary, matchesBill, sortBills } from '../utils/finance'
import { formatDueDay, formatMoney } from '../utils/format'
import './Transactions.css'
import './RecurringBills.css'

type Dialog = { type: 'add' } | { type: 'edit' | 'delete'; bill: RecurringBill } | null

export default function RecurringBills() {
  const { recurringBills, transactions, referenceDate, deleteBill } = useData()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortOption>('Latest')
  const [dialog, setDialog] = useState<Dialog>(null)
  const close = () => setDialog(null)

  const summary = getBillSummary(recurringBills, transactions, referenceDate)
  const visible = useMemo(
    () => sortBills(recurringBills.filter((bill) => matchesBill(bill, query)), sort),
    [recurringBills, query, sort],
  )

  return (
    <div className="page bills">
      <PageHeader
        title="Recurring Bills"
        action={
          <button type="button" className="btn btn--primary" onClick={() => setDialog({ type: 'add' })}>
            + Add New Bill
          </button>
        }
      />

      <div className="bills__layout">
        <div className="bills__aside">
          <section className="bills-total" aria-labelledby="total-bills-title">
            <IconRecurringBills className="bills-total__icon" aria-hidden="true" />
            <div className="bills-total__texts">
              <h2 className="text-preset-4" id="total-bills-title">
                Total Bills
              </h2>
              <p className="text-preset-1">{formatMoney(summary.total)}</p>
            </div>
          </section>

          <section className="card bills-summary" aria-labelledby="bills-summary-title">
            <h2 className="text-preset-3" id="bills-summary-title">
              Summary
            </h2>
            <dl className="bills-summary__list">
              <div className="bills-summary__row">
                <dt className="text-preset-5 text-muted">Paid Bills</dt>
                <dd className="text-preset-5-bold">
                  {summary.paid.count} ({formatMoney(summary.paid.total)})
                </dd>
              </div>
              <div className="bills-summary__row">
                <dt className="text-preset-5 text-muted">Total Upcoming</dt>
                <dd className="text-preset-5-bold">
                  {summary.upcoming.count} ({formatMoney(summary.upcoming.total)})
                </dd>
              </div>
              <div className="bills-summary__row text-danger">
                <dt className="text-preset-5">Due Soon</dt>
                <dd className="text-preset-5-bold">
                  {summary.dueSoon.count} ({formatMoney(summary.dueSoon.total)})
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <section className="card bills__card" aria-label="Recurring bills list">
          <div className="toolbar">
            <SearchField label="Search bills" placeholder="Search bills" value={query} onChange={setQuery} />
            <div className="toolbar__filters">
              <Dropdown
                id="bills-sort"
                label="Sort by"
                options={SORT_OPTIONS.map((option) => ({ value: option, label: option }))}
                value={sort}
                onChange={(value) => setSort(value as SortOption)}
                mobileIcon={IconSortMobile}
              />
            </div>
          </div>

          {visible.length ? (
            <table className="bills-table">
              <thead>
                <tr>
                  <th scope="col">Bill Title</th>
                  <th scope="col">Due Date</th>
                  <th scope="col">Amount</th>
                  <th scope="col" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {visible.map((bill) => {
                  const status = getBillStatus(bill, transactions, referenceDate)
                  return (
                    <tr key={bill.id} className={`is-${status}`}>
                      <td className="bills-table__name">{bill.name}</td>
                      <td className="bills-table__due">
                        <span className="bills-table__due-inner">
                          {formatDueDay(bill.dueDate)}
                          {status === 'paid' && <IconBillPaid aria-label="Paid" role="img" />}
                          {status === 'due-soon' && <IconBillDue aria-label="Due soon" role="img" />}
                        </span>
                      </td>
                      <td className="bills-table__amount">{formatMoney(bill.amount)}</td>
                      <td className="bills-table__menu">
                        <EllipsisMenu
                          label={bill.name}
                          items={[
                            { label: 'Edit Bill', onSelect: () => setDialog({ type: 'edit', bill }) },
                            { label: 'Delete Bill', danger: true, onSelect: () => setDialog({ type: 'delete', bill }) },
                          ]}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <p className="empty-state" role="status">
              {recurringBills.length
                ? 'No bills match your search.'
                : 'You don’t have any recurring bills yet. Add one to get started.'}
            </p>
          )}
        </section>
      </div>

      {dialog?.type === 'add' && <BillModal onClose={close} />}
      {dialog?.type === 'edit' && <BillModal bill={dialog.bill} onClose={close} />}
      {dialog?.type === 'delete' && (
        <DeleteModal name={dialog.bill.name} kind="bill" onConfirm={() => deleteBill(dialog.bill.id)} onClose={close} />
      )}
    </div>
  )
}
