const test = require('node:test')
const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret'
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

const { createApp } = require('../src/app')

let server
let baseUrl

test.before(async () => {
  server = createApp().listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  const { port } = server.address()
  baseUrl = `http://127.0.0.1:${port}`
})

test.after(async () => {
  if (!server) return
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error)
      else resolve()
    })
  })
})

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' })
}

test('GET /health returns backend health status', async () => {
  const response = await fetch(`${baseUrl}/health`)
  const data = await response.json()

  assert.equal(response.status, 200)
  assert.deepEqual(data, { ok: true, service: 'backend' })
})

test('unknown routes return a JSON 404 response', async () => {
  const response = await fetch(`${baseUrl}/missing`)
  const data = await response.json()

  assert.equal(response.status, 404)
  assert.equal(data.message, 'Route not found')
})

test('register rejects malformed payloads before hitting persistence', async () => {
  const response = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'A', email: 'bad-email', password: '123' })
  })
  const data = await response.json()

  assert.equal(response.status, 400)
  assert.ok(Array.isArray(data.errors))
  assert.equal(data.message, 'Name must be at least 2 characters long')
})

test('login rejects malformed payloads before checking users', async () => {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: '', password: '' })
  })
  const data = await response.json()

  assert.equal(response.status, 400)
  assert.equal(data.message, 'A valid email is required')
})

test('protected prediction route rejects missing token', async () => {
  const response = await fetch(`${baseUrl}/predict/latest`)
  const data = await response.json()

  assert.equal(response.status, 401)
  assert.equal(data.message, 'No token provided')
})

test('test submission rejects malformed answer payloads', async () => {
  const token = signToken({ id: 'user-1', role: 'student', email: 'student@test.com', name: 'Student' })

  const response = await fetch(`${baseUrl}/tests/abc123/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ answers: 'not-an-array', timeTaken: -5 })
  })
  const data = await response.json()

  assert.equal(response.status, 400)
  assert.equal(data.message, 'Answers must be an array')
})

test('admin test creation rejects invalid test definitions', async () => {
  const token = signToken({ id: 'admin-1', role: 'admin', email: 'admin@test.com', name: 'Admin' })

  const response = await fetch(`${baseUrl}/tests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      title: '',
      company: '',
      level: 'Impossible',
      pattern: '',
      timeLimit: 0,
      sections: []
    })
  })
  const data = await response.json()

  assert.equal(response.status, 400)
  assert.equal(data.message, 'Title is required')
})
