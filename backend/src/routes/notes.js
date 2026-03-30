const express = require('express')
const fsSync = require('fs')
const path = require('path')
const fs = require('fs/promises')
const crypto = require('crypto')

const Note = require('../models/Note')
const { verifyToken, requireRole } = require('../middleware/auth')

const router = express.Router()
const uploadsDirectory = path.join(__dirname, '..', 'uploads', 'notes')
const legacyUploadsDirectory = path.join(__dirname, '..', '..', 'uploads', 'notes')

function resolveStoredFilePath(storedFileName) {
  const candidates = [
    path.join(uploadsDirectory, storedFileName),
    path.join(legacyUploadsDirectory, storedFileName),
  ]

  return candidates.find((candidate) => fsSync.existsSync(candidate)) || null
}

function normalizeTopics(input) {
  const values = Array.isArray(input)
    ? input
    : typeof input === 'string'
      ? input.split(',')
      : []

  return values
    .map((value) => String(value || '').trim())
    .filter(Boolean)
}

function sanitizeFileStem(fileName) {
  const stem = String(fileName || '')
    .replace(/\.pdf$/i, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return stem || 'note'
}

function decodePdf(fileData) {
  if (typeof fileData !== 'string' || !fileData.startsWith('data:application/pdf;base64,')) {
    return null
  }

  const base64Payload = fileData.split(',', 2)[1]
  if (!base64Payload) return null

  try {
    return Buffer.from(base64Payload, 'base64')
  } catch (error) {
    return null
  }
}

function serializeNote(note, req) {
  return {
    _id: note._id,
    title: note.title,
    description: note.description,
    topics: note.topics,
    originalFileName: note.originalFileName,
    fileUrl: `${req.protocol}://${req.get('host')}/notes-files/${encodeURIComponent(note.storedFileName)}`,
    uploadedBy: note.uploadedBy,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  }
}

router.get('/', verifyToken, async (req, res) => {
  try {
    const notes = await Note.find().sort({ createdAt: -1 })
    const availableNotes = notes.filter((note) => resolveStoredFilePath(note.storedFileName))
    return res.json({ notes: availableNotes.map((note) => serializeNote(note, req)) })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
})

router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const {
      title,
      description = '',
      topics,
      fileName,
      fileData,
    } = req.body || {}

    const normalizedTitle = String(title || '').trim()
    const normalizedFileName = String(fileName || '').trim()
    const normalizedTopics = normalizeTopics(topics)

    if (!normalizedTitle) {
      return res.status(400).json({ message: 'Title is required' })
    }

    if (!normalizedFileName) {
      return res.status(400).json({ message: 'A PDF file is required' })
    }

    if (!normalizedFileName.toLowerCase().endsWith('.pdf')) {
      return res.status(400).json({ message: 'Only PDF files are allowed' })
    }

    const pdfBuffer = decodePdf(fileData)
    if (!pdfBuffer || !pdfBuffer.length) {
      return res.status(400).json({ message: 'The uploaded file must be a valid PDF' })
    }

    await fs.mkdir(uploadsDirectory, { recursive: true })

    const storedFileName = `${Date.now()}-${crypto.randomUUID()}-${sanitizeFileStem(normalizedFileName)}.pdf`
    await fs.writeFile(path.join(uploadsDirectory, storedFileName), pdfBuffer)

    const note = await Note.create({
      title: normalizedTitle,
      description: String(description || '').trim(),
      topics: normalizedTopics,
      originalFileName: normalizedFileName,
      storedFileName,
      uploadedBy: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
      },
    })

    return res.status(201).json({ note: serializeNote(note, req) })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
})

router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const note = await Note.findByIdAndDelete(req.params.id)
    if (!note) {
      return res.status(404).json({ message: 'Note not found' })
    }

    const storedFilePath = resolveStoredFilePath(note.storedFileName)
    if (storedFilePath) {
      await fs.unlink(storedFilePath).catch(() => {})
    }
    return res.json({ message: 'Note deleted successfully' })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
})

module.exports = router
