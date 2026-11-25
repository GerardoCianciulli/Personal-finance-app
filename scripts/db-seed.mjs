// Pure function shared by the json-server seed script (Node) and the in-browser store,
// so both start from identical data. Keep this file free of Node-only imports.

/**
 * Adds ids to every collection of data.json and derives one recurring bill per vendor
 * from the latest recurring transaction of that vendor.
 * @param {any} data
 */
export function buildDb(data) {
  const transactions = data.transactions.map((t, i) => ({ id: i + 1, ...t }))
  const budgets = data.budgets.map((b, i) => ({ id: i + 1, ...b }))
  const pots = data.pots.map((p, i) => ({ id: i + 1, ...p }))

  const latestByVendor = new Map()
  for (const t of transactions) {
    if (!t.recurring) continue
    const current = latestByVendor.get(t.name)
    if (!current || new Date(t.date) > new Date(current.date)) latestByVendor.set(t.name, t)
  }
  const recurringBills = [...latestByVendor.values()].map((t, i) => ({
    id: i + 1,
    name: t.name,
    avatar: t.avatar,
    category: t.category,
    amount: Math.abs(t.amount),
    dueDate: t.date.slice(0, 10),
  }))

  return { balance: { ...data.balance }, transactions, budgets, pots, recurringBills, users: [] }
}
