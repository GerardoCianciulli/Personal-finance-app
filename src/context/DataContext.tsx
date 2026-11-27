import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { incomeTransactions, referenceIsoDate } from '../../scripts/db-seed.mjs'
import { getStore, type UserStore } from '../api/client'
import type { Balance, Budget, Income, Pot, RecurringBill, Transaction, UserData } from '../types'
import { findAvatar, getReferenceDate } from '../utils/finance'
import { useAuth } from './AuthContext'

interface FinanceData {
  balance: Balance
  /** Id of the signed-in user's balance record */
  balanceId: number
  transactions: Transaction[]
  budgets: Budget[]
  pots: Pot[]
  recurringBills: RecurringBill[]
  incomes: Income[]
}

// Pages pass the fields they edit; the provider adds the signed-in user's id
type NewTransaction = Omit<Transaction, 'id' | 'userId' | 'avatar' | 'recurring'>
type NewBill = Omit<RecurringBill, 'id' | 'userId' | 'avatar' | 'category'>
type NewBudget = Omit<Budget, 'id' | 'userId'>
type NewPot = Omit<Pot, 'id' | 'userId' | 'total'>
/** An income row from the Edit Income form: existing rows keep their id */
type IncomeInput = Omit<Income, 'id' | 'userId'> & { id?: number }

interface DataContextValue extends FinanceData {
  status: 'loading' | 'ready' | 'error'
  /** "Today" for the app: the date of the most recent transaction */
  referenceDate: Date
  addTransaction(input: NewTransaction): Promise<void>
  updateTransaction(id: number, input: NewTransaction): Promise<void>
  deleteTransaction(id: number): Promise<void>
  addBudget(input: NewBudget): Promise<void>
  updateBudget(id: number, input: NewBudget): Promise<void>
  deleteBudget(id: number): Promise<void>
  addPot(input: NewPot): Promise<void>
  updatePot(id: number, input: NewPot): Promise<void>
  deletePot(id: number): Promise<void>
  /** Positive amount adds money to the pot, negative withdraws it */
  movePotMoney(id: number, amount: number): Promise<void>
  addBill(input: NewBill): Promise<void>
  updateBill(id: number, input: NewBill): Promise<void>
  deleteBill(id: number): Promise<void>
  /** Replaces the list of incomes: creates new rows, updates changed ones, deletes removed ones */
  saveIncomes(list: IncomeInput[]): Promise<void>
}

const DataContext = createContext<DataContextValue | null>(null)

const EMPTY: FinanceData = {
  balance: { current: 0, income: 0, expenses: 0 },
  balanceId: 0,
  transactions: [],
  budgets: [],
  pots: [],
  recurringBills: [],
  incomes: [],
}

const round = (value: number) => Math.round(value * 100) / 100

/**
 * Replaces the scheduled income payments (transactions marked `fromIncome`) with the ones the
 * given incomes produce, post-dated up to the end of the month. Returns the full transaction list.
 */
async function rebuildIncomeTransactions(store: UserStore, transactions: Transaction[], incomes: Income[]) {
  const reference = referenceIsoDate(transactions)
  for (const t of transactions) if (t.fromIncome) await store.remove('transactions', t.id)
  const created: Transaction[] = []
  for (const income of incomes) {
    for (const payment of incomeTransactions(income, reference)) created.push(await store.create('transactions', payment))
  }
  return [...transactions.filter((t) => !t.fromIncome), ...created]
}

/**
 * Opens the account's store and loads its data, upgrading old incomes on the way. Shared while
 * in flight, so two simultaneous loads (e.g. React's development double-run) do the work once.
 */
const pendingAccountLoads = new Map<number, Promise<{ store: UserStore; data: UserData }>>()
function loadAccount(userId: number) {
  let promise = pendingAccountLoads.get(userId)
  if (!promise) {
    promise = (async () => {
      const store = await getStore(userId)
      return { store, data: await upgradeIncomes(store, await store.load()) }
    })().finally(() => pendingAccountLoads.delete(userId))
    pendingAccountLoads.set(userId, promise)
  }
  return promise
}

/** Incomes saved before they had a first payment date start on the 1st of the current month */
async function upgradeIncomes(store: UserStore, own: UserData): Promise<UserData> {
  if (own.incomes.every((income) => income.firstPaymentDate)) return own
  const firstOfMonth = `${referenceIsoDate(own.transactions).slice(0, 7)}-01`
  const incomes: Income[] = []
  for (const income of own.incomes) {
    incomes.push(
      income.firstPaymentDate ? income : await store.update('incomes', income.id, { firstPaymentDate: firstOfMonth }),
    )
  }
  return { ...own, incomes, transactions: await rebuildIncomeTransactions(store, own.transactions, incomes) }
}

