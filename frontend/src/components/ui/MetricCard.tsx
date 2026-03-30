type Props = {
  label: string
  value: string | number
  helper?: string
  badge?: React.ReactNode
  className?: string
  onClick?: () => void
  active?: boolean
}

export default function MetricCard({ label, value, helper, badge, className = '', onClick, active = false }: Props) {
  const classes = `metric-card bento-card ${onClick ? 'hoverable metric-card-button' : ''} ${active ? 'metric-card-active' : ''} card-padding ${className}`

  if (onClick) {
    return (
      <button type="button" className={classes} onClick={onClick}>
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
      </button>
    )
  }

  return (
    <div className={classes}>
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
