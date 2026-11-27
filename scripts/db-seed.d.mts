import type { Database, Income, IncomeFrequency, Transaction, UserCollectionName } from '../src/types'

export const USER_COLLECTIONS: UserCollectionName[]
export const INCOME_TRANSACTION_NAMES: Record<IncomeFrequency, string>
export function toIsoDate(date: Date): string
export function endOfMonth(iso: string): string
export function referenceIsoDate(transactions: Pick<Transaction, 'date' | 'fromIncome'>[]): string
export function incomePaymentDates(firstPaymentDate: string, frequency: IncomeFrequency, until: string): string[]
export function incomeHorizon(firstPaymentDate: string, referenceDate: string): string
export function incomeTransactions(
  income: Pick<Income, 'amount' | 'frequency' | 'firstPaymentDate'>,
  referenceDate: string,
): Omit<Transaction, 'id' | 'userId'>[]
export function emptyDb(): Database
export function migrate(db: unknown): Database
export function nextId(list: { id: number }[]): number
