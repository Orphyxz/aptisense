type Props = {
  label: string
  value: string | number
  helper?: string
  badge?: React.ReactNode
  className?: string
}

export default function MetricCard({ label, value, helper, badge, className = '' }: Props) {
  return (
    <div className={`metric-card bento-card hoverable card-padding ${className}`}>
      <div className="card-header">
        <div>
          <div className="metric-label">{label}</div>
        </div>
        {badge}
      </div>

      <div className="metric-value mono">{value}</div>

      {helper ? (
        <div className="mt-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {helper}
        </div>
      ) : null}
    </div>
  )
}
