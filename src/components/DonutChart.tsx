import { formatMoneyShort } from '../utils/format'
import './DonutChart.css'

interface Segment {
  label: string
  value: number
  color: string
}

interface DonutChartProps {
  segments: Segment[]
  spent: number
  limit: number
}

/**
 * Budget donut: each budget's slice is proportional to its maximum, like the design.
 * Built with a CSS conic-gradient plus a translucent inner ring and white center.
 */
export default function DonutChart({ segments, spent, limit }: DonutChartProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  let start = 0
  const stops = segments.map((s) => {
    const end = start + (total > 0 ? (s.value / total) * 360 : 0)
    const stop = `${s.color} ${start}deg ${end}deg`
    start = end
    return stop
  })
  const background = total > 0 ? `conic-gradient(${stops.join(', ')})` : 'var(--color-grey-100)'
  const summary = `${formatMoneyShort(spent)} spent of ${formatMoneyShort(limit)} limit`

  return (
    <figure className="donut" role="img" aria-label={`Budget chart: ${summary}`}>
      <div className="donut__ring" style={{ background }} />
      <div className="donut__inner-ring" />
      <div className="donut__center">
        <span className="donut__spent">{formatMoneyShort(spent)}</span>
        <span className="donut__limit text-preset-5">of {formatMoneyShort(limit)} limit</span>
      </div>
    </figure>
  )
}
