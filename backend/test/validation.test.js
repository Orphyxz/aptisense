const test = require('node:test')
const assert = require('node:assert/strict')

const {
  validateAuthPayload,
  validateAnswerSubmission,
  validateTestPayload
} = require('../src/utils/validation')

test('validateAuthPayload accepts a valid register payload', () => {
  const errors = validateAuthPayload({
    name: 'Aryan Kumar',
    email: 'aryan@apsit.edu.in',
    password: 'secure123',
    role: 'student'
  }, 'register')

  assert.deepEqual(errors, [])
})

test('validateAuthPayload rejects invalid login payloads', () => {
  const errors = validateAuthPayload({
    email: 'not-an-email',
    password: '123'
  }, 'login')

  assert.deepEqual(errors, [
    'A valid email is required',
    'Password must be at least 6 characters long'
  ])
})

test('validateAnswerSubmission accepts well-formed answers', () => {
  const errors = validateAnswerSubmission({
    answers: [
      { sectionName: 'Quantitative Ability', questionIndex: 0, selectedOption: 2 }
    ],
    timeTaken: 1200
  })

  assert.deepEqual(errors, [])
})

test('validateAnswerSubmission reports malformed entries', () => {
  const errors = validateAnswerSubmission({
    answers: [
      { sectionName: '', questionIndex: -1, selectedOption: -2 },
      null
    ],
    timeTaken: -10
  })

  assert.deepEqual(errors, [
    'Answer 1 is missing a valid sectionName',
    'Answer 1 has an invalid questionIndex',
    'Answer 1 has an invalid selectedOption',
    'Answer 2 must be an object',
    'timeTaken must be a non-negative number'
  ])
})

test('validateTestPayload accepts a complete test definition', () => {
  const errors = validateTestPayload({
    title: 'General Mock Test - Easy',
    company: 'General',
    level: 'Easy',
    pattern: 'Baseline aptitude pattern',
    timeLimit: 60,
    sections: [
      {
        name: 'Quantitative Ability',
        questions: [
          {
            question: '2 + 2 = ?',
            options: ['3', '4', '5'],
            correctAnswer: 1
          }
        ]
      }
    ]
  })

  assert.deepEqual(errors, [])
})

test('validateTestPayload rejects broken test definitions', () => {
  const errors = validateTestPayload({
    title: '',
    company: '',
    level: 'Broken',
    pattern: '',
    timeLimit: -1,
    sections: [
      {
        name: '',
        questions: [
          {
            question: '',
            options: [''],
            correctAnswer: 5
          }
        ]
      }
    ]
  })

  assert.deepEqual(errors, [
    'Title is required',
    'Company is required',
    'Pattern is required',
    'Level must be Easy, Medium, or Hard',
    'timeLimit must be a positive integer',
    'Section 1 must have a name',
    'Question 1 in section 1 must have text',
    'Question 1 in section 1 must have at least 2 options',
    'Question 1 in section 1 has an invalid correctAnswer index'
  ])
})
