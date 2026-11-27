// Pure functions shared by the json-server seed script (Node) and the in-browser store,
// so both work with identical data. Keep this file free of Node-only imports.
//
// Every user owns their own records: each balance, transaction, budget, pot, recurring bill
// and income carries the `userId` of the account it belongs to.

/** Collections whose records belong to one user */
export const USER_COLLECTIONS = ['balances', 'transactions', 'budgets', 'pots', 'recurringBills', 'incomes']

/* -------------------------------------------------------------------------- */
/* Income payment schedule                                                     */
/* -------------------------------------------------------------------------- */

const DAY = 24 * 60 * 60 * 1000
const pad = (n) => String(n).padStart(2, '0')
/** yyyy-mm-dd of a UTC date */
export const toIsoDate = (date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
const parseIsoDate = (iso) => new Date(`${iso.slice(0, 10)}T00:00:00Z`)

/** Last day of the month of an ISO date, as yyyy-mm-dd */
export function endOfMonth(iso) {
  const d = parseIsoDate(iso)
  return toIsoDate(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)))
}

/**
 * The app's "today": the date of the latest transaction, ignoring scheduled income payments
 * (which can be post-dated). With the sample data this is 19 August 2024.
 * @param {{ date: string, fromIncome?: boolean }[]} transactions
 */
export function referenceIsoDate(transactions) {
  const real = transactions.filter((t) => !t.fromIncome)
  const list = real.length ? real : transactions
  if (!list.length) return new Date().toISOString().slice(0, 10)
  return list.reduce((latest, t) => (t.date > latest ? t.date : latest), list[0].date).slice(0, 10)
}

/**
 * Payment dates of an income from its first payment date up to and including `until`:
 * every 7 days (weekly), 14 days (biweekly) or on the same day each month (monthly,
 * moved to the last day in shorter months).
 * @param {string} firstPaymentDate yyyy-mm-dd
 * @param {'weekly' | 'biweekly' | 'monthly'} frequency
 * @param {string} until yyyy-mm-dd
 */
export function incomePaymentDates(firstPaymentDate, frequency, until) {
  const start = parseIsoDate(firstPaymentDate)
  const end = parseIsoDate(until)
  const dates = []
  for (let i = 0; i < 1000; i++) {
    let date
    if (frequency === 'monthly') {
      const year = start.getUTCFullYear()
      const month = start.getUTCMonth() + i
      const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
      date = new Date(Date.UTC(year, month, Math.min(start.getUTCDate(), lastDay)))
    } else {
      date = new Date(start.getTime() + i * (frequency === 'weekly' ? 7 : 14) * DAY)
    }
    if (date > end || Number.isNaN(date.getTime())) break
    dates.push(toIsoDate(date))
  }
  return dates
}

/**
 * Payments are scheduled up to the end of the current month (the month of the app's "today"),
 * or to the end of the first payment's month when that is later, so it always shows up.
 * @param {string} firstPaymentDate
 * @param {string} referenceDate yyyy-mm-dd
 */
export function incomeHorizon(firstPaymentDate, referenceDate) {
  return endOfMonth(firstPaymentDate > referenceDate ? firstPaymentDate : referenceDate)
}

export const INCOME_TRANSACTION_NAMES = {
  weekly: 'Weekly Income',
  biweekly: 'Biweekly Income',
  monthly: 'Monthly Income',
}

/**
 * The transactions an income creates: one deposit per payment date, post-dated up to the end
 * of the month. They are marked `fromIncome` so they can be rebuilt when incomes change.
 * @param {{ amount: number, frequency: 'weekly' | 'biweekly' | 'monthly', firstPaymentDate: string }} income
 * @param {string} referenceDate yyyy-mm-dd
 */
