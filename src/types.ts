import type { CATEGORIES, INCOME_FREQUENCIES, SORT_OPTIONS } from './constants'

export type Category = (typeof CATEGORIES)[number]

/** Every record below belongs to one account: the user who sees and edits it */
interface Owned {
  userId: number
}

export interface Balance {
  current: number
  income: number
  expenses: number
}

/** A user's balance, stored as one record per account */
export interface BalanceRecord extends Balance, Owned {
  id: number
}

export interface Transaction extends Owned {
  id: number
  avatar: string
  name: string
  category: Category
  /** ISO 8601 date-time string */
  date: string
  /** Positive for money received, negative for money spent */
  amount: number
  recurring: boolean
  /** A scheduled income payment created from the user's incomes (rebuilt when they change) */
  fromIncome?: boolean
}

export interface Budget extends Owned {
  id: number
  category: Category
  maximum: number
  theme: string
}

export interface Pot extends Owned {
  id: number
  name: string
  target: number
  total: number
  theme: string
}

export interface RecurringBill extends Owned {
  id: number
  name: string
  avatar: string
  category: Category
  /** Positive amount billed every month */
  amount: number
  /** yyyy-mm-dd: the day of the month is the monthly due day */
  dueDate: string
}

export type IncomeFrequency = (typeof INCOME_FREQUENCIES)[number]['value']

/** A regular source of income, e.g. a salary paid monthly */
export interface Income extends Owned {
  id: number
  amount: number
  frequency: IncomeFrequency
  /** yyyy-mm-dd of the first payment; later payments follow the frequency */
  firstPaymentDate: string
}

export interface User {
  id: number
  name: string
  email: string
  passwordHash: string
}

/** One user's own data */
export interface UserData {
  balances: BalanceRecord[]
  transactions: Transaction[]
  budgets: Budget[]
  pots: Pot[]
  recurringBills: RecurringBill[]
  incomes: Income[]
}

export type UserCollectionName = keyof UserData

/** Everything the store holds: all accounts and every account's own records */
export interface Database extends UserData {
  users: User[]
}

/** Shape of the provided data.json sample file */
export interface SampleData {
  balance: Balance
  transactions: Omit<Transaction, 'id' | 'userId'>[]
  budgets: Omit<Budget, 'id' | 'userId'>[]
  pots: Omit<Pot, 'id' | 'userId'>[]
}

export type CollectionName = keyof Database

export type CollectionItem<K extends CollectionName> = Database[K][number]

export type SortOption = (typeof SORT_OPTIONS)[number]

export type BillStatus = 'paid' | 'due-soon' | 'upcoming'
