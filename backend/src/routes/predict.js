const express = require('express')
const axios = require('axios')
const TestResult = require('../models/TestResult')
const Prediction = require('../models/Prediction')
const { verifyToken } = require('../middleware/auth')

const router = express.Router()

function buildFeatures(results) {
  const latest = results[0]
  const sectionMap = Object.fromEntries(
    latest.sectionScores.map((s) => [s.name, s.percentage])
  )

  return {
    quantScore: sectionMap['Quantitative Ability'] || 0,
    logicalScore: sectionMap['Logical Reasoning'] || 0,
    verbalScore: sectionMap['Verbal Ability'] || 0,
    avgScore: latest.avgScore || 0,
    testCount: results.length,
    attemptRate: latest.accuracy || 0
  }
}

function fallbackPrediction(features) {
  const weighted =
    features.quantScore * 0.22 +
    features.logicalScore * 0.22 +
    features.verbalScore * 0.18 +
    features.avgScore * 0.28 +
    Math.min(features.testCount * 3, 15) +
    features.attemptRate * 0.10

  const readinessScore = Math.max(0, Math.min(100, Math.round(weighted / 1.15)))
  const successProbability = Number((readinessScore / 100).toFixed(4))

  const weakTopics = []
  if (features.quantScore < 50) weakTopics.push('Quantitative Ability')
  if (features.logicalScore < 50) weakTopics.push('Logical Reasoning')
  if (features.verbalScore < 50) weakTopics.push('Verbal Ability')

  return {
    successProbability,
    readinessScore,
    weakTopics,
    shapValues: {
      quantScore: Number((Math.abs(70 - features.quantScore) / 100).toFixed(4)),
      logicalScore: Number((Math.abs(70 - features.logicalScore) / 100).toFixed(4)),
      verbalScore: Number((Math.abs(70 - features.verbalScore) / 100).toFixed(4)),
      avgScore: Number((Math.abs(75 - features.avgScore) / 100).toFixed(4)),
      testCount: Number((Math.min(features.testCount, 10) / 10).toFixed(4)),
      attemptRate: Number((Math.abs(80 - features.attemptRate) / 100).toFixed(4))
    }
  }
}

router.post('/', verifyToken, async (req, res) => {
  try {
    const results = await TestResult.find({ userId: req.user.id }).sort({ submittedAt: -1 }).limit(10)

    if (!results.length) {
      return res.status(400).json({ message: 'No test results found for prediction' })
    }

    const features = buildFeatures(results)
    let predictionResponse

    try {
      const mlRes = await axios.post(`${process.env.ML_SERVICE_URL}/predict`, features)
      predictionResponse = mlRes.data
    } catch (error) {
      predictionResponse = fallbackPrediction(features)
    }

    const prediction = await Prediction.create({
      userId: req.user.id,
      basedOnTestId: results[0].testId,
      successProbability: predictionResponse.successProbability,
      readinessScore: predictionResponse.readinessScore,
      weakTopics: predictionResponse.weakTopics,
      shapValues: predictionResponse.shapValues
    })

    return res.status(201).json({ prediction })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
})

router.get('/latest', verifyToken, async (req, res) => {
  try {
    const prediction = await Prediction.findOne({ userId: req.user.id }).sort({ createdAt: -1 })
    if (!prediction) return res.status(404).json({ message: 'No prediction found' })
    return res.json({ prediction })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
})

module.exports = router
module.exports.__private__ = {
  buildFeatures,
  fallbackPrediction
}
