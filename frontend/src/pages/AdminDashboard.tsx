import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth-context'
import EmptyState from '../components/ui/EmptyState'
import LoadingSkeleton from '../components/ui/LoadingSkeleton'
import MetricCard from '../components/ui/MetricCard'
import SectionHeader from '../components/ui/SectionHeader'
import { getErrorMessage } from '../error'

type BatchData = {
  summary: {
    totalStudents: number
    safe: number
    moderate: number
    atRisk: number
    avgBatchScore: number
  }
  students: Array<{
    _id: string
    name: string
    email: string
    latestScore: number | null
    status: string
  }>
}

type HeatmapData = {
  heatmap: Array<{
    userId: string
    name: string
    status: string
  }>
}

type WeakTopicData = {
  weakTopics: Array<{
    topic: string
    count: number
    avgScore: number
  }>
}

export default function AdminDashboard() {
  const { token } = useAuth()
  const [batch, setBatch] = useState<BatchData | null>(null)
  const [heatmap, setHeatmap] = useState<HeatmapData | null>(null)
  const [weakTopics, setWeakTopics] = useState<WeakTopicData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!token) return
      try {
        const [b, h, w] = await Promise.all([
          api.getBatchAnalytics(token),
          api.getHeatmap(token),
          api.getWeakTopics(token),
        ])
        setBatch(b)
        setHeatmap(h)
        setWeakTopics(w)
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [token])

  function badge(status: string) {
    if (status === 'Safe') return 'badge-safe'
    if (status === 'Moderate') return 'badge-moderate'
    return 'badge-risk'
  }

  function tileColor(status: string) {
    if (status === 'Safe') return 'var(--color-completed)'
    if (status === 'Moderate') return 'var(--color-active)'
    return 'var(--color-closed)'
  }

  return (
    <div className="page-wrap">
      <div className="mb-7">
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">
          Batch-level visibility into readiness, weak areas, and students needing intervention.
        </p>
      </div>

      {error ? <div className="mb-4 text-red-600 text-sm">{error}</div> : null}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5 mb-5">
        <MetricCard label="Total Students" value={batch?.summary.totalStudents ?? 0} helper="Students in current batch" />
        <MetricCard label="Safe" value={batch?.summary.safe ?? 0} helper="Ready students" />
        <MetricCard label="Moderate" value={batch?.summary.moderate ?? 0} helper="Need focused practice" />
        <MetricCard label="At Risk" value={batch?.summary.atRisk ?? 0} helper="Require intervention" />
        <MetricCard label="Avg Batch Score" value={batch?.summary.avgBatchScore ?? 0} helper="Latest average score" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-5 bento-card card-padding">
          <SectionHeader
            title="Batch Heatmap"
            subtitle="Color-coded view of batch readiness"
          />
          {loading ? (
            <div className="grid gap-3">
              <LoadingSkeleton lines={3} />
              <LoadingSkeleton lines={3} />
            </div>
          ) : heatmap?.heatmap?.length ? (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
              {heatmap.heatmap.map((item) => (
                <div
                  key={item.userId}
                  className="rounded-2xl p-4 text-white"
                  style={{ background: tileColor(item.status), minHeight: 84 }}
                >
                  <div className="text-sm font-bold truncate">{item.name}</div>
                  <div className="mt-2 text-xs opacity-90">{item.status}</div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No student heatmap yet"
              description="Student readiness tiles will appear here once learners begin taking mocks."
            />
          )}
        </div>

        <div className="xl:col-span-7 bento-card card-padding">
          <SectionHeader
            title="Section Performance Overview"
            subtitle="Latest batch average per section, plus how many students are currently below 50%"
          />
          {loading ? (
            <div className="grid gap-3">
              <LoadingSkeleton lines={3} />
              <LoadingSkeleton lines={3} />
            </div>
          ) : weakTopics?.weakTopics?.length ? (
            <div className="space-y-3">
              {weakTopics.weakTopics.map((topic) => (
                <div
                  key={topic.topic}
                  className="rounded-2xl border p-4 flex items-center justify-between gap-4"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div>
                    <div className="font-bold">{topic.topic}</div>
                    <div className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                      Affected students: {topic.count}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="metric-label">Avg Score</div>
                    <div className="text-2xl font-extrabold mono">{topic.avgScore}%</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No weak topic signal yet"
              description="Once students complete more mocks, section-level patterns will appear here."
            />
          )}
        </div>

        <div className="xl:col-span-12 bento-card card-padding">
          <SectionHeader
            title="Student Performance Table"
            subtitle="Click a student name to open a detailed drill-down page"
          />
          {loading ? (
            <div className="grid gap-3">
              <LoadingSkeleton lines={3} />
              <LoadingSkeleton lines={3} />
            </div>
          ) : batch?.students?.length ? (
            <div className="table-shell">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Latest Score</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.students.map((student) => (
                    <tr key={student._id}>
                      <td className="font-semibold">
                        <Link to={`/admin/students/${student._id}`} style={{ color: 'var(--color-primary)' }}>
                          {student.name}
                        </Link>
                      </td>
                      <td>{student.email}</td>
                      <td className="mono">{student.latestScore ?? '-'}</td>
                      <td>
                        <span className={badge(student.status)}>{student.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No students to display"
              description="The student performance table will populate as soon as student accounts exist in the batch."
            />
          )}
        </div>
      </div>
    </div>
  )
}
