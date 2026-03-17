type Props = {
  title: string
  description: string
}

export default function EmptyState({ title, description }: Props) {
  return (
    <div className="empty-state">
      <div className="empty-state-kicker">AptiSense</div>
      <div className="empty-state-title">{title}</div>
      <div className="empty-state-copy">{description}</div>
    </div>
  )
}
