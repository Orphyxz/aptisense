const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')

const authRoutes = require('./routes/auth')
const testRoutes = require('./routes/tests')
const analyticsRoutes = require('./routes/analytics')
const predictRoutes = require('./routes/predict')
const notesRoutes = require('./routes/notes')

function buildAllowedOrigins() {
  const configuredOrigin = process.env.FRONTEND_URL || 'http://localhost:5173'
  const allowedOrigins = new Set([configuredOrigin])

  try {
    const url = new URL(configuredOrigin)
    const port = url.port ? `:${url.port}` : ''

    if (url.hostname === 'localhost') {
      allowedOrigins.add(`${url.protocol}//127.0.0.1${port}`)
    }

    if (url.hostname === '127.0.0.1') {
      allowedOrigins.add(`${url.protocol}//localhost${port}`)
    }
  } catch (error) {
    // Keep the explicit configured origin if parsing fails.
  }

  return allowedOrigins
}

function createApp() {
  const app = express()
  const allowedOrigins = buildAllowedOrigins()
  const noteDirectories = [
    path.join(__dirname, 'uploads', 'notes'),
    path.join(__dirname, '..', 'uploads', 'notes'),
  ]

  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true)
      }

      return callback(new Error(`Origin ${origin} is not allowed by CORS`))
    },
    credentials: true
  }))

  app.use(express.json({ limit: '25mb' }))
  app.get('/notes-files/:fileName', (req, res, next) => {
    const requestedFile = path.basename(req.params.fileName)

    for (const directory of noteDirectories) {
      const candidate = path.join(directory, requestedFile)
      if (fs.existsSync(candidate)) {
        return res.sendFile(candidate)
      }
    }

    return next()
  })

  app.use('/notes-files', express.static(noteDirectories[0]))
  app.use('/notes-files', express.static(noteDirectories[1]))
  app.use('/notes-files', (req, res) => {
    res.status(404).json({ message: 'Note file not found' })
  })

  app.get('/health', (req, res) => {
    res.json({ ok: true, service: 'backend' })
  })

  app.use('/auth', authRoutes)
  app.use('/tests', testRoutes)
  app.use('/analytics', analyticsRoutes)
  app.use('/predict', predictRoutes)
  app.use('/notes', notesRoutes)

  app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' })
  })

  return app
}

module.exports = { createApp }
