const mongoose = require('mongoose')

const noteSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    topics: [{ type: String, trim: true }],
    originalFileName: { type: String, required: true, trim: true },
    storedFileName: { type: String, required: true, trim: true, unique: true },
    uploadedBy: {
      id: { type: String, required: true },
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
    },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Note', noteSchema)
