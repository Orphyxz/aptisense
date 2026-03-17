import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useToast } from '../toast-context'

type SectionScore = {
  name: string
  correct: number
  total: number
  percentage: number
}

type ReviewQuestion = {
  questionIndex: number
  question: string
  options: string[]
  selectedOption: number | null
  correctAnswer: number
  isCorrect: boolean
}

type ReviewSection = {
  name: string
  questions: ReviewQuestion[]
}

type TestResult = {
  avgScore: number
  accuracy: number
  timeTaken: number
  sectionScores: SectionScore[]
  reviewSections?: ReviewSection[]
}

type Prediction = {
  successProbability: number
  readinessScore: number
  weakTopics: string[]
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

type ResultsLocationState = {
  result?: TestResult
  prediction?: Prediction
  story?: Story
}

export default function ResultsPage() {
  const location = useLocation()
  const { showToast } = useToast()
  const result = (location.state as ResultsLocationState | null)?.result
  const prediction = (location.state as ResultsLocationState | null)?.prediction
  const story = (location.state as ResultsLocationState | null)?.story
  const [showReview, setShowReview] = useState(false)

  const reviewSummary = useMemo(() => {
    const questions = result?.reviewSections?.flatMap((section) => section.questions) || []
    const correct = questions.filter((question) => question.isCorrect).length
    const unanswered = questions.filter((question) => question.selectedOption === null).length
    const incorrect = questions.length - correct - unanswered

    return {
      total: questions.length,
      correct,
      incorrect,
      unanswered,
    }
  }, [result])

  function escapeHtml(value: string) {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')
  }

  function exportPdfReport() {
    if (!result) return

    const sectionRows = result.sectionScores
      .map(
        (section) => `
          <tr>
            <td>${escapeHtml(section.name)}</td>
            <td>${section.correct}/${section.total}</td>
            <td>${section.percentage}%</td>
          </tr>
        `,
      )
      .join('')

    const reviewMarkup = (result.reviewSections || [])
      .map((section) => {
        const questions = section.questions
          .map((question) => {
            const selected =
              question.selectedOption === null
                ? 'Not answered'
                : question.options[question.selectedOption]
            const correct = question.options[question.correctAnswer]

            return `
              <div class="question-card">
                <div class="question-head">
                  <div>
                    <div class="eyebrow">Question ${question.questionIndex + 1}</div>
                    <div class="question-text">${escapeHtml(question.question)}</div>
                  </div>
                  <div class="pill ${question.isCorrect ? 'pill-green' : 'pill-red'}">
                    ${question.isCorrect ? 'Correct' : 'Incorrect'}
                  </div>
                </div>
                <div class="answer-row">
                  <div><strong>Your choice:</strong> ${escapeHtml(selected)}</div>
                  <div><strong>Correct answer:</strong> ${escapeHtml(correct)}</div>
                </div>
              </div>
            `
          })
          .join('')

        return `
          <section class="report-section">
            <h3>${escapeHtml(section.name)}</h3>
            ${questions}
          </section>
        `
      })
      .join('')

    const predictionMarkup = prediction || story
      ? `
        <section class="report-section">
          <h2>Prediction Update</h2>
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="eyebrow">Readiness Score</div>
              <div class="metric-value">${prediction?.readinessScore ?? '-'}</div>
            </div>
            <div class="metric-card">
              <div class="eyebrow">Success Probability</div>
              <div class="metric-value">${prediction ? `${Math.round(prediction.successProbability * 100)}%` : '-'}</div>
            </div>
            <div class="metric-card">
              <div class="eyebrow">Latest Momentum</div>
              <div class="metric-value">${
                story?.trendDirection === 'up'
                  ? `+${story.scoreDelta}%`
                  : story?.trendDirection === 'down'
                    ? `${story.scoreDelta}%`
                    : story?.trendDirection === 'flat'
                      ? '0%'
                      : 'New'
              }</div>
            </div>
          </div>
          <div class="callout">
            <strong>What changed:</strong> ${escapeHtml(
              story?.narrative || 'Prediction details will appear after your next refresh.',
            )}
          </div>
          <div class="two-col">
            <div class="mini-card">
              <div class="eyebrow">Best Improvement</div>
              <div class="mini-title">${escapeHtml(story?.strongestGain?.name || 'No comparison yet')}</div>
              <p>${
                story?.strongestGain
                  ? `Improved by +${story.strongestGain.delta} points versus the previous attempt.`
                  : 'This appears once there is a previous attempt to compare against.'
              }</p>
            </div>
            <div class="mini-card">
              <div class="eyebrow">Next Focus</div>
              <div class="mini-title">${escapeHtml(story?.weakestSection?.name || prediction?.weakTopics?.[0] || 'Keep practicing')}</div>
              <p>${escapeHtml(story?.nextStep || 'Use the section breakdown to decide where the next gain can come from.')}</p>
            </div>
          </div>
        </section>
      `
      : ''

    const reportHtml = `
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>AptiSense Result Report</title>
          <style>
            :root {
              --ink: #22384a;
              --muted: #6a868a;
              --line: #dbe5e6;
              --panel: #f7fbfb;
              --green: #1e8b4d;
              --red: #b53a2d;
              --teal: #0b9488;
            }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 32px;
              font-family: "Segoe UI", Arial, sans-serif;
              color: var(--ink);
              background: white;
            }
            h1, h2, h3, p { margin: 0; }
            h1 { font-size: 30px; margin-bottom: 8px; }
            h2 { font-size: 18px; margin-bottom: 14px; }
            h3 { font-size: 16px; margin-bottom: 12px; }
            .subtitle { color: var(--muted); margin-bottom: 24px; }
            .report-section { margin-bottom: 26px; }
            .metrics-grid, .two-col {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 14px;
            }
            .two-col { grid-template-columns: repeat(2, 1fr); margin-top: 14px; }
            .metric-card, .mini-card, .question-card, .callout {
              border: 1px solid var(--line);
              background: var(--panel);
              border-radius: 16px;
              padding: 14px;
            }
            .metric-value { font-size: 28px; font-weight: 800; margin-top: 8px; }
            .eyebrow {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.12em;
              color: var(--muted);
              font-weight: 700;
            }
            .mini-title { font-size: 18px; font-weight: 700; margin: 8px 0; }
            .callout { margin-top: 14px; line-height: 1.6; }
            table {
              width: 100%;
              border-collapse: collapse;
              border: 1px solid var(--line);
              border-radius: 16px;
              overflow: hidden;
            }
            th, td {
              padding: 12px 14px;
              border-bottom: 1px solid var(--line);
              text-align: left;
            }
            th {
              background: #eef5f5;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              color: var(--muted);
            }
            .question-card { margin-bottom: 12px; background: white; }
            .question-head {
              display: flex;
              justify-content: space-between;
              gap: 12px;
              margin-bottom: 10px;
            }
            .question-text { margin-top: 6px; font-weight: 600; line-height: 1.5; }
            .answer-row { display: grid; gap: 8px; color: var(--muted); }
            .pill {
              align-self: start;
              border-radius: 999px;
              padding: 6px 10px;
              font-size: 12px;
              font-weight: 700;
            }
            .pill-green { background: rgba(46, 204, 113, 0.12); color: var(--green); }
            .pill-red { background: rgba(231, 76, 60, 0.12); color: var(--red); }
            .footer {
              margin-top: 28px;
              color: var(--muted);
              font-size: 12px;
            }
            @media print {
              body { padding: 18px; }
              .question-card, .metric-card, .mini-card, .callout { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <header class="report-section">
            <div class="eyebrow">AptiSense</div>
            <h1>Mock Test Result Report</h1>
            <p class="subtitle">Generated on ${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
          </header>

          <section class="report-section">
            <h2>Performance Summary</h2>
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="eyebrow">Average Score</div>
                <div class="metric-value">${result.avgScore}%</div>
              </div>
              <div class="metric-card">
                <div class="eyebrow">Accuracy</div>
                <div class="metric-value">${result.accuracy}%</div>
              </div>
              <div class="metric-card">
                <div class="eyebrow">Time Taken</div>
                <div class="metric-value">${result.timeTaken}s</div>
              </div>
            </div>
          </section>

          ${predictionMarkup}

          <section class="report-section">
            <h2>Section Breakdown</h2>
            <table>
              <thead>
                <tr>
                  <th>Section</th>
                  <th>Correct</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                ${sectionRows}
              </tbody>
            </table>
          </section>

          ${
            reviewMarkup
              ? `<section class="report-section"><h2>Answer Review</h2>${reviewMarkup}</section>`
              : ''
          }

          <div class="footer">
            Save this print view as PDF from your browser to keep a polished copy of the result.
          </div>
        </body>
      </html>
    `

    const reportWindow = window.open('', '_blank', 'noopener,noreferrer,width=1100,height=900')
    if (!reportWindow) {
      showToast({
        tone: 'error',
        title: 'Export blocked',
        message: 'Please allow pop-ups for this site and try the PDF export again.',
      })
      return
    }

    reportWindow.document.open()
    reportWindow.document.write(reportHtml)
    reportWindow.document.close()
    reportWindow.focus()
    reportWindow.print()
    showToast({
      tone: 'success',
      title: 'PDF report ready',
      message: 'Use the print dialog to save the report as a PDF.',
    })
  }

  if (!result) {
    return (
      <div className="page-wrap">
        <div className="bento-card card-padding">
          <h1 className="page-title" style={{ fontSize: '1.8rem' }}>No Result Found</h1>
          <p className="page-subtitle">Looks like there's no recent test result loaded on this page.</p>

          <Link to="/student">
            <button className="primary-btn mt-5">Go to Dashboard</button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page-wrap">
      <div className="bento-card card-padding">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="page-title">Test Submitted Successfully</h1>
            <p className="page-subtitle">
              Your latest attempt has been saved and your prediction has been refreshed.
            </p>
          </div>
          <button className="secondary-btn" onClick={exportPdfReport}>
            Export PDF
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bento-card hoverable p-5" style={{ borderRadius: '20px' }}>
            <div className="metric-label">Average Score</div>
            <div className="metric-value mono mt-3">{result.avgScore}%</div>
            <div className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Overall average across sections
            </div>
          </div>

          <div className="bento-card hoverable p-5" style={{ borderRadius: '20px' }}>
            <div className="metric-label">Accuracy</div>
            <div className="metric-value mono mt-3">{result.accuracy}%</div>
            <div className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Correct answers out of total attempted
            </div>
          </div>

          <div className="bento-card hoverable p-5" style={{ borderRadius: '20px' }}>
            <div className="metric-label">Time Taken</div>
            <div className="metric-value mono mt-3">{result.timeTaken}s</div>
            <div className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Total time used in this attempt
            </div>
          </div>
        </div>

        <div className="insight-box mb-6">
          <div className="font-bold text-lg">Performance Summary</div>
          <div className="mt-2 text-sm leading-7">
            Your latest attempt has been recorded. Focus on the sections with the lowest score first,
            because improving weak sections usually increases overall readiness faster than polishing strong ones.
          </div>
        </div>

        {prediction || story ? (
          <div className="mb-6">
            <div className="section-title mb-4">Prediction Update</div>

            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="bento-card hoverable p-5" style={{ borderRadius: '20px' }}>
                <div className="metric-label">Readiness Score</div>
                <div className="metric-value mono mt-3">{prediction?.readinessScore ?? '-'}</div>
                <div className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Latest readiness estimate after this submission
                </div>
              </div>

              <div className="bento-card hoverable p-5" style={{ borderRadius: '20px' }}>
                <div className="metric-label">Success Probability</div>
                <div className="metric-value mono mt-3">
                  {prediction ? `${Math.round(prediction.successProbability * 100)}%` : '-'}
                </div>
                <div className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Predicted placement success likelihood
                </div>
              </div>

              <div className="bento-card hoverable p-5" style={{ borderRadius: '20px' }}>
                <div className="metric-label">Latest Momentum</div>
                <div className="metric-value mono mt-3">
                  {story?.trendDirection === 'up'
                    ? `+${story.scoreDelta}%`
                    : story?.trendDirection === 'down'
                      ? `${story.scoreDelta}%`
                      : story?.trendDirection === 'flat'
                        ? '0%'
                        : 'New'}
                </div>
                <div className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {story?.latestTest
                    ? `${story.latestTest.company} ${story.latestTest.level} mock`
                    : 'First scored attempt'}
                </div>
              </div>
            </div>

            <div className="insight-box mb-4">
              <div className="font-bold text-lg">What Changed</div>
              <div className="mt-2 text-sm leading-7">
                {story?.narrative || 'Prediction details will appear after your next refresh.'}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
                <div className="metric-label">Best Improvement</div>
                <div className="text-xl font-bold mt-2">
                  {story?.strongestGain?.name || 'No comparison yet'}
                </div>
                <div className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {story?.strongestGain
                    ? `Improved by +${story.strongestGain.delta} points versus the previous attempt.`
                    : 'This shows up once there is a previous attempt to compare against.'}
                </div>
              </div>

              <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
                <div className="metric-label">Next Focus</div>
                <div className="text-xl font-bold mt-2">
                  {story?.weakestSection?.name || prediction?.weakTopics?.[0] || 'Keep practicing'}
                </div>
                <div className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {story?.nextStep || 'Use the section breakdown below to decide where the next gain can come from.'}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mb-4">
          <div className="section-title">Section Breakdown</div>
        </div>

        <div className="space-y-3">
          {result.sectionScores.map((section) => (
            <div
              key={section.name}
              className="rounded-2xl border p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div>
                <div className="font-bold text-base">{section.name}</div>
                <div className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  Correct: {section.correct}/{section.total}
                </div>
              </div>

              <div className="text-right">
                <div className="metric-label">Section Score</div>
                <div className="text-2xl font-extrabold mono">{section.percentage}%</div>
              </div>
            </div>
          ))}
        </div>

        {result.reviewSections?.length ? (
          <div className="mt-8">
            <div className="section-head">
              <div>
                <div className="card-title">Answer Review</div>
                <div className="card-subtext">
                  Compare what you selected with the correct answer for each question.
                </div>
              </div>
              <button className="secondary-btn" onClick={() => setShowReview((prev) => !prev)}>
                {showReview ? 'Hide Answer Review' : 'View Answer Review'}
              </button>
            </div>

            {showReview ? (
              <>
                <div className="grid gap-4 md:grid-cols-4 mb-5">
                  <div className="bento-card p-4" style={{ borderRadius: '20px' }}>
                    <div className="metric-label">Total Questions</div>
                    <div className="text-3xl font-extrabold mono mt-2">{reviewSummary.total}</div>
                  </div>
                  <div className="bento-card p-4" style={{ borderRadius: '20px' }}>
                    <div className="metric-label">Correct</div>
                    <div className="text-3xl font-extrabold mono mt-2" style={{ color: '#1e8b4d' }}>{reviewSummary.correct}</div>
                  </div>
                  <div className="bento-card p-4" style={{ borderRadius: '20px' }}>
                    <div className="metric-label">Incorrect</div>
                    <div className="text-3xl font-extrabold mono mt-2" style={{ color: '#b53a2d' }}>{reviewSummary.incorrect}</div>
                  </div>
                  <div className="bento-card p-4" style={{ borderRadius: '20px' }}>
                    <div className="metric-label">Unanswered</div>
                    <div className="text-3xl font-extrabold mono mt-2" style={{ color: '#8d6f00' }}>{reviewSummary.unanswered}</div>
                  </div>
                </div>

                <div className="space-y-5">
                  {result.reviewSections?.map((section) => (
                    <div key={section.name} className="bento-card card-padding">
                      <div className="card-title">{section.name}</div>
                      <div className="space-y-4 mt-4">
                        {section.questions.map((question) => (
                          <div
                            key={`${section.name}-${question.questionIndex}`}
                            className="rounded-2xl border p-4"
                            style={{ borderColor: 'var(--color-border)' }}
                          >
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                              <div>
                                <div className="metric-label">Question {question.questionIndex + 1}</div>
                                <div className="font-semibold mt-1">{question.question}</div>
                              </div>
                              <div
                                className={question.isCorrect ? 'badge-safe' : 'badge-risk'}
                                style={{ alignSelf: 'flex-start' }}
                              >
                                {question.isCorrect ? 'Correct' : 'Incorrect'}
                              </div>
                            </div>

                            <div className="grid gap-3 mt-4">
                              {question.options.map((option, index) => {
                                const isSelected = question.selectedOption === index
                                const isCorrect = question.correctAnswer === index

                                return (
                                  <div
                                    key={index}
                                    className="rounded-2xl border px-4 py-3"
                                    style={{
                                      borderColor: isCorrect
                                        ? 'rgba(46, 204, 113, 0.5)'
                                        : isSelected
                                          ? 'rgba(231, 76, 60, 0.4)'
                                          : 'var(--color-border)',
                                      background: isCorrect
                                        ? 'rgba(46, 204, 113, 0.10)'
                                        : isSelected
                                          ? 'rgba(231, 76, 60, 0.08)'
                                          : 'rgba(255,255,255,0.8)',
                                    }}
                                  >
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                      <div>{option}</div>
                                      <div className="flex gap-2 flex-wrap">
                                        {isSelected ? <span className="badge-risk">Your choice</span> : null}
                                        {isCorrect ? <span className="badge-safe">Correct answer</span> : null}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>

                            {question.selectedOption === null ? (
                              <div className="mt-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                                You did not select an answer for this question.
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        <Link to="/student">
          <button className="primary-btn mt-6">Back to Dashboard</button>
        </Link>
      </div>
    </div>
  )
}
