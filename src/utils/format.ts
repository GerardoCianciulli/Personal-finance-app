const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const wholeCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

/** $1,234.50 (absolute value, no sign) */
export const formatMoney = (value: number) => currency.format(Math.abs(value))

/** $850 / $40.50: drops ".00" for whole numbers, like the design's chart totals */
export const formatMoneyShort = (value: number) => {
  const amount = Math.round(Math.abs(value) * 100) / 100
  return Number.isInteger(amount) ? wholeCurrency.format(amount) : currency.format(amount)
}

/** +$75.50 / -$55.50 */
export const formatSignedMoney = (value: number) => `${value < 0 ? '-' : '+'}${formatMoney(value)}`

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** 19 Aug 2024 (uses the UTC date so the result never shifts with the viewer's timezone) */
export const formatDate = (iso: string) => {
  const d = new Date(iso)
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

/** 1 -> 1st, 2 -> 2nd, 11 -> 11th, 23 -> 23rd */
export const ordinal = (n: number) => {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}

/** Day of month of a yyyy-mm-dd or ISO date string */
export const dayOfMonth = (date: string) => new Date(date.length === 10 ? `${date}T00:00:00Z` : date).getUTCDate()

/** Monthly - 2nd */
export const formatDueDay = (date: string) => `Monthly - ${ordinal(dayOfMonth(date))}`

/** 7.95%, 1.0%, 73.3%: truncated like the design (2 decimals below 10%, 1 decimal above) */
export const formatPercent = (value: number) => {
  const digits = Math.abs(value) < 10 ? 2 : 1
  const factor = 10 ** digits
  let text = (Math.floor(value * factor + 1e-9) / factor).toFixed(digits)
  if (digits === 2 && text.endsWith('0')) text = text.slice(0, -1)
  return `${text}%`
}

/** Resolves the relative avatar paths stored in the data (./assets/...) against the app base URL */
export const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\.?\//, '')}`

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
