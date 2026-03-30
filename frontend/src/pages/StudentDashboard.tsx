import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from 'recharts'
import { api } from '../api'
import { useAuth } from '../auth-context'
import EmptyState from '../components/ui/EmptyState'
import LoadingSkeleton from '../components/ui/LoadingSkeleton'
import MetricCard from '../components/ui/MetricCard'
import InsightCard from '../components/ui/InsightCard'
import SectionHeader from '../components/ui/SectionHeader'
import { getErrorMessage } from '../error'

type Prediction = {
  successProbability: number
  readinessScore: number
  weakTopics: string[]
  shapValues: Record<string, number>
}

type StorySection = {
  name: string
  percentage?: number
  delta?: number
}

type Story = {
  trendDirection: 'up' | 'down' | 'flat' | 'first_attempt'
  scoreDelta: number | null
  strongestSection: StorySection | null
  weakestSection: StorySection | null
  strongestGain: StorySection | null
  biggestDrop: StorySection | null
  narrative: string
  nextStep: string
  latestTest: {
    title: string
    company: string
    level: 'Easy' | 'Medium' | 'Hard'
    pattern: string
  } | null
}

type DifficultySummary = Record<'Easy' | 'Medium' | 'Hard', {
  attempts: number
  avgScore: number
  latestScore: number | null
  bestScore: number | null
  students: number
}>

type NoteItem = {
  _id: string
  title: string
  description: string
  topics: string[]
  originalFileName: string
  fileUrl: string
  uploadedBy: {
    id: string
    name: string
    email: string
  }
  createdAt: string
}

type Analytics = {
  latestResult?: {
    avgScore: number
    sectionScores: Array<{ name: string; percentage: number }>
  }
  trend: Array<{ date: string; score: number; level: 'Easy' | 'Medium' | 'Hard'; attempt: number }>
  radar: Array<{ subject: string; score: number; fullMark: number }>
  difficultySummary: DifficultySummary
  resultsCount: number
  story: Story
}

type TestItem = {
  _id: string
  title: string
  company: string
  level: 'Easy' | 'Medium' | 'Hard'
  pattern: string
  timeLimit: number
}

const LEVEL_RANK: Record<TestItem['level'], number> = {
  Easy: 0,
  Medium: 1,
  Hard: 2,
}

