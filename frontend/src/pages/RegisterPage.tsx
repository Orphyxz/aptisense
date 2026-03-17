import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth-context'
import { getErrorMessage } from '../error'
import { useToast } from '../toast-context'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { showToast } = useToast()

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
  })

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await api.register(form)
      login(data.token, data.user)
      showToast({
        tone: 'success',
        title: 'Account created',
        message: `Welcome to AptiSense, ${data.user.name}.`,
      })
      navigate(data.user.role === 'admin' ? '/admin' : '/student')
    } catch (err) {
      setError(getErrorMessage(err))
      showToast({
        tone: 'error',
        title: 'Registration failed',
        message: getErrorMessage(err),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-wrap">
      <div className="mx-auto max-w-md bento-card card-padding">
        <div className="mb-6">
          <h1 className="page-title" style={{ fontSize: '2rem' }}>Register</h1>
          <p className="page-subtitle">
            Create your AptiSense account and get started.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="metric-label block mb-2">Full Name</label>
            <input
              className="field"
              type="text"
              placeholder="Enter your full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div>
            <label className="metric-label block mb-2">Email</label>
            <input
              className="field"
              type="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label className="metric-label block mb-2">Password</label>
            <input
              className="field"
              type="password"
              placeholder="Create a password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <div>
            <label className="metric-label block mb-2">Role</label>
            <select
              className="field"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="student">Student</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <button className="primary-btn w-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="soft-divider"></div>

        <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" className="font-bold" style={{ color: 'var(--color-primary)' }}>
            Login
          </Link>
        </div>
      </div>
    </div>
  )
}
