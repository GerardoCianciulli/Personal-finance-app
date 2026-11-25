export const CATEGORIES = [
  'Entertainment',
  'Bills',
  'Groceries',
  'Dining Out',
  'Transportation',
  'Personal Care',
  'Education',
  'Lifestyle',
  'Shopping',
  'General',
] as const

export const ALL_TRANSACTIONS = 'All Transactions'

export const SORT_OPTIONS = ['Latest', 'Oldest', 'A to Z', 'Z to A', 'Highest', 'Lowest'] as const

/** Theme colors from the design system, in the order of the Figma color dropdown */
export const THEMES = [
  { name: 'Green', hex: '#277C78' },
  { name: 'Yellow', hex: '#F2CDAC' },
  { name: 'Cyan', hex: '#82C9D7' },
  { name: 'Navy', hex: '#626070' },
  { name: 'Red', hex: '#C94736' },
  { name: 'Purple', hex: '#826CB0' },
  { name: 'Turquoise', hex: '#597C7C' },
  { name: 'Brown', hex: '#93674F' },
  { name: 'Magenta', hex: '#934F6F' },
  { name: 'Blue', hex: '#3F82B2' },
  { name: 'Navy Grey', hex: '#97A0AC' },
  { name: 'Army Green', hex: '#7F9161' },
  { name: 'Pink', hex: '#AF81BA' },
  { name: 'Gold', hex: '#CAB361' },
  { name: 'Orange', hex: '#BE6C49' },
] as const

export const TRANSACTIONS_PER_PAGE = 10

/** Bills unpaid this month and due within this many days of the latest transaction are "due soon" */
export const DUE_SOON_DAYS = 5

export const POT_NAME_MAX_LENGTH = 30
