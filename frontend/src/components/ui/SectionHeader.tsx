type Props = {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export default function SectionHeader({ title, subtitle, action }: Props) {
  return (
    <div className="section-head">
      <div>
        <div className="card-title">{title}</div>
        {subtitle ? <div className="card-subtext">{subtitle}</div> : null}
      </div>
      {action}
    </div>
  )
}
