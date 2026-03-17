const mongoose = require('mongoose')

const predictionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    basedOnTestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
    successProbability: Number,
    readinessScore: Number,
    weakTopics: [String],
    shapValues: {
      quantScore: Number,
      logicalScore: Number,
      verbalScore: Number,
      avgScore: Number,
      testCount: Number,
      attemptRate: Number
    }
  },
  { timestamps: true }
)

module.exports = mongoose.model('Prediction', predictionSchema)