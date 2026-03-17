type Props = {
  title: string
  body: string
  footer?: string
}

export default function InsightCard({ title, body, footer }: Props) {
  return (
    <div className="insight-card bento-card card-padding">
      <div className="card-title mb-4">{title}</div>
      <div className="insight-box">
        <div className="text-base font-semibold leading-7">{body}</div>
        {footer ? (
          <div className="mt-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
