const express = require('express')
const Test = require('../models/Test')
const TestResult = require('../models/TestResult')
const Prediction = require('../models/Prediction')
const { verifyToken, requireRole } = require('../middleware/auth')
const { validateAnswerSubmission, validateTestPayload } = require('../utils/validation')

const router = express.Router()

function sanitizeTest(testDoc) {
  const test = testDoc.toObject()
  test.sections = test.sections.map((section) => ({
    ...section,
    questions: section.questions.map(({ question, options }) => ({ question, options }))
  }))
  return test
}

function calculateTestResult(test, answerMap) {
  const sectionScores = []
  const reviewSections = []
  let totalCorrect = 0
  let totalQuestions = 0
  let attemptedQuestions = 0

  for (const section of test.sections) {
    let sectionCorrect = 0
    const total = section.questions.length
    const reviewQuestions = []

    section.questions.forEach((question, index) => {
      const selected = answerMap.get(`${section.name}-${index}`)
      const isAttempted = selected !== undefined
      const isCorrect = selected === question.correctAnswer

      if (isAttempted) attemptedQuestions += 1
      if (isCorrect) sectionCorrect += 1

      reviewQuestions.push({
        questionIndex: index,
        question: question.question,
        options: question.options,
        selectedOption: selected ?? null,
        correctAnswer: question.correctAnswer,
        isCorrect
      })
    })

    totalCorrect += sectionCorrect
    totalQuestions += total

    sectionScores.push({
      name: section.name,
      correct: sectionCorrect,
      total,
      percentage: Number(((sectionCorrect / total) * 100).toFixed(2))
    })

    reviewSections.push({
      name: section.name,
      questions: reviewQuestions
    })
  }

  const avgScore = totalQuestions
    ? Number(((totalCorrect / totalQuestions) * 100).toFixed(2))
    : 0

  const accuracy = attemptedQuestions
    ? Number(((totalCorrect / attemptedQuestions) * 100).toFixed(2))
    : 0

  return {
    sectionScores,
    reviewSections,
    avgScore,
    accuracy
  }
}

router.get('/', verifyToken, async (req, res) => {
  try {
    const tests = await Test.find().sort({ company: 1, level: 1, createdAt: -1 }).select('title company level pattern timeLimit createdAt')
    return res.json({ tests })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
})

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id)
    if (!test) return res.status(404).json({ message: 'Test not found' })
    return res.json({ test: sanitizeTest(test) })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
})

router.post('/:id/submit', verifyToken, async (req, res) => {
  try {
    const errors = validateAnswerSubmission(req.body)
    if (errors.length) {
      return res.status(400).json({ message: errors[0], errors })
    }

    const test = await Test.findById(req.params.id)
    if (!test) return res.status(404).json({ message: 'Test not found' })

    const answers = Array.isArray(req.body.answers) ? req.body.answers : []
    const answerMap = new Map()

    for (const item of answers) {
      const section = test.sections.find((candidate) => candidate.name === item.sectionName)
      if (!section) {
        return res.status(400).json({ message: `Unknown section: ${item.sectionName}` })
      }

      const question = section.questions[item.questionIndex]
      if (!question) {
        return res.status(400).json({ message: `Invalid question index for section ${item.sectionName}` })
      }

      if (item.selectedOption >= question.options.length) {
        return res.status(400).json({ message: `Invalid selected option for section ${item.sectionName}, question ${item.questionIndex + 1}` })
      }

      answerMap.set(`${item.sectionName}-${item.questionIndex}`, item.selectedOption)
    }

    const {
      sectionScores,
      reviewSections,
      avgScore,
      accuracy
    } = calculateTestResult(test, answerMap)

    const result = await TestResult.create({
      userId: req.user.id,
      testId: test._id,
      sectionScores,
      reviewSections,
      avgScore,
      accuracy,
      timeTaken: Number(req.body.timeTaken) || 0
    })

    return res.status(201).json({
      message: 'Test submitted successfully',
      result
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
})

router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const errors = validateTestPayload(req.body)
    if (errors.length) {
      return res.status(400).json({ message: errors[0], errors })
    }

    const test = await Test.create(req.body)
    return res.status(201).json({ test })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
})

router.put('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const errors = validateTestPayload(req.body)
    if (errors.length) {
      return res.status(400).json({ message: errors[0], errors })
    }

    const test = await Test.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    return res.json({ test })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
})

router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    await Test.findByIdAndDelete(req.params.id)
    await TestResult.deleteMany({ testId: req.params.id })
    await Prediction.deleteMany({ basedOnTestId: req.params.id })
    return res.json({ message: 'Test and related results deleted' })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
})

module.exports = router
module.exports.__private__ = {
  calculateTestResult
}
