import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth-context'
import EmptyState from '../components/ui/EmptyState'
import LoadingSkeleton from '../components/ui/LoadingSkeleton'
import SectionHeader from '../components/ui/SectionHeader'
import MetricCard from '../components/ui/MetricCard'
import { getErrorMessage } from '../error'
import { getStatusBadgeClass, type PerformanceStatus } from '../performance-status'

type Attempt = {
  _id: string
  sequence: number
  submittedAt: string
  avgScore: number
  accuracy: number
  timeTaken: number
  status: PerformanceStatus
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

type DifficultySummary = Record<'Easy' | 'Medium' | 'Hard', {
  attempts: number
  avgScore: number
  latestScore: number | null
  bestScore: number | null
  students: number
}>

export default function StudentHistoryPage() {
  const { user, token } = useAuth()
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [difficultySummary, setDifficultySummary] = useState<DifficultySummary | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!user || !token) return
      try {
        const data = await api.getStudentHistory(user._id, token)
        setAttempts(data.attempts || [])
        setDifficultySummary(data.difficultySummary || null)
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [token, user])

  const summary = useMemo(() => {
    const onTrack = attempts.filter((attempt) => attempt.status === 'On Track').length
    const buildingMomentum = attempts.filter((attempt) => attempt.status === 'Building Momentum').length
    const needsSupport = attempts.filter((attempt) => attempt.status === 'Needs Support').length

    return {
      total: attempts.length,
      onTrack,
      buildingMomentum,
      needsSupport,
    }
  }, [attempts])

  function levelStyle(level: Attempt['test']['level']) {
    if (level === 'Easy') {
      return { background: 'rgba(11,148,136,0.10)', color: '#0b9488' }
    }
    if (level === 'Medium') {
      return { background: 'rgba(244,163,97,0.14)', color: '#b56a16' }
    }
    return { background: 'rgba(231,111,81,0.14)', color: '#c44536' }
  }

  return (
    <div className="page-wrap">
      <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="page-title">Attempt History</h1>
          <p className="page-subtitle">
            Review every mock test attempt, the difficulty level you chose, and how your performance changed over time.
          </p>
        </div>
        <Link to="/student">
          <button className="secondary-btn">Back to Dashboard</button>
        </Link>
      </div>

      {error ? <div className="mb-4 text-sm text-red-600">{error}</div> : null}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5 mb-6">
        <MetricCard label="Total Attempts" value={summary.total} helper="All completed mock submissions" />
        <MetricCard
          label="Easy Avg"
          value={`${difficultySummary?.Easy?.avgScore ?? 0}%`}
          helper={difficultySummary?.Easy?.attempts ? `${difficultySummary.Easy.attempts} easy attempts` : 'No easy attempts yet'}
        />
        <MetricCard
          label="Medium Avg"
          value={`${difficultySummary?.Medium?.avgScore ?? 0}%`}
          helper={difficultySummary?.Medium?.attempts ? `${difficultySummary.Medium.attempts} medium attempts` : 'No medium attempts yet'}
        />
        <MetricCard
          label="Hard Avg"
          value={`${difficultySummary?.Hard?.avgScore ?? 0}%`}
          helper={difficultySummary?.Hard?.attempts ? `${difficultySummary.Hard.attempts} hard attempts` : 'No hard attempts yet'}
        />
        <MetricCard label="On Track" value={summary.onTrack} helper="Confident attempts" />
      </div>

      <div className="bento-card card-padding">
        <SectionHeader
          title="Attempt Timeline"
          subtitle="Newest attempts appear first with score, accuracy, time taken, and section breakdown."
        />

        {loading ? (
          <div className="grid gap-4">
            <LoadingSkeleton lines={4} />
            <LoadingSkeleton lines={5} />
          </div>
        ) : null}

        {!loading && !attempts.length ? (
          <EmptyState
            title="No attempts yet"
            description="Take your first mock test to start building a useful history here."
          />
        ) : null}

        {!loading && attempts.length ? (
          <div className="space-y-5">
            {attempts.map((attempt) => (
              <div key={attempt._id} className="bento-card hoverable p-5" style={{ borderRadius: '24px' }}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="metric-label">Attempt {attempt.sequence}</div>
                    <div className="text-xl font-bold mt-1">{attempt.test.title}</div>
                    <div className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {attempt.test.pattern}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <div className="status-pill" style={levelStyle(attempt.test.level)}>{attempt.test.level}</div>
                    <div className={getStatusBadgeClass(attempt.status)}>{attempt.status}</div>
                  </div>
                </div>

                <div className="card-meta-row mt-4">
                  <span>{attempt.test.company}</span>
                  <span>{new Date(attempt.submittedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  <span>Accuracy {attempt.accuracy}%</span>
                  <span>Time {attempt.timeTaken}s</span>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mt-4 mb-4">
                  <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="metric-label">Average Score</div>
                    <div className="text-3xl font-extrabold mono mt-2">{attempt.avgScore}%</div>
                  </div>
                  <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="metric-label">Accuracy</div>
                    <div className="text-3xl font-extrabold mono mt-2">{attempt.accuracy}%</div>
                  </div>
                  <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="metric-label">Time Taken</div>
                    <div className="text-3xl font-extrabold mono mt-2">{attempt.timeTaken}s</div>
                  </div>
                </div>

                <div className="space-y-3">
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
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
