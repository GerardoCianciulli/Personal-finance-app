import type { CATEGORIES, SORT_OPTIONS } from './constants'

export type Category = (typeof CATEGORIES)[number]

export interface Balance {
  current: number
  income: number
  expenses: number
}

export interface Transaction {
  id: number
  avatar: string
  name: string
  category: Category
  /** ISO 8601 date-time string */
  date: string
  /** Positive for money received, negative for money spent */
  amount: number
  recurring: boolean
}

export interface Budget {
  id: number
  category: Category
  maximum: number
  theme: string
}

export interface Pot {
  id: number
  name: string
  target: number
  total: number
  theme: string
}

export interface RecurringBill {
  id: number
  name: string
  avatar: string
  category: Category
  /** Positive amount billed every month */
  amount: number
  /** yyyy-mm-dd: the day of the month is the monthly due day */
  dueDate: string
}

export interface User {
  id: number
  name: string
  email: string
  passwordHash: string
}

export interface Database {
  balance: Balance
  transactions: Transaction[]
  budgets: Budget[]
  pots: Pot[]
  recurringBills: RecurringBill[]
  users: User[]
}

/** Shape of the provided data.json sample file */
export interface SampleData {
  balance: Balance
  transactions: Omit<Transaction, 'id'>[]
  budgets: Omit<Budget, 'id'>[]
  pots: Omit<Pot, 'id'>[]
}

export type CollectionName = 'transactions' | 'budgets' | 'pots' | 'recurringBills' | 'users'

export type CollectionItem<K extends CollectionName> = Database[K][number]

export type SortOption = (typeof SORT_OPTIONS)[number]

export type BillStatus = 'paid' | 'due-soon' | 'upcoming'