/** Adds (direction 1) or reverses (direction -1) a transaction's effect on the balance */
const applyToBalance = (balance: Balance, amount: number, direction: 1 | -1): Balance => ({
  current: balance.current + direction * amount,
  income: balance.income + direction * Math.max(amount, 0),
  expenses: balance.expenses + direction * Math.max(-amount, 0),
})

/**
 * Provides the signed-in user's own data. It is keyed by user, so signing in as someone
 * else starts from an empty state and never shows the previous user's data.
 */
export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return (
    <UserDataProvider key={user?.id ?? 'signed-out'} userId={user?.id ?? null}>
      {children}
    </UserDataProvider>
  )
}

function UserDataProvider({ userId, children }: { userId: number | null; children: ReactNode }) {
  const [data, setData] = useState<FinanceData>(EMPTY)
  const [status, setStatus] = useState<DataContextValue['status']>('loading')
  const [store, setStore] = useState<UserStore | null>(null)

  useEffect(() => {
    if (userId === null) return
    let cancelled = false
    // The signed-in account's own store: it only reads and writes this user's data
    loadAccount(userId)
      .then(({ store: s, data: own }) => {
        if (cancelled) return
        const [balance] = own.balances
        setStore(s)
        setData({
          balance: { current: balance.current, income: balance.income, expenses: balance.expenses },
          balanceId: balance.id,
          transactions: own.transactions,
          budgets: own.budgets,
          pots: own.pots,
          recurringBills: own.recurringBills,
          incomes: own.incomes,
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
  }, [userId])

  const requireStore = useCallback(() => {
    if (!store) throw new Error('Data is still loading')
    return store
  }, [store])

  const saveBalance = useCallback(
    async (next: Balance) => {
      const saved = await requireStore().update('balances', data.balanceId, {
        current: round(next.current),
        income: round(next.income),
        expenses: round(next.expenses),
      })
      setData((d) => ({ ...d, balance: { current: saved.current, income: saved.income, expenses: saved.expenses } }))
    },
    [requireStore, data.balanceId],
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
      // Swap the old amount's effect on the balance for the new one (scheduled income payments
      // were never added to the balance, so only the new amount counts for them)
      const base = previous.fromIncome ? data.balance : applyToBalance(data.balance, previous.amount, -1)
      await saveBalance(previous.fromIncome ? base : applyToBalance(base, input.amount, 1))
    },
    [data, requireStore, saveBalance],
  )

  const deleteTransaction = useCallback<DataContextValue['deleteTransaction']>(
    async (id) => {
      const previous = data.transactions.find((t) => t.id === id)
      if (!previous) return
      await requireStore().remove('transactions', id)
      setData((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== id) }))
      // Scheduled income payments were never added to the balance
      if (!previous.fromIncome) await saveBalance(applyToBalance(data.balance, previous.amount, -1))
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

  const saveIncomes = useCallback<DataContextValue['saveIncomes']>(
    async (list) => {
      const s = requireStore()
      const keptIds = new Set(list.map((item) => item.id).filter((id): id is number => id !== undefined))
      for (const previous of data.incomes) {
        if (!keptIds.has(previous.id)) await s.remove('incomes', previous.id)
      }
      const saved: Income[] = []
      for (const { id, amount, frequency, firstPaymentDate } of list) {
        const previous = id === undefined ? undefined : data.incomes.find((i) => i.id === id)
        const unchanged =
          previous &&
          previous.amount === amount &&
          previous.frequency === frequency &&
          previous.firstPaymentDate === firstPaymentDate
        if (previous && unchanged) saved.push(previous)
        else if (previous) saved.push(await s.update('incomes', previous.id, { amount, frequency, firstPaymentDate }))
        else saved.push(await s.create('incomes', { amount, frequency, firstPaymentDate }))
      }
      // Each payment becomes a deposit on the Transactions page, post-dated to the end of the month
      const transactions = await rebuildIncomeTransactions(s, data.transactions, saved)
      setData((d) => ({ ...d, incomes: saved, transactions }))
    },
    [data.incomes, data.transactions, requireStore],
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
      saveIncomes,
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
      saveIncomes,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) throw new Error('useData must be used inside <DataProvider>')
  return context
}
