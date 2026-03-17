import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth-context'
import { getErrorMessage } from '../error'
import { useToast } from '../toast-context'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { showToast } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await api.login({ email, password })
      login(data.token, data.user)
      showToast({
        tone: 'success',
        title: 'Login successful',
        message: `Welcome back, ${data.user.name}.`,
      })
      navigate(data.user.role === 'admin' ? '/admin' : '/student')
    } catch (err) {
      setError(getErrorMessage(err))
      showToast({
        tone: 'error',
        title: 'Login failed',
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
          <h1 className="page-title" style={{ fontSize: '2rem' }}>Login</h1>
          <p className="page-subtitle">
            Access your AptiSense workspace.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="metric-label block mb-2">Email</label>
            <input
              className="field"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="metric-label block mb-2">Password</label>
            <input
              className="field"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <button className="primary-btn w-full" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="soft-divider"></div>

        <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Don't have an account?{' '}
          <Link to="/register" className="font-bold" style={{ color: 'var(--color-primary)' }}>
            Register
          </Link>
        </div>
      </div>
    </div>
  )
}
