import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getStore, type Store } from '../api/client'
import type { Balance, Budget, Pot, RecurringBill, Transaction } from '../types'
import { findAvatar, getReferenceDate } from '../utils/finance'

interface FinanceData {
  balance: Balance
  transactions: Transaction[]
  budgets: Budget[]
  pots: Pot[]
  recurringBills: RecurringBill[]
}

type NewTransaction = Omit<Transaction, 'id' | 'avatar' | 'recurring'>
type NewBill = Omit<RecurringBill, 'id' | 'avatar' | 'category'>

interface DataContextValue extends FinanceData {
  status: 'loading' | 'ready' | 'error'
  /** "Today" for the app: the date of the most recent transaction */
  referenceDate: Date
  addTransaction(input: NewTransaction): Promise<void>
  updateTransaction(id: number, input: NewTransaction): Promise<void>
  deleteTransaction(id: number): Promise<void>
  addBudget(input: Omit<Budget, 'id'>): Promise<void>
  updateBudget(id: number, input: Omit<Budget, 'id'>): Promise<void>
  deleteBudget(id: number): Promise<void>
  addPot(input: Omit<Pot, 'id' | 'total'>): Promise<void>
  updatePot(id: number, input: Omit<Pot, 'id' | 'total'>): Promise<void>
  deletePot(id: number): Promise<void>
  /** Positive amount adds money to the pot, negative withdraws it */
  movePotMoney(id: number, amount: number): Promise<void>
  addBill(input: NewBill): Promise<void>
  updateBill(id: number, input: NewBill): Promise<void>
  deleteBill(id: number): Promise<void>
}

const DataContext = createContext<DataContextValue | null>(null)

const EMPTY: FinanceData = {
  balance: { current: 0, income: 0, expenses: 0 },
  transactions: [],
  budgets: [],
  pots: [],
  recurringBills: [],
}

const round = (value: number) => Math.round(value * 100) / 100

