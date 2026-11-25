import { DUE_SOON_DAYS } from '../constants'
import type { BillStatus, Category, RecurringBill, SortOption, Transaction } from '../types'
import { dayOfMonth, formatDate, formatDueDay, formatMoney, formatSignedMoney } from './format'

/**
 * The app treats the date of the most recent transaction as "today"
 * (19 August 2024 in the sample data), so every monthly figure matches the design.
 */
export function getReferenceDate(transactions: Transaction[]): Date {
  if (transactions.length === 0) return new Date()
  return transactions.reduce((latest, t) => {
    const d = new Date(t.date)
    return d > latest ? d : latest
  }, new Date(transactions[0].date))
}

const isSameMonth = (a: Date, b: Date) =>
  a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth()

/** Money spent in a category during the reference month */
export function getBudgetSpent(category: Category, transactions: Transaction[], reference: Date): number {
  return transactions
    .filter((t) => t.category === category && t.amount < 0 && isSameMonth(new Date(t.date), reference))
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
}

/** The latest transactions of a category, regardless of month */
export function getLatestSpending(category: Category, transactions: Transaction[], count = 3): Transaction[] {
  return transactions
    .filter((t) => t.category === category)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, count)
}

/**
 * Paid: a payment to the same vendor exists in the reference month.
 * Due soon: unpaid and due within DUE_SOON_DAYS days of the reference date.
 * Upcoming: every other unpaid bill.
 */
export function getBillStatus(bill: RecurringBill, transactions: Transaction[], reference: Date): BillStatus {
  const name = bill.name.trim().toLowerCase()
  const paid = transactions.some(
    (t) => t.amount < 0 && t.name.trim().toLowerCase() === name && isSameMonth(new Date(t.date), reference),
  )
  if (paid) return 'paid'
  return dayOfMonth(bill.dueDate) <= reference.getUTCDate() + DUE_SOON_DAYS ? 'due-soon' : 'upcoming'
}

export interface BillSummary {
  paid: { count: number; total: number }
  upcoming: { count: number; total: number }
  dueSoon: { count: number; total: number }
  total: number
}

export function getBillSummary(bills: RecurringBill[], transactions: Transaction[], reference: Date): BillSummary {
  const summary: BillSummary = {
    paid: { count: 0, total: 0 },
    upcoming: { count: 0, total: 0 },
    dueSoon: { count: 0, total: 0 },
    total: 0,
  }
  for (const bill of bills) {
    const status = getBillStatus(bill, transactions, reference)
    summary.total += bill.amount
    if (status === 'paid') {
      summary.paid.count += 1
      summary.paid.total += bill.amount
      continue
    }
    // Bills due soon are still upcoming, so they count towards both totals (as in the design)
    summary.upcoming.count += 1
    summary.upcoming.total += bill.amount
    if (status === 'due-soon') {
      summary.dueSoon.count += 1
      summary.dueSoon.total += bill.amount
    }
  }
  return summary
}

const normalize = (value: string) => value.toLowerCase().replace(/[\s,]+/g, ' ').trim()

/** Matches recipient/sender, category, date (e.g. "19 aug", "2024-08-19") and amount ("75.5", "$75.50", "-55") */
export function matchesTransaction(t: Transaction, query: string): boolean {
  const q = normalize(query)
  if (!q) return true
  const amount = Math.abs(t.amount)
  const haystack = [
    t.name,
    t.category,
    formatDate(t.date),
    t.date.slice(0, 10),
    formatSignedMoney(t.amount),
    formatMoney(t.amount),
    amount.toFixed(2),
    String(amount),
  ]
  return haystack.some((value) => normalize(value).includes(q))
}

/** Matches bill title, due date ("monthly - 2nd", "2nd", "2024-08-02") and amount */
export function matchesBill(bill: RecurringBill, query: string): boolean {
  const q = normalize(query)
  if (!q) return true
  const haystack = [
    bill.name,
    formatDueDay(bill.dueDate),
    bill.dueDate,
    formatMoney(bill.amount),
    bill.amount.toFixed(2),
    String(bill.amount),
  ]
  return haystack.some((value) => normalize(value).includes(q))
}

export function sortTransactions(list: Transaction[], sort: SortOption): Transaction[] {
  const sorted = [...list]
  const time = (t: Transaction) => new Date(t.date).getTime()
  switch (sort) {
    case 'Latest':
      return sorted.sort((a, b) => time(b) - time(a))
    case 'Oldest':
      return sorted.sort((a, b) => time(a) - time(b))
    case 'A to Z':
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
    case 'Z to A':
      return sorted.sort((a, b) => b.name.localeCompare(a.name))
    case 'Highest':
      return sorted.sort((a, b) => b.amount - a.amount)
    case 'Lowest':
      return sorted.sort((a, b) => a.amount - b.amount)
  }
}

/** "Latest" for bills means the earliest due day in the month */
export function sortBills(list: RecurringBill[], sort: SortOption): RecurringBill[] {
  const sorted = [...list]
  const day = (b: RecurringBill) => dayOfMonth(b.dueDate)
  switch (sort) {
    case 'Latest':
      return sorted.sort((a, b) => day(a) - day(b) || a.name.localeCompare(b.name))
    case 'Oldest':
      return sorted.sort((a, b) => day(b) - day(a) || a.name.localeCompare(b.name))
    case 'A to Z':
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
    case 'Z to A':
      return sorted.sort((a, b) => b.name.localeCompare(a.name))
    case 'Highest':
      return sorted.sort((a, b) => b.amount - a.amount)
    case 'Lowest':
      return sorted.sort((a, b) => a.amount - b.amount)
  }
}

/** Reuses an avatar already known for a vendor/person with the same name */
export function findAvatar(name: string, sources: { name: string; avatar: string }[]): string {
  const key = name.trim().toLowerCase()
  return sources.find((s) => s.avatar && s.name.trim().toLowerCase() === key)?.avatar ?? ''
}
