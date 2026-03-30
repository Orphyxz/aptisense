const express = require('express')
const User = require('../models/User')
const TestResult = require('../models/TestResult')
const Test = require('../models/Test')
const { verifyToken, requireRole } = require('../middleware/auth')

const router = express.Router()
const LEVELS = ['Easy', 'Medium', 'Hard']

function getStatus(score) {
  if (score === null || score === undefined) return 'Getting Started'
  if (score >= 75) return 'On Track'
  if (score >= 60) return 'Building Momentum'
  return 'Needs Support'
}

function createEmptyDifficultySummary() {
  return Object.fromEntries(
    LEVELS.map((level) => [
      level,
      {
        attempts: 0,
        avgScore: 0,
        latestScore: null,
        bestScore: null,
        students: 0,
      },
    ]),
  )
}

function getSectionDeltaSummary(latestResult, previousResult) {
  if (!latestResult) {
    return {
      strongestSection: null,
      weakestSection: null,
      strongestGain: null,
      biggestDrop: null,
    }
  }

  const strongestSection = latestResult.sectionScores.reduce((best, section) => {
    if (!best || section.percentage > best.percentage) return section
    return best
  }, null)

  const weakestSection = latestResult.sectionScores.reduce((worst, section) => {
    if (!worst || section.percentage < worst.percentage) return section
    return worst
  }, null)

  if (!previousResult) {
    return {
      strongestSection,
      weakestSection,
      strongestGain: null,
      biggestDrop: null,
    }
  }

  const previousSectionMap = new Map(
    previousResult.sectionScores.map((section) => [section.name, section.percentage]),
  )

  const deltas = latestResult.sectionScores.map((section) => ({
    name: section.name,
    delta: Number((section.percentage - (previousSectionMap.get(section.name) || 0)).toFixed(2)),
  }))

  const strongestGain = deltas
    .filter((section) => section.delta > 0)
    .sort((a, b) => b.delta - a.delta)[0] || null

  const biggestDrop = deltas
    .filter((section) => section.delta < 0)
    .sort((a, b) => a.delta - b.delta)[0] || null

  return {
    strongestSection,
    weakestSection,
    strongestGain,
    biggestDrop,
  }
}

function buildStory(latestResult, previousResult, latestTest) {
  if (!latestResult) {
    return {
      trendDirection: 'first_attempt',
      scoreDelta: null,
      strongestSection: null,
      weakestSection: null,
      strongestGain: null,
      biggestDrop: null,
      narrative:
        'Take your first mock test to unlock a readiness story, section-level gains, and a clearer next-step recommendation.',
      nextStep:
        'Start with an Easy mock, then review the section breakdown to see where you need the most support.',
      latestTest: null,
    }
  }

  const scoreDelta = previousResult
    ? Number((latestResult.avgScore - previousResult.avgScore).toFixed(2))
    : null

  const trendDirection =
    scoreDelta === null
      ? 'first_attempt'
      : scoreDelta > 0
        ? 'up'
        : scoreDelta < 0
          ? 'down'
          : 'flat'

  const {
    strongestSection,
    weakestSection,
    strongestGain,
    biggestDrop,
  } = getSectionDeltaSummary(latestResult, previousResult)

  const latestLabel = latestTest
    ? `${latestTest.company} ${latestTest.level} mock`
    : 'latest mock'

  let narrative
  if (trendDirection === 'first_attempt') {
    narrative = `This is your first scored attempt. ${weakestSection?.name || 'Your weakest section'} is the clearest place to improve before taking the next mock.`
  } else if (trendDirection === 'up') {
    narrative = `Your latest ${latestLabel} lifted your average score by ${scoreDelta} points. ${strongestGain ? `${strongestGain.name} improved the most at +${strongestGain.delta} points.` : 'The overall direction is positive.'}`
  } else if (trendDirection === 'down') {
    narrative = `Your latest ${latestLabel} dipped by ${Math.abs(scoreDelta)} points. ${biggestDrop ? `${biggestDrop.name} fell the most at ${biggestDrop.delta} points.` : 'A section-level review should help you recover quickly.'}`
  } else {
    narrative = `Your latest ${latestLabel} held steady against the previous attempt. ${strongestGain ? `${strongestGain.name} still improved by +${strongestGain.delta} points, which is a good sign.` : 'The next gain will likely come from tightening one weak section.'}`
  }

  const nextStep = weakestSection
    ? `Focus next on ${weakestSection.name}. Raising that section from ${weakestSection.percentage}% will usually move your readiness faster than polishing your strongest section.`
    : 'Keep taking timed mocks consistently to build a stronger readiness signal.'

  return {
    trendDirection,
    scoreDelta,
    strongestSection,
    weakestSection,
    strongestGain,
    biggestDrop,
    narrative,
    nextStep,
    latestTest: latestTest || null,
  }
}

