const express = require('express')
const cors = require('cors')

const authRoutes = require('./routes/auth')
const testRoutes = require('./routes/tests')
const analyticsRoutes = require('./routes/analytics')
const predictRoutes = require('./routes/predict')

function createApp() {
  const app = express()

  app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
  }))

  app.use(express.json())

  app.get('/health', (req, res) => {
    res.json({ ok: true, service: 'backend' })
  })

  app.use('/auth', authRoutes)
  app.use('/tests', testRoutes)
  app.use('/analytics', analyticsRoutes)
  app.use('/predict', predictRoutes)

  app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' })
  })

  return app
}

module.exports = { createApp }