export default function StudentDashboard() {
  const { user, token } = useAuth()
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [tests, setTests] = useState<TestItem[]>([])
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [error, setError] = useState('')
  const [companyFilter, setCompanyFilter] = useState<string>('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!user || !token) return
      try {
        const [pred, ana, t, notesData] = await Promise.all([
          api.getLatestPrediction(token).catch(() => null),
          api.getStudentAnalytics(user._id, token),
          api.getTests(token),
          api.getNotes(token),
        ])
        setPrediction(pred?.prediction || null)
        setAnalytics(ana)
        setNotes(notesData.notes || [])
        const fetchedTests = (t.tests || []) as TestItem[]
        setTests(
          [...fetchedTests].sort(
            (a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level],
          ),
        )
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [user, token])

  const gauge = useMemo(() => {
    const value = prediction?.successProbability || 0
    const radius = 72
    const circumference = 2 * Math.PI * radius
    const offset = circumference * (1 - value)
    return { value, radius, circumference, offset }
  }, [prediction])

  const insightText = useMemo(() => {
    if (!prediction) {
      return 'Take your first mock test to generate a readiness estimate, identify weak areas, and unlock personalized recommendations.'
    }

    const weakArea = prediction.weakTopics?.[0] || 'overall consistency'
    const probability = Math.round((prediction.successProbability || 0) * 100)

    return `You are currently ${probability}% placement-ready. Your biggest blocker right now is ${weakArea.toLowerCase()}, so the next best move is to take another timed mock and improve that section first.`
  }, [prediction])

  const predictionStoryText = useMemo(() => {
    if (!analytics?.story) return 'Your latest attempt story will appear here once analytics finish loading.'

    if (!prediction) return analytics.story.narrative

    const readiness = prediction.readinessScore
    const probability = Math.round((prediction.successProbability || 0) * 100)
    return `${analytics.story.narrative} Your readiness score is now ${readiness}, which translates to an estimated ${probability}% success probability.`
  }, [analytics, prediction])

  const trendData = useMemo(
    () => {
      const trendMap = new Map<number, {
        attempt: number
        easyScore: number | null
        mediumScore: number | null
        hardScore: number | null
      }>()

      trendMap.set(0, {
        attempt: 0,
        easyScore: 0,
        mediumScore: 0,
        hardScore: 0,
      })

      for (const point of analytics?.trend || []) {
        const existing = trendMap.get(point.attempt) || {
          attempt: point.attempt,
          easyScore: null,
          mediumScore: null,
          hardScore: null,
        }

        if (point.level === 'Easy') existing.easyScore = point.score
        if (point.level === 'Medium') existing.mediumScore = point.score
        if (point.level === 'Hard') existing.hardScore = point.score

        trendMap.set(point.attempt, existing)
      }

      return Array.from(trendMap.values()).sort((a, b) => a.attempt - b.attempt)
    },
    [analytics],
  )

  const hasTrendData = (analytics?.trend?.length || 0) > 0

  const companies = useMemo(
    () => ['All', ...new Set(tests.map((test) => test.company))],
    [tests],
  )

  const visibleTests = useMemo(
    () =>
      companyFilter === 'All'
        ? tests
        : tests.filter((test) => test.company === companyFilter),
    [companyFilter, tests],
  )

  return (
    <div className="page-wrap">
      <div className="mb-7">
        <h1 className="page-title">Student Dashboard</h1>
        <p className="page-subtitle">
          Your personal readiness cockpit for mock tests, performance, and placement probability.
        </p>
      </div>

      {error ? <div className="mb-4 text-sm text-red-600">{error}</div> : null}

      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <div className="xl:col-span-5"><LoadingSkeleton lines={6} /></div>
          <div className="xl:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-5">
            <LoadingSkeleton lines={4} />
            <LoadingSkeleton lines={4} />
            <LoadingSkeleton lines={4} className="md:col-span-2" />
            <LoadingSkeleton lines={5} />
            <LoadingSkeleton lines={5} />
          </div>
          <div className="xl:col-span-12"><LoadingSkeleton lines={4} /></div>
          <div className="xl:col-span-6"><LoadingSkeleton lines={6} /></div>
          <div className="xl:col-span-6"><LoadingSkeleton lines={6} /></div>
          <div className="xl:col-span-12"><LoadingSkeleton lines={6} /></div>
          <div className="xl:col-span-12"><LoadingSkeleton lines={6} /></div>
          <div className="xl:col-span-12"><LoadingSkeleton lines={6} /></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <div className="xl:col-span-5 bento-card card-padding">
            <SectionHeader
              title="Placement Success Probability"
              subtitle="Generated from your latest performance and attempt behavior"
            />

            <div className="flex flex-col items-center justify-center gap-3">
              <svg width="240" height="240" viewBox="0 0 240 240">
                <circle
                  cx="120"
                  cy="120"
                  r={gauge.radius}
                  fill="none"
                  stroke="#d6d9d9"
                  strokeWidth="18"
                />
                <circle
                  cx="120"
                  cy="120"
                  r={gauge.radius}
                  fill="none"
                  stroke="#0b9488"
                  strokeWidth="18"
                  strokeLinecap="round"
                  strokeDasharray={gauge.circumference}
                  strokeDashoffset={gauge.offset}
                  transform="rotate(-90 120 120)"
                />
                <text
                  x="120"
                  y="112"
                  textAnchor="middle"
                  className="mono"
                  style={{ fontSize: '40px', fontWeight: 800, fill: '#22384a' }}
                >
                  {Math.round(gauge.value * 100)}%
                </text>
              </svg>

              <div className="text-center max-w-md">
                <div className="text-lg font-bold">
                  Readiness Score: {prediction?.readinessScore ?? '-'}
                </div>
                <div className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  This score blends section performance, consistency, and recent attempts into one readiness estimate.
                </div>
              </div>
            </div>
          </div>

          <div className="xl:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-5">
            <MetricCard
              label="Readiness Score"
              value={prediction?.readinessScore ?? '-'}
              helper="Composite placement-readiness metric"
            />

            <MetricCard
              label="Tests Taken"
              value={analytics?.resultsCount ?? 0}
              helper="Completed mock tests so far"
            />

            <MetricCard
              label="Weakest Area"
              value={prediction?.weakTopics?.[0] || 'No data yet'}
              helper="Lowest-confidence section based on latest signal"
              className="md:col-span-2"
            />

            <InsightCard
              title="Recommended Next Action"
              body={insightText}
              footer="Keep improving the weakest section first. That gives the biggest score lift."
            />

            <InsightCard
              title="Prediction Story"
              body={predictionStoryText}
              footer={analytics?.story?.nextStep || 'Keep building a stronger attempt history to sharpen the prediction.'}
            />
          </div>

          <div className="xl:col-span-12 bento-card card-padding">
            <SectionHeader
              title="Difficulty Snapshot"
              subtitle="Separate analytics for Easy, Medium, and Hard mocks without changing your performance trend chart."
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {(['Easy', 'Medium', 'Hard'] as const).map((level) => (
                <MetricCard
                  key={level}
                  label={`${level} Analytics`}
                  value={`${analytics?.difficultySummary[level]?.avgScore ?? 0}%`}
                  helper={
                    analytics?.difficultySummary[level]?.attempts
                      ? `${analytics.difficultySummary[level].attempts} attempts • latest ${analytics.difficultySummary[level].latestScore}% • best ${analytics.difficultySummary[level].bestScore}%`
                      : 'No completed mocks at this difficulty yet'
                  }
                />
              ))}
            </div>
          </div>

          <div className="xl:col-span-6 bento-card card-padding">
            <SectionHeader
              title="Skill Profile"
              subtitle="Section-wise strength snapshot"
            />
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <RadarChart data={analytics?.radar || []}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" />
                  <Radar dataKey="score" stroke="#0b9488" fill="#0b9488" fillOpacity={0.24} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="xl:col-span-6 bento-card card-padding">
            <SectionHeader
              title="Prediction Breakdown"
              subtitle="What changed in your latest attempt and why your readiness moved."
            />
            <div className="grid md:grid-cols-2 gap-4 mb-5">
              <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
                <div className="metric-label">Latest Momentum</div>
                <div className="text-2xl font-extrabold mt-2">
                  {analytics?.story?.trendDirection === 'up'
                    ? `+${analytics.story.scoreDelta}%`
                    : analytics?.story?.trendDirection === 'down'
                      ? `${analytics.story.scoreDelta}%`
                      : analytics?.story?.trendDirection === 'flat'
                        ? '0%'
                        : 'First scored attempt'}
                </div>
                <div className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {analytics?.story?.latestTest
                    ? `${analytics.story.latestTest.company} ${analytics.story.latestTest.level} pattern`
                    : 'No recent attempt data yet'}
                </div>
              </div>

              <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
                <div className="metric-label">Focus Section</div>
                <div className="text-2xl font-extrabold mt-2">
                  {analytics?.story?.weakestSection?.name || 'No data yet'}
                </div>
                <div className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {analytics?.story?.weakestSection?.percentage !== undefined
                    ? `Latest section score: ${analytics.story.weakestSection.percentage}%`
                    : 'Take a mock to identify the section that needs the most attention.'}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="insight-box">
                <div className="font-bold text-lg">Strongest Gain</div>
                <div className="mt-2 text-sm leading-7">
                  {analytics?.story?.strongestGain
                    ? `${analytics.story.strongestGain.name} improved by +${analytics.story.strongestGain.delta} points compared with the previous attempt.`
                    : 'No positive section jump yet, or this is your first attempt.'}
                </div>
              </div>

              <div className="insight-box">
                <div className="font-bold text-lg">Biggest Drop</div>
                <div className="mt-2 text-sm leading-7">
                  {analytics?.story?.biggestDrop
                    ? `${analytics.story.biggestDrop.name} dropped by ${analytics.story.biggestDrop.delta} points compared with the previous attempt.`
                    : 'No section drop detected in the latest comparison.'}
                </div>
              </div>
            </div>
          </div>

          <div className="xl:col-span-12 bento-card card-padding">
            <SectionHeader
              title="Performance Trend"
              subtitle="Your average test score by attempt count for each difficulty"
            />
            {hasTrendData ? (
              <>
                <div className="mb-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Each colored line begins at the origin `(0, 0)` and then follows the real score at each attempt for that difficulty. Straight segments are intentional here, so the chart does not imply fake curved growth between sparse attempts.
                </div>
                <div style={{ width: '100%', height: 290 }}>
                  <ResponsiveContainer>
                    <LineChart data={trendData}>
                      <CartesianGrid stroke="#e7eaea" vertical={false} />
                      <XAxis
                        type="number"
                        dataKey="attempt"
                        domain={[0, 'dataMax']}
                        allowDecimals={false}
                        tick={{ fill: '#6a868a', fontSize: 12 }}
                      />
                      <YAxis domain={[0, 100]} tick={{ fill: '#6a868a', fontSize: 12 }} />
                      <Tooltip
                        labelFormatter={(value) => `Attempt ${value}`}
                        formatter={(value, name) => value === null ? null : [`${value}%`, name]}
                      />
                      <Legend />
                      <Line
                        type="linear"
                        dataKey="easyScore"
                        name="Easy"
                        stroke="#2ecc71"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                        connectNulls={false}
                      />
                      <Line
                        type="linear"
                        dataKey="mediumScore"
                        name="Medium"
                        stroke="#f4c430"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                        connectNulls={false}
                      />
                      <Line
                        type="linear"
                        dataKey="hardScore"
                        name="Hard"
                        stroke="#e74c3c"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <EmptyState
                title="No trend data yet"
                description="Complete at least one mock test to start drawing your Easy, Medium, and Hard performance curves."
              />
            )}
          </div>

          <div className="xl:col-span-12 bento-card card-padding">
            <SectionHeader
              title="Notes Library"
              subtitle="Topic-wise PDFs shared by admin for revision before your next mock."
              action={
                <div className="status-pill" style={{ background: 'rgba(11,148,136,0.10)', color: '#0b9488' }}>
                  {notes.length} notes available
                </div>
              }
            />

            {notes.length ? (
              <div className="notes-grid">
                {notes.map((note) => (
                  <div key={note._id} className="note-card">
                    <div className="text-lg font-bold">{note.title}</div>
                    <div className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {note.description || 'Open this PDF for a guided revision pass before your next test.'}
                    </div>

                    <div className="card-meta-row mt-4">
                      {note.topics.length
                        ? note.topics.map((topic) => <span key={`${note._id}-${topic}`}>{topic}</span>)
                        : <span>General Revision</span>}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        Added by {note.uploadedBy.name} on {new Date(note.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                      </div>
                      <a href={note.fileUrl} target="_blank" rel="noreferrer" className="primary-btn">
                        Open PDF
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No notes shared yet"
                description="Once your admin uploads PDFs, this section will show topics and direct reading links."
              />
            )}
          </div>

          <div className="xl:col-span-12 bento-card card-padding">
            <SectionHeader
              title="Available Mock Tests"
              subtitle="Choose a company pattern and difficulty level, then refresh your prediction with a full 60-minute mock."
              action={
                <Link to="/student/history">
                  <button className="secondary-btn">View Attempt History</button>
                </Link>
              }
            />

            <div className="card-meta-row mb-4">
              {companies.map((company) => (
                <button
                  key={company}
                  className={companyFilter === company ? 'primary-btn' : 'secondary-btn'}
                  onClick={() => setCompanyFilter(company)}
                >
                  {company}
                </button>
              ))}
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {visibleTests.map((test) => (
                <div
                  key={test._id}
                  className="bento-card hoverable p-5"
                  style={{ borderRadius: '24px' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-bold">{test.title}</div>
                      <div className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {test.pattern}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="status-pill" style={{ background: 'rgba(34,56,74,0.08)', color: '#22384a' }}>
                        {test.company}
                      </div>
                      <div
                        className="status-pill"
                        style={{
                          background:
                            test.level === 'Easy'
                              ? 'rgba(11,148,136,0.10)'
                              : test.level === 'Medium'
                                ? 'rgba(244,163,97,0.14)'
                                : 'rgba(231,111,81,0.14)',
                          color:
                            test.level === 'Easy'
                              ? '#0b9488'
                              : test.level === 'Medium'
                                ? '#b56a16'
                                : '#c44536',
                        }}
                      >
                        {test.level}
                      </div>
                      <div className="status-pill" style={{ background: 'rgba(79,125,243,0.10)', color: '#4f7df3' }}>
                        {test.timeLimit} min
                      </div>
                    </div>
                  </div>

                  <div className="soft-divider"></div>

                  <div className="card-meta-row">
                    <span>3 sections</span>
                    <span>30 questions</span>
                    <span>Timed assessment</span>
                  </div>

                  <div className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
                    Timed aptitude simulation with section-wise evaluation and readiness update.
                  </div>

                  <Link to={`/test/${test._id}`}>
                    <button className="primary-btn w-full">Start Mock Test</button>
                  </Link>
                </div>
              ))}
            </div>

            {!visibleTests.length ? (
              <div className="mt-5">
                <EmptyState
                  title="No mocks for this pattern yet"
                  description="Switch the company filter to explore a different mock pattern."
                />
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
