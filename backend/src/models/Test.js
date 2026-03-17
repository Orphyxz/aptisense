const mongoose = require('mongoose')

const questionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctAnswer: { type: Number, required: true }
  },
  { _id: false }
)

const sectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    questions: [questionSchema]
  },
  { _id: false }
)

const testSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    company: { type: String, required: true },
    level: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
    pattern: { type: String, required: true },
    timeLimit: { type: Number, default: 60 },
    sections: [sectionSchema]
  },
  { timestamps: true }
)

module.exports = mongoose.model('Test', testSchema)
