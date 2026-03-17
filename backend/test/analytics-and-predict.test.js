const test = require('node:test')
const assert = require('node:assert/strict')

const analyticsPrivate = require('../src/routes/analytics').__private__
const predictPrivate = require('../src/routes/predict').__private__

test('buildStory describes an improving attempt with a strongest gain', () => {
  const latestResult = {
    avgScore: 74,
    sectionScores: [
      { name: 'Quantitative Ability', percentage: 80 },
      { name: 'Logical Reasoning', percentage: 72 },
      { name: 'Verbal Ability', percentage: 70 }
    ]
  }

  const previousResult = {
    avgScore: 66,
    sectionScores: [
      { name: 'Quantitative Ability', percentage: 68 },
      { name: 'Logical Reasoning', percentage: 70 },
      { name: 'Verbal Ability', percentage: 60 }
    ]
  }

  const story = analyticsPrivate.buildStory(latestResult, previousResult, {
    title: 'TCS Mock Test - Medium',
    company: 'TCS',
    level: 'Medium',
    pattern: 'TCS timed pattern'
  })

  assert.equal(story.trendDirection, 'up')
  assert.equal(story.scoreDelta, 8)
  assert.equal(story.strongestGain.name, 'Quantitative Ability')
  assert.equal(story.weakestSection.name, 'Verbal Ability')
  assert.match(story.narrative, /lifted your average score by 8 points/i)
})

test('buildFeatures maps section scores into prediction features', () => {
  const features = predictPrivate.buildFeatures([
    {
      avgScore: 70,
      accuracy: 76,
      sectionScores: [
        { name: 'Quantitative Ability', percentage: 80 },
        { name: 'Logical Reasoning', percentage: 65 },
        { name: 'Verbal Ability', percentage: 60 }
      ]
    },
    {
      avgScore: 64,
      accuracy: 72,
      sectionScores: []
    }
  ])

  assert.deepEqual(features, {
    quantScore: 80,
    logicalScore: 65,
    verbalScore: 60,
    avgScore: 70,
    testCount: 2,
    attemptRate: 76
  })
})

test('fallbackPrediction returns bounded readiness and weak topics', () => {
  const prediction = predictPrivate.fallbackPrediction({
    quantScore: 40,
    logicalScore: 55,
    verbalScore: 45,
    avgScore: 52,
    testCount: 3,
    attemptRate: 68
  })

  assert.equal(typeof prediction.readinessScore, 'number')
  assert.ok(prediction.readinessScore >= 0 && prediction.readinessScore <= 100)
  assert.ok(prediction.successProbability >= 0 && prediction.successProbability <= 1)
  assert.deepEqual(prediction.weakTopics, ['Quantitative Ability', 'Verbal Ability'])
  assert.equal(typeof prediction.shapValues.avgScore, 'number')
})
