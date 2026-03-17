const test = require('node:test')
const assert = require('node:assert/strict')

const { calculateTestResult } = require('../src/routes/tests').__private__

test('calculateTestResult separates overall score from attempted accuracy', () => {
  const mockTest = {
    sections: [
      {
        name: 'Quantitative Ability',
        questions: [
          { question: 'Q1', options: ['A', 'B'], correctAnswer: 0 },
          { question: 'Q2', options: ['A', 'B'], correctAnswer: 1 }
        ]
      },
      {
        name: 'Logical Reasoning',
        questions: [
          { question: 'Q3', options: ['A', 'B'], correctAnswer: 1 }
        ]
      }
    ]
  }

  const answerMap = new Map([
    ['Quantitative Ability-0', 0],
    ['Quantitative Ability-1', 0]
  ])

  const result = calculateTestResult(mockTest, answerMap)

  assert.equal(result.avgScore, 33.33)
  assert.equal(result.accuracy, 50)
  assert.deepEqual(result.sectionScores, [
    { name: 'Quantitative Ability', correct: 1, total: 2, percentage: 50 },
    { name: 'Logical Reasoning', correct: 0, total: 1, percentage: 0 }
  ])
})
