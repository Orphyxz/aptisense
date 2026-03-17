import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth-context'
import EmptyState from '../components/ui/EmptyState'
import LoadingSkeleton from '../components/ui/LoadingSkeleton'
import MetricCard from '../components/ui/MetricCard'
import SectionHeader from '../components/ui/SectionHeader'
import { getErrorMessage } from '../error'

type Attempt = {
  _id: string
  sequence: number
  submittedAt: string
  avgScore: number
  accuracy: number
  timeTaken: number
  status: 'Safe' | 'Moderate' | 'At Risk' | 'Not Attempted'
  test: {
    title: string
    company: string
    level: 'Easy' | 'Medium' | 'Hard'
    pattern: string
  }
  sectionScores: Array<{
    name: string
    correct: number
    total: number
    percentage: number
  }>
}

type StudentDetail = {
  student: {
    _id: string
    name: string
    email: string
    createdAt: string
  }
  summary: {
    totalAttempts: number
    avgScore: number
    bestScore: number
    latestScore: number | null
    safe: number
    moderate: number
    atRisk: number
  }
  levelBreakdown: {
    Easy: number
    Medium: number
    Hard: number
  }
  attempts: Attempt[]
}

export default function AdminStudentDetailPage() {
  const { id } = useParams()
  const { token } = useAuth()
  const [detail, setDetail] = useState<StudentDetail | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!id || !token) return
      try {
        const data = await api.getAdminStudentDetail(id, token)
        setDetail(data)
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [id, token])

  const strongestLevel = useMemo(() => {
    if (!detail) return 'None yet'
    const entries = Object.entries(detail.levelBreakdown) as Array<['Easy' | 'Medium' | 'Hard', number]>
    const best = entries.sort((a, b) => b[1] - a[1])[0]
    return best && best[1] > 0 ? best[0] : 'None yet'
  }, [detail])

  function badge(status: Attempt['status']) {
    if (status === 'Safe') return 'badge-safe'
    if (status === 'Moderate') return 'badge-moderate'
    return 'badge-risk'
  }

  function levelStyle(level: Attempt['test']['level']) {
    if (level === 'Easy') return { background: 'rgba(11,148,136,0.10)', color: '#0b9488' }
    if (level === 'Medium') return { background: 'rgba(244,163,97,0.14)', color: '#b56a16' }
    return { background: 'rgba(231,111,81,0.14)', color: '#c44536' }
  }

  return (
    <div className="page-wrap">
      <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="page-title">Student Detail</h1>
          <p className="page-subtitle">
            Deep-dive into one student's attempt history, difficulty mix, and current readiness pattern.
          </p>
        </div>
        <Link to="/admin">
          <button className="secondary-btn">Back to Admin Dashboard</button>
        </Link>
      </div>

      {error ? <div className="mb-4 text-sm text-red-600">{error}</div> : null}

      {loading ? (
        <div className="bento-card card-padding">
          <div className="grid gap-4">
            <LoadingSkeleton lines={3} />
            <LoadingSkeleton lines={5} />
          </div>
        </div>
      ) : null}

      {!loading && detail ? (
        <>
          <div className="bento-card card-padding mb-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="metric-label">Student Profile</div>
                <div className="text-2xl font-bold mt-1">{detail.student.name}</div>
                <div className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>{detail.student.email}</div>
                <div className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Joined {new Date(detail.student.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                </div>
              </div>
              <div className="card-meta-row">
                <span>Strongest mix: {strongestLevel}</span>
                <span>Total attempts: {detail.summary.totalAttempts}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5 mb-6">
            <MetricCard label="Average Score" value={`${detail.summary.avgScore}%`} helper="Across all attempts" />
            <MetricCard label="Best Score" value={`${detail.summary.bestScore}%`} helper="Highest attempt score" />
            <MetricCard label="Latest Score" value={detail.summary.latestScore !== null ? `${detail.summary.latestScore}%` : '-'} helper="Most recent submission" />
            <MetricCard label="Safe Attempts" value={detail.summary.safe} helper="Strong performances" />
            <MetricCard label="At Risk Attempts" value={detail.summary.atRisk} helper="Needs intervention" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 mb-6">
            <div className="xl:col-span-4 bento-card card-padding">
              <SectionHeader
                title="Difficulty Mix"
                subtitle="How often this student attempts each level"
              />
              <div className="space-y-3">
                {(['Easy', 'Medium', 'Hard'] as const).map((level) => (
                  <div
                    key={level}
                    className="rounded-2xl border p-4 flex items-center justify-between"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <div className="status-pill" style={levelStyle(level)}>{level}</div>
                    <div className="text-2xl font-extrabold mono">{detail.levelBreakdown[level]}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="xl:col-span-8 bento-card card-padding">
              <SectionHeader
                title="Attempt Feed"
                subtitle="Newest attempts first with section-wise breakdown"
              />
              <div className="space-y-4">
                {detail.attempts.length ? detail.attempts.map((attempt) => (
                  <div key={attempt._id} className="rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="metric-label">Attempt {attempt.sequence}</div>
                        <div className="font-bold text-lg mt-1">{attempt.test.title}</div>
                        <div className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                          {attempt.test.pattern}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <div className="status-pill" style={levelStyle(attempt.test.level)}>{attempt.test.level}</div>
                        <div className={badge(attempt.status)}>{attempt.status}</div>
                      </div>
                    </div>

                    <div className="card-meta-row mt-4">
                      <span>{attempt.test.company}</span>
                      <span>{new Date(attempt.submittedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      <span>Score {attempt.avgScore}%</span>
                      <span>Accuracy {attempt.accuracy}%</span>
                      <span>Time {attempt.timeTaken}s</span>
                    </div>

                    <div className="space-y-3 mt-4">
                      {attempt.sectionScores.map((section) => (
                        <div
                          key={`${attempt._id}-${section.name}`}
                          className="rounded-2xl border p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                          style={{ borderColor: 'var(--color-border)' }}
                        >
                          <div>
                            <div className="font-bold">{section.name}</div>
                            <div className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                              Correct {section.correct}/{section.total}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="metric-label">Section Score</div>
                            <div className="text-2xl font-extrabold mono">{section.percentage}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )) : (
                  <EmptyState
                    title="No attempts yet"
                    description="This student has not submitted any mock tests yet."
                  />
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
