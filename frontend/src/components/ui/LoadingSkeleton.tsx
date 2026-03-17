type Props = {
  lines?: number
  className?: string
}

export default function LoadingSkeleton({ lines = 3, className = '' }: Props) {
  return (
    <div className={`skeleton-card ${className}`.trim()}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="skeleton-line"
          style={{ width: index === 0 ? '62%' : index === lines - 1 ? '48%' : '100%' }}
        />
      ))}
    </div>
  )
}
