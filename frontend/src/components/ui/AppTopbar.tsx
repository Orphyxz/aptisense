import { Link } from 'react-router-dom'
import { useAuth } from '../../auth-context'

export default function AppTopbar() {
  const { user, logout } = useAuth()

  if (!user) return null

  return (
    <div className="page-wrap">
      <div className="topbar">
        <Link to={user.role === 'admin' ? '/admin' : '/student'}>
          <div className="brand-block">
            <div className="brand-title">AptiSense</div>
            <div className="brand-subtitle">Placement Readiness Intelligence Platform</div>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <div className="user-chip">
            <div className="text-sm font-semibold">{user.name}</div>
            <div className="user-role">{user.role}</div>
          </div>
          <button className="secondary-btn" onClick={logout}>Logout</button>
        </div>
      </div>
    </div>
  )
}
