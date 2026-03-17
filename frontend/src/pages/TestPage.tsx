import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth-context'
import { getErrorMessage } from '../error'
import LoadingSkeleton from '../components/ui/LoadingSkeleton'
import { useToast } from '../toast-context'

type TestType = {
  _id: string
  title: string
  company: string
  level: 'Easy' | 'Medium' | 'Hard'
  pattern: string
  timeLimit: number
  sections: Array<{
    name: string
    questions: Array<{
      question: string
      options: string[]
    }>
  }>
}

export default function TestPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token, user } = useAuth()
  const { showToast } = useToast()

  const [test, setTest] = useState<TestType | null>(null)
  const [tab, setTab] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function load() {
      if (!id || !token) return

      try {
        const data = await api.getTestById(id, token)
        setTest(data.test)
        setSecondsLeft((data.test.timeLimit || 30) * 60)
      } catch (err) {
        setError(getErrorMessage(err))
      }
    }

    void load()
  }, [id, token])

  const currentSection = useMemo(() => test?.sections?.[tab], [test, tab])

  function formatTime(total: number) {
    const mins = Math.floor(total / 60)
    const secs = total % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  function setAnswer(sectionName: string, questionIndex: number, optionIndex: number) {
    setAnswers((prev) => ({
      ...prev,
      [`${sectionName}-${questionIndex}`]: optionIndex,
    }))
  }

  const handleSubmit = useCallback(async () => {
    if (!id || !token || !test || submitting) return

    setSubmitting(true)
    setError('')

    try {
      const payloadAnswers = test.sections
        .flatMap((section) =>
          section.questions.map((_, questionIndex) => {
            const selected = answers[`${section.name}-${questionIndex}`]

            if (selected === undefined) return null

            return {
              sectionName: section.name,
              questionIndex,
              selectedOption: selected,
            }
          }),
        )
        .filter((item): item is { sectionName: string; questionIndex: number; selectedOption: number } => item !== null)

      const resultData = await api.submitTest(
        id,
        {
          answers: payloadAnswers,
          timeTaken: test.timeLimit * 60 - secondsLeft,
        },
        token,
      )

      const predictionData = await api.predict(token)
      const analyticsData = user ? await api.getStudentAnalytics(user._id, token) : null
      showToast({
        tone: 'success',
        title: 'Test submitted',
        message: 'Your result and prediction have been refreshed.',
      })

      navigate('/results', {
        state: {
          result: resultData.result,
          prediction: predictionData.prediction,
          story: analyticsData?.story,
        },
      })
    } catch (err) {
      setError(getErrorMessage(err))
      showToast({
        tone: 'error',
        title: 'Submission failed',
        message: getErrorMessage(err),
      })
      setSubmitting(false)
    }
  }, [answers, id, navigate, secondsLeft, showToast, submitting, test, token, user])

  useEffect(() => {
    if (!secondsLeft) return
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          void handleSubmit()
          return 0
        }

        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [handleSubmit, secondsLeft])

  if (!test) {
    return (
      <div className="page-wrap">
        <div className="bento-card card-padding">
          <div className="page-title" style={{ fontSize: '1.6rem' }}>Loading Test...</div>
          <div className="mt-5 grid gap-4">
            <LoadingSkeleton lines={4} />
            <LoadingSkeleton lines={4} />
          </div>
          {error ? <div className="mt-3 text-sm text-red-600">{error}</div> : null}
        </div>
      </div>
    )
  }

  return (
    <div className="page-wrap">
      <div className="bento-card card-padding mb-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="page-title" style={{ fontSize: '2rem' }}>{test.title}</h1>
            <p className="page-subtitle">{test.pattern}</p>
            <div className="card-meta-row mt-3">
              <span>{test.company}</span>
              <span>{test.level}</span>
              <span>60-minute company mock</span>
            </div>
          </div>

          <div
            className="status-pill"
            style={{
              background: 'rgba(11,148,136,0.10)',
              color: 'var(--color-primary)',
              border: '1px solid rgba(11,148,136,0.15)',
              padding: '10px 16px',
              fontSize: '1rem',
            }}
          >
            Time Left: <span className="mono">{formatTime(secondsLeft)}</span>
          </div>
        </div>
      </div>

      <div className="bento-card card-padding">
        <div className="flex flex-wrap gap-2 mb-6">
          {test.sections.map((section, index) => (
            <button
              key={section.name}
              onClick={() => setTab(index)}
              className={index === tab ? 'primary-btn' : 'secondary-btn'}
              style={{ minWidth: '180px' }}
            >
              {section.name}
            </button>
          ))}
        </div>

        <div className="space-y-5">
          {currentSection?.questions.map((q, qIndex) => {
            const current = answers[`${currentSection.name}-${qIndex}`]

            return (
              <div
                key={qIndex}
                className="bento-card hoverable p-5"
                style={{ borderRadius: '20px' }}
              >
                <div className="card-header">
                  <div>
                    <div className="metric-label mb-2">Question {qIndex + 1}</div>
                    <div className="text-lg font-bold leading-7">{q.question}</div>
                  </div>
                </div>

                <div className="grid gap-3 mt-4">
                  {q.options.map((option, optionIndex) => (
                    <label
                      key={optionIndex}
                      className="rounded-2xl border px-4 py-4 cursor-pointer transition-all"
                      style={{
                        borderColor:
                          current === optionIndex
                            ? 'var(--color-primary)'
                            : 'var(--color-border)',
                        background:
                          current === optionIndex
                            ? 'var(--color-highlight)'
                            : 'white',
                      }}
                    >
                      <input
                        type="radio"
                        className="mr-3"
                        checked={current === optionIndex}
                        onChange={() =>
                          setAnswer(currentSection.name, qIndex, optionIndex)
                        }
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <div
          className="mt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-2xl border p-4"
          style={{
            borderColor: 'var(--color-border)',
            background: 'rgba(255,255,255,0.85)',
          }}
        >
          <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Review your answers before submitting. This will update your dashboard analytics.
          </div>

          <button className="primary-btn" onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Test'}
          </button>
        </div>
      </div>
    </div>
  )
}