async function getTestLookup(results) {
  const tests = await Test.find({ _id: { $in: results.map((result) => result.testId) } })
    .select('title company level pattern')

  return new Map(
    tests.map((test) => [
      String(test._id),
      {
        title: test.title,
        company: test.company,
        level: test.level,
        pattern: test.pattern,
      },
    ]),
  )
}

function getLevelForResult(result, testLookup) {
  return testLookup.get(String(result.testId))?.level || 'Medium'
}

function buildDifficultySummary(results, testLookup) {
  const summary = createEmptyDifficultySummary()

  for (const level of LEVELS) {
    const levelResults = results
      .filter((result) => getLevelForResult(result, testLookup) === level)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())

    if (!levelResults.length) continue

    summary[level] = {
      attempts: levelResults.length,
      avgScore: Number(
        (levelResults.reduce((sum, result) => sum + result.avgScore, 0) / levelResults.length).toFixed(2),
      ),
      latestScore: levelResults[0].avgScore,
      bestScore: Math.max(...levelResults.map((result) => result.avgScore)),
      students: new Set(levelResults.map((result) => String(result.userId))).size,
    }
  }

  return summary
}

function buildSummaryCounts(items) {
  return {
    onTrack: items.filter((item) => item.status === 'On Track').length,
    buildingMomentum: items.filter((item) => item.status === 'Building Momentum').length,
    needsSupport: items.filter((item) => item.status === 'Needs Support').length,
    gettingStarted: items.filter((item) => item.status === 'Getting Started').length,
  }
}

