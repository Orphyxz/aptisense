require('dotenv').config()
const connectDB = require('./config/db')
const { createApp } = require('./app')

async function startServer() {
  try {
    await connectDB()

    const app = createApp()
    const PORT = process.env.PORT || 5000

    app.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('MongoDB connection failed:', error.message)
    process.exit(1)
  }
}

startServer()
