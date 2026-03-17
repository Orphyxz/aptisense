const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const { verifyToken } = require('../middleware/auth')
const { validateAuthPayload } = require('../utils/validation')

const router = express.Router()

function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body
    const errors = validateAuthPayload(req.body, 'register')
    if (errors.length) {
      return res.status(400).json({ message: errors[0], errors })
    }

    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) {
      return res.status(400).json({ message: 'Email already in use' })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role === 'admin' ? 'admin' : 'student'
    })

    const token = signToken(user)

    return res.status(201).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const errors = validateAuthPayload(req.body, 'login')
    if (errors.length) {
      return res.status(400).json({ message: errors[0], errors })
    }

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const token = signToken(user)

    return res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
})

router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password')
    return res.json({ user })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
})

module.exports = router
