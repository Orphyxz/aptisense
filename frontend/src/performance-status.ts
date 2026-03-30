export type PerformanceStatus =
  | 'On Track'
  | 'Building Momentum'
  | 'Needs Support'
  | 'Getting Started'

export function getStatusBadgeClass(status: PerformanceStatus) {
  if (status === 'On Track') return 'badge-safe'
  if (status === 'Building Momentum') return 'badge-moderate'
  return 'badge-risk'
}

export function getStatusTileColor(status: PerformanceStatus) {
  if (status === 'On Track') return 'var(--color-completed)'
  if (status === 'Building Momentum') return 'var(--color-active)'
  if (status === 'Needs Support') return 'var(--color-closed)'
  return 'var(--color-secondary)'
}
