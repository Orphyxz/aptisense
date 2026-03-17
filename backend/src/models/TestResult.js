const mongoose = require('mongoose')

const scoreSchema = new mongoose.Schema(
  {
    name: String,
    correct: Number,
    total: Number,
    percentage: Number
  },
  { _id: false }
)

const reviewQuestionSchema = new mongoose.Schema(
  {
    questionIndex: Number,
    question: String,
    options: [String],
    selectedOption: Number,
    correctAnswer: Number,
    isCorrect: Boolean
  },
  { _id: false }
)

const reviewSectionSchema = new mongoose.Schema(
  {
    name: String,
    questions: [reviewQuestionSchema]
  },
  { _id: false }
)

const testResultSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
    sectionScores: [scoreSchema],
    reviewSections: [reviewSectionSchema],
    avgScore: Number,
    accuracy: Number,
    timeTaken: Number,
    submittedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
)

module.exports = mongoose.model('TestResult', testResultSchema)
