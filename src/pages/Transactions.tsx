import { useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Dropdown from '../components/Dropdown'
import EllipsisMenu from '../components/EllipsisMenu'
import { IconFilterMobile, IconSortMobile } from '../components/icons'
import PageHeader from '../components/PageHeader'
import Pagination from '../components/Pagination'
import SearchField from '../components/SearchField'
import { ALL_TRANSACTIONS, CATEGORIES, SORT_OPTIONS, TRANSACTIONS_PER_PAGE } from '../constants'
import { useData } from '../context/DataContext'
import { scrollIntoViewIfNeeded } from '../lib/interactions'
import DeleteModal from '../modals/DeleteModal'
import TransactionModal from '../modals/TransactionModal'
import type { Category, SortOption, Transaction } from '../types'
import { matchesTransaction, sortTransactions } from '../utils/finance'
import { formatDate, formatSignedMoney } from '../utils/format'
import './Transactions.css'

type Dialog = { type: 'add' } | { type: 'edit' | 'delete'; transaction: Transaction } | null

const isCategory = (value: string | null): value is Category => CATEGORIES.includes(value as Category)

export default function Transactions() {
  const { transactions, deleteTransaction } = useData()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortOption>('Latest')
  const [page, setPage] = useState(1)
  const [dialog, setDialog] = useState<Dialog>(null)
  const closeDialog = () => setDialog(null)
  const cardRef = useRef<HTMLElement>(null)

  const categoryParam = searchParams.get('category')
  const category = isCategory(categoryParam) ? categoryParam : ALL_TRANSACTIONS

  const filtered = useMemo(() => {
    const list = transactions.filter(
      (t) => (category === ALL_TRANSACTIONS || t.category === category) && matchesTransaction(t, query),
    )
    return sortTransactions(list, sort)
  }, [transactions, category, query, sort])

  const pageCount = Math.max(1, Math.ceil(filtered.length / TRANSACTIONS_PER_PAGE))
  const currentPage = Math.min(page, pageCount)
  const visible = filtered.slice((currentPage - 1) * TRANSACTIONS_PER_PAGE, currentPage * TRANSACTIONS_PER_PAGE)

  const changeCategory = (value: string) => {
    setPage(1)
    setSearchParams(value === ALL_TRANSACTIONS ? {} : { category: value }, { replace: true })
  }

  const changePage = (next: number) => {
    setPage(next)
    scrollIntoViewIfNeeded(cardRef.current)
  }

  return (
    <div className="page transactions">
      <PageHeader
        title="Transactions"
        action={
          <button
            type="button"
            className="btn btn--primary"
            aria-label="Add New Transaction"
            onClick={() => setDialog({ type: 'add' })}
          >
            <span>
              + Add New<span className="btn__label-extra"> Transaction</span>
            </span>
          </button>
        }
      />

      <section className="card transactions__card" ref={cardRef} aria-label="Transactions list">
        <div className="toolbar">
          <SearchField
            label="Search transactions"
            placeholder="Search transaction"
            value={query}
            onChange={(value) => {
              setQuery(value)
              setPage(1)
            }}
          />
          <div className="toolbar__filters">
            <Dropdown
              id="transactions-sort"
              label="Sort by"
              options={SORT_OPTIONS.map((option) => ({ value: option, label: option }))}
              value={sort}
              onChange={(value) => {
                setSort(value as SortOption)
                setPage(1)
              }}
              mobileIcon={IconSortMobile}
            />
            <Dropdown
              id="transactions-category"
              label="Category"
              options={[ALL_TRANSACTIONS, ...CATEGORIES].map((option) => ({ value: option, label: option }))}
              value={category}
              onChange={changeCategory}
              mobileIcon={IconFilterMobile}
            />
          </div>
        </div>

        {visible.length ? (
          <table className="tx-table">
            <thead>
              <tr>
                <th scope="col">Recipient / Sender</th>
                <th scope="col">Category</th>
                <th scope="col">Transaction Date</th>
                <th scope="col">Amount</th>
                <th scope="col" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => (
                <tr key={t.id}>
                  <td className="tx-table__name">{t.name}</td>
                  <td className="tx-table__category">{t.category}</td>
                  <td className="tx-table__date">
                    <time dateTime={t.date}>{formatDate(t.date)}</time>
                  </td>
                  <td className={`tx-table__amount${t.amount > 0 ? ' text-positive' : ''}`}>
                    {formatSignedMoney(t.amount)}
                  </td>
                  <td className="tx-table__menu">
                    <EllipsisMenu
                      label={`${t.name}, ${formatDate(t.date)}`}
                      items={[
                        { label: 'Edit Transaction', onSelect: () => setDialog({ type: 'edit', transaction: t }) },
                        {
                          label: 'Delete Transaction',
                          danger: true,
                          onSelect: () => setDialog({ type: 'delete', transaction: t }),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-state" role="status">
            No transactions match your search.
          </p>
        )}

        <Pagination page={currentPage} pageCount={pageCount} onChange={changePage} />
      </section>

      {dialog?.type === 'add' && <TransactionModal onClose={closeDialog} />}
      {dialog?.type === 'edit' && <TransactionModal transaction={dialog.transaction} onClose={closeDialog} />}
      {dialog?.type === 'delete' && (
        <DeleteModal
          name={dialog.transaction.name}
          kind="transaction"
          onConfirm={() => deleteTransaction(dialog.transaction.id)}
          onClose={closeDialog}
        />
      )}
    </div>
  )
}