/** Adds (direction 1) or reverses (direction -1) a transaction's effect on the balance */
const applyToBalance = (balance: Balance, amount: number, direction: 1 | -1): Balance => ({
  current: balance.current + direction * amount,
  income: balance.income + direction * Math.max(amount, 0),
  expenses: balance.expenses + direction * Math.max(-amount, 0),
})

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<FinanceData>(EMPTY)
  const [status, setStatus] = useState<DataContextValue['status']>('loading')
  const [store, setStore] = useState<Store | null>(null)

  useEffect(() => {
    let cancelled = false
    getStore()
      .then(async (s) => {
        const db = await s.getDb()
        if (cancelled) return
        setStore(s)
        setData({
          balance: db.balance,
          transactions: db.transactions,
          budgets: db.budgets,
          pots: db.pots,
          recurringBills: db.recurringBills,
        })
        setStatus('ready')
      })
      .catch((error: unknown) => {
        console.error(error)
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const requireStore = useCallback(() => {
    if (!store) throw new Error('Data is still loading')
    return store
  }, [store])

  const saveBalance = useCallback(
    async (next: Balance) => {
      const saved = await requireStore().updateBalance({
        current: round(next.current),
        income: round(next.income),
        expenses: round(next.expenses),
      })
      setData((d) => ({ ...d, balance: saved }))
    },
    [requireStore],
  )

  const addTransaction = useCallback<DataContextValue['addTransaction']>(
    async (input) => {
      const s = requireStore()
      const avatar = findAvatar(input.name, [...data.transactions, ...data.recurringBills])
      const created = await s.create('transactions', { ...input, avatar, recurring: false })
      setData((d) => ({ ...d, transactions: [...d.transactions, created] }))
      await saveBalance(applyToBalance(data.balance, input.amount, 1))
    },
    [data, requireStore, saveBalance],
  )

  const updateTransaction = useCallback<DataContextValue['updateTransaction']>(
    async (id, input) => {
      const previous = data.transactions.find((t) => t.id === id)
      if (!previous) return
      const renamed = previous.name.trim().toLowerCase() !== input.name.trim().toLowerCase()
      const avatar = renamed ? findAvatar(input.name, [...data.transactions, ...data.recurringBills]) : previous.avatar
      const updated = await requireStore().update('transactions', id, { ...input, avatar })
      setData((d) => ({ ...d, transactions: d.transactions.map((t) => (t.id === id ? updated : t)) }))
      // Swap the old amount's effect on the balance for the new one
      await saveBalance(applyToBalance(applyToBalance(data.balance, previous.amount, -1), input.amount, 1))
    },
    [data, requireStore, saveBalance],
  )

  const deleteTransaction = useCallback<DataContextValue['deleteTransaction']>(
    async (id) => {
      const previous = data.transactions.find((t) => t.id === id)
      if (!previous) return
      await requireStore().remove('transactions', id)
      setData((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== id) }))
      await saveBalance(applyToBalance(data.balance, previous.amount, -1))
    },
    [data, requireStore, saveBalance],
  )

  const addBudget = useCallback<DataContextValue['addBudget']>(
    async (input) => {
      const created = await requireStore().create('budgets', input)
      setData((d) => ({ ...d, budgets: [...d.budgets, created] }))
    },
    [requireStore],
  )

  const updateBudget = useCallback<DataContextValue['updateBudget']>(
    async (id, input) => {
      const updated = await requireStore().update('budgets', id, input)
      setData((d) => ({ ...d, budgets: d.budgets.map((b) => (b.id === id ? updated : b)) }))
    },
    [requireStore],
  )

  const deleteBudget = useCallback<DataContextValue['deleteBudget']>(
    async (id) => {
      await requireStore().remove('budgets', id)
      setData((d) => ({ ...d, budgets: d.budgets.filter((b) => b.id !== id) }))
    },
    [requireStore],
  )

  const addPot = useCallback<DataContextValue['addPot']>(
    async (input) => {
      const created = await requireStore().create('pots', { ...input, total: 0 })
      setData((d) => ({ ...d, pots: [...d.pots, created] }))
    },
    [requireStore],
  )

  const updatePot = useCallback<DataContextValue['updatePot']>(
    async (id, input) => {
      const updated = await requireStore().update('pots', id, input)
      setData((d) => ({ ...d, pots: d.pots.map((p) => (p.id === id ? updated : p)) }))
    },
    [requireStore],
  )

  const deletePot = useCallback<DataContextValue['deletePot']>(
    async (id) => {
      const pot = data.pots.find((p) => p.id === id)
      await requireStore().remove('pots', id)
      setData((d) => ({ ...d, pots: d.pots.filter((p) => p.id !== id) }))
      // The money saved in a deleted pot goes back to the current balance
      if (pot && pot.total > 0) await saveBalance({ ...data.balance, current: data.balance.current + pot.total })
    },
    [data, requireStore, saveBalance],
  )

  const movePotMoney = useCallback<DataContextValue['movePotMoney']>(
    async (id, amount) => {
      const pot = data.pots.find((p) => p.id === id)
      if (!pot) return
      const updated = await requireStore().update('pots', id, { total: round(pot.total + amount) })
      setData((d) => ({ ...d, pots: d.pots.map((p) => (p.id === id ? updated : p)) }))
      await saveBalance({ ...data.balance, current: data.balance.current - amount })
    },
    [data, requireStore, saveBalance],
  )

  const billFields = useCallback(
    (input: NewBill) => {
      const known = [...data.recurringBills, ...data.transactions].find(
        (entry) => entry.name.trim().toLowerCase() === input.name.trim().toLowerCase(),
      )
      return {
        ...input,
        avatar: findAvatar(input.name, [...data.recurringBills, ...data.transactions]),
        category: known?.category ?? 'Bills',
      }
    },
    [data.recurringBills, data.transactions],
  )

  const addBill = useCallback<DataContextValue['addBill']>(
    async (input) => {
      const created = await requireStore().create('recurringBills', billFields(input))
      setData((d) => ({ ...d, recurringBills: [...d.recurringBills, created] }))
    },
    [billFields, requireStore],
  )

  const updateBill = useCallback<DataContextValue['updateBill']>(
    async (id, input) => {
      const updated = await requireStore().update('recurringBills', id, billFields(input))
      setData((d) => ({ ...d, recurringBills: d.recurringBills.map((b) => (b.id === id ? updated : b)) }))
    },
    [billFields, requireStore],
  )

  const deleteBill = useCallback<DataContextValue['deleteBill']>(
    async (id) => {
      await requireStore().remove('recurringBills', id)
      setData((d) => ({ ...d, recurringBills: d.recurringBills.filter((b) => b.id !== id) }))
    },
    [requireStore],
  )

  const referenceDate = useMemo(() => getReferenceDate(data.transactions), [data.transactions])

  const value = useMemo<DataContextValue>(
    () => ({
      ...data,
      status,
      referenceDate,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addBudget,
      updateBudget,
      deleteBudget,
      addPot,
      updatePot,
      deletePot,
      movePotMoney,
      addBill,
      updateBill,
      deleteBill,
    }),
    [
      data,
      status,
      referenceDate,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addBudget,
      updateBudget,
      deleteBudget,
      addPot,
      updatePot,
      deletePot,
      movePotMoney,
      addBill,
      updateBill,
      deleteBill,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) throw new Error('useData must be used inside <DataProvider>')
  return context
}
