import type { Transaction } from '../types'
import { formatDate, formatSignedMoney } from '../utils/format'
import Avatar from './Avatar'
import './TransactionItem.css'

interface TransactionItemProps {
  transaction: Transaction
  /** compact: overview card / budget "latest spending" (smaller text, avatar hidden on mobile) */
  variant?: 'default' | 'compact'
}

/** Name + amount/date row used on the overview and in each budget's latest spending */
export default function TransactionItem({ transaction, variant = 'default' }: TransactionItemProps) {
  const { name, avatar, amount, date } = transaction
  return (
    <li className={`tx-item tx-item--${variant}`}>
      <div className="tx-item__who">
        <Avatar name={name} src={avatar} />
        <span className="tx-item__name">{name}</span>
      </div>
      <div className="tx-item__meta">
        <span className={`tx-item__amount${amount > 0 ? ' text-positive' : ''}`}>{formatSignedMoney(amount)}</span>
        <time className="tx-item__date text-preset-5" dateTime={date}>
          {formatDate(date)}
        </time>
      </div>
    </li>
  )
}