router.get('/student/:id', verifyToken, async (req, res) => {
  try {
    const requestedUserId = req.params.id
    if (req.user.role !== 'admin' && req.user.id !== requestedUserId) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const results = await TestResult.find({ userId: requestedUserId }).sort({ submittedAt: 1 })
    const testLookup = await getTestLookup(results)
    const difficultySummary = buildDifficultySummary(results, testLookup)

    const latestResult = results[results.length - 1] || null

    const levelAttemptCounter = {
      Easy: 0,
      Medium: 0,
      Hard: 0,
    }

    const trend = results.map((result) => {
      const level = getLevelForResult(result, testLookup)
      levelAttemptCounter[level] += 1

      return {
        date: new Date(result.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        score: result.avgScore,
        level,
        attempt: levelAttemptCounter[level],
      }
    })

    const radar = latestResult
      ? latestResult.sectionScores.map((section) => ({
          subject: section.name,
          score: section.percentage,
          fullMark: 100,
        }))
      : [
          { subject: 'Quantitative Ability', score: 0, fullMark: 100 },
          { subject: 'Logical Reasoning', score: 0, fullMark: 100 },
          { subject: 'Verbal Ability', score: 0, fullMark: 100 },
        ]

    return res.json({
      latestResult,
      trend,
      radar,
      difficultySummary,
      resultsCount: results.length,
      story: buildStory(
        latestResult,
        results.length > 1 ? results[results.length - 2] : null,
        latestResult ? testLookup.get(String(latestResult.testId)) : null,
      ),
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
})

router.get('/student/:id/history', verifyToken, async (req, res) => {
  try {
    const requestedUserId = req.params.id
    if (req.user.role !== 'admin' && req.user.id !== requestedUserId) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const results = await TestResult.find({ userId: requestedUserId }).sort({ submittedAt: -1 })
    const testLookup = await getTestLookup(results)
    const difficultySummary = buildDifficultySummary(results, testLookup)

    const attempts = results.map((result, index) => {
      const test = testLookup.get(String(result.testId))
      return {
        _id: result._id,
        sequence: results.length - index,
        submittedAt: result.submittedAt,
        avgScore: result.avgScore,
        accuracy: result.accuracy,
        timeTaken: result.timeTaken,
        status: getStatus(result.avgScore),
        test: test || {
          title: 'Unknown Test',
          company: 'General',
          level: 'Medium',
          pattern: 'Unavailable',
        },
        sectionScores: result.sectionScores,
      }
    })

    return res.json({ attempts, difficultySummary })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
})

router.get('/admin/student/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: 'student' }).select('name email createdAt')
    if (!student) {
      return res.status(404).json({ message: 'Student not found' })
    }

    const results = await TestResult.find({ userId: student._id }).sort({ submittedAt: -1 })
    const testLookup = await getTestLookup(results)

    const attempts = results.map((result, index) => {
      const test = testLookup.get(String(result.testId))
      return {
        _id: result._id,
        sequence: results.length - index,
        submittedAt: result.submittedAt,
        avgScore: result.avgScore,
        accuracy: result.accuracy,
        timeTaken: result.timeTaken,
        status: getStatus(result.avgScore),
        test: test || {
          title: 'Unknown Test',
          company: 'General',
          level: 'Medium',
          pattern: 'Unavailable',
        },
        sectionScores: result.sectionScores,
      }
    })

    const levelBreakdown = {
      Easy: attempts.filter((attempt) => attempt.test.level === 'Easy').length,
      Medium: attempts.filter((attempt) => attempt.test.level === 'Medium').length,
      Hard: attempts.filter((attempt) => attempt.test.level === 'Hard').length,
    }

    const statusCounts = buildSummaryCounts(attempts)
    const difficultySummary = buildDifficultySummary(results, testLookup)

    const summary = {
      totalAttempts: attempts.length,
      avgScore: attempts.length
        ? Number((attempts.reduce((sum, attempt) => sum + attempt.avgScore, 0) / attempts.length).toFixed(2))
        : 0,
      bestScore: attempts.length
        ? Math.max(...attempts.map((attempt) => attempt.avgScore))
        : 0,
      latestScore: attempts[0]?.avgScore ?? null,
      ...statusCounts,
    }

    return res.json({
      student,
      summary,
      levelBreakdown,
      difficultySummary,
      attempts,
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
})

router.get('/batch', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('name email')
    const studentIds = students.map((student) => student._id)
    const results = await TestResult.find({ userId: { $in: studentIds } }).sort({ submittedAt: -1 })
    const testLookup = await getTestLookup(results)

    const latestMap = new Map()
    for (const result of results) {
      const key = String(result.userId)
      if (!latestMap.has(key)) latestMap.set(key, result)
    }

    const studentRows = students.map((student) => {
      const latest = latestMap.get(String(student._id))
      const latestScore = latest ? latest.avgScore : null
      return {
        _id: student._id,
        name: student.name,
        email: student.email,
        latestScore,
        status: getStatus(latestScore),
      }
    })

    const statusCounts = buildSummaryCounts(studentRows)
    const scored = studentRows.filter((student) => student.latestScore !== null)
    const difficultySummary = buildDifficultySummary(results, testLookup)

    const avgBatchScore = scored.length
      ? Number((scored.reduce((sum, student) => sum + student.latestScore, 0) / scored.length).toFixed(2))
      : 0

    return res.json({
      summary: {
        totalStudents: students.length,
        avgBatchScore,
        ...statusCounts,
      },
      difficultySummary,
      students: studentRows,
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
})

router.get('/heatmap', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('name')
    const results = await TestResult.find({ userId: { $in: students.map((student) => student._id) } }).sort({ submittedAt: -1 })

    const latestMap = new Map()
    for (const result of results) {
      const key = String(result.userId)
      if (!latestMap.has(key)) latestMap.set(key, result)
    }

    const heatmap = students.map((student) => {
      const latest = latestMap.get(String(student._id))
      return {
        userId: student._id,
        name: student.name,
        status: getStatus(latest ? latest.avgScore : null),
      }
    })

    return res.json({ heatmap })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
})

router.get('/weak-topics', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('_id')
    const results = await TestResult.find({ userId: { $in: students.map((student) => student._id) } }).sort({ submittedAt: -1 })

    const latestMap = new Map()
    for (const result of results) {
      const key = String(result.userId)
      if (!latestMap.has(key)) latestMap.set(key, result)
    }

    const topicMap = new Map([
      ['Quantitative Ability', { topic: 'Quantitative Ability', totalScore: 0, samples: 0, userIds: new Set() }],
      ['Logical Reasoning', { topic: 'Logical Reasoning', totalScore: 0, samples: 0, userIds: new Set() }],
      ['Verbal Ability', { topic: 'Verbal Ability', totalScore: 0, samples: 0, userIds: new Set() }],
    ])

    for (const result of latestMap.values()) {
      for (const section of result.sectionScores) {
        const current = topicMap.get(section.name) || {
          topic: section.name,
          totalScore: 0,
          samples: 0,
          userIds: new Set(),
        }

        if (section.percentage < 50) {
          current.userIds.add(String(result.userId))
        }

        current.totalScore += section.percentage
        current.samples += 1
        topicMap.set(section.name, current)
      }
    }

    const weakTopics = Array.from(topicMap.values()).map((item) => ({
      topic: item.topic,
      count: item.userIds.size,
      avgScore: item.samples ? Number((item.totalScore / item.samples).toFixed(2)) : 0,
    }))

    return res.json({ weakTopics })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
})

module.exports = router
module.exports.__private__ = {
  getStatus,
  getSectionDeltaSummary,
  buildStory,
  buildDifficultySummary,
}