export function incomeTransactions(income, referenceDate) {
  return incomePaymentDates(income.firstPaymentDate, income.frequency, incomeHorizon(income.firstPaymentDate, referenceDate)).map(
    (date) => ({
      avatar: '',
      name: INCOME_TRANSACTION_NAMES[income.frequency],
      category: 'General',
      date: `${date}T00:00:00Z`,
      amount: income.amount,
      recurring: false,
      fromIncome: true,
    }),
  )
}

/** An empty database: accounts are created at sign up, each with its own copy of the sample data */
export function emptyDb() {
  return { users: [], ...Object.fromEntries(USER_COLLECTIONS.map((name) => [name, []])) }
}

/**
 * A new user's own copy of the sample data (records without ids; the store assigns them).
 * The sample has one income figure, which becomes one monthly income the user can edit.
 * Recurring bills: one per vendor, from that vendor's latest recurring transaction.
 * @param {any} data contents of data.json
 * @param {number} userId
 */
export function buildUserData(data, userId) {
  const transactions = data.transactions.map((t) => ({ ...t, userId }))
  // The sample's income is one monthly payment, first paid on the 1st of the current month
  const reference = referenceIsoDate(transactions)
  const income = { amount: data.balance.income, frequency: 'monthly', firstPaymentDate: `${reference.slice(0, 7)}-01` }

  const latestByVendor = new Map()
  for (const t of transactions) {
    if (!t.recurring) continue
    const current = latestByVendor.get(t.name)
    if (!current || new Date(t.date) > new Date(current.date)) latestByVendor.set(t.name, t)
  }

  return {
    balances: [{ ...data.balance, userId }],
    transactions: [...transactions, ...incomeTransactions(income, reference).map((t) => ({ ...t, userId }))],
    budgets: data.budgets.map((b) => ({ ...b, userId })),
    pots: data.pots.map((p) => ({ ...p, userId })),
    recurringBills: [...latestByVendor.values()].map((t) => ({
      name: t.name,
      avatar: t.avatar,
      category: t.category,
      amount: Math.abs(t.amount),
      dueDate: t.date.slice(0, 10),
      userId,
    })),
    incomes: [{ ...income, userId }],
  }
}

/**
 * Upgrades a database saved by an earlier version of the app, where every account shared one
 * set of data (a single `balance` object and records without `userId`). That shared data is
 * kept for the oldest account; any other account gets its own copy of the sample data the next
 * time it signs in. Returns the same object when the database is already up to date.
 * @param {any} db
 */
export function migrate(db) {
  const isLegacy = db.balance !== undefined
  const missingCollection = ['users', ...USER_COLLECTIONS].some((name) => !Array.isArray(db[name]))
  const hasUnownedRecords = USER_COLLECTIONS.some((name) =>
    (db[name] ?? []).some((record) => record.userId === undefined),
  )
  if (!isLegacy && !missingCollection && !hasUnownedRecords) return db

  const { balance, ...rest } = db
  const next = { ...emptyDb(), ...rest }
  const owner = next.users.reduce((min, user) => (min === undefined || user.id < min ? user.id : min), undefined)
  const legacyIncome = balance?.income ?? 0

  for (const name of USER_COLLECTIONS) {
    const records = next[name] ?? []
    // Records nobody owns go to the oldest account, or are dropped when there are no accounts yet
    next[name] = owner === undefined
      ? records.filter((record) => record.userId !== undefined)
      : records.map((record) => (record.userId === undefined ? { ...record, userId: owner } : record))
  }

  if (owner !== undefined && balance) {
    const ownedIds = new Set(next.balances.map((b) => b.userId))
    if (!ownedIds.has(owner)) next.balances.push({ id: nextId(next.balances), ...balance, userId: owner })
    if (!next.incomes.some((i) => i.userId === owner)) {
      next.incomes.push({ id: nextId(next.incomes), amount: legacyIncome, frequency: 'monthly', userId: owner })
    }
  }
  return next
}

/** @param {{ id: number }[]} list */
export function nextId(list) {
  return list.reduce((max, item) => Math.max(max, item.id), 0) + 1
}
