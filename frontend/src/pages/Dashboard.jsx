import { Link } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import { NAV_SECTIONS } from '../navigation'

const MODULES = NAV_SECTIONS.flatMap((section) => section.items).filter(
  (item) => item.to !== '/dashboard' && item.to !== '/profile',
)

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function Dashboard() {
  const { user } = useAuth()

  return (
    <div className="stack">
      <section className="welcome">
        <div>
          <p className="welcome__eyebrow">Signed in</p>
          <h2>Welcome, {user?.name?.split(' ')[0]}</h2>
          <p className="welcome__text">
            Your account is active and connected to the StockSense backend. Inventory
            modules are being added next.
          </p>
        </div>
        <span className={`badge badge--${user?.role}`}>{user?.role}</span>
      </section>

      {/* Everything below comes from GET /api/v1/auth/me - no placeholder values. */}
      <section className="card">
        <header className="card__head">
          <h3>Account details</h3>
          <Link className="link" to="/profile">
            Manage profile
          </Link>
        </header>
        <dl className="detail-grid">
          <div>
            <dt>Name</dt>
            <dd>{user?.name}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{user?.email}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd className="capitalize">{user?.role}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              <span className={`pill ${user?.is_active ? 'pill--ok' : 'pill--off'}`}>
                {user?.is_active ? 'Active' : 'Inactive'}
              </span>
            </dd>
          </div>
          <div>
            <dt>Member since</dt>
            <dd>{formatDate(user?.created_at)}</dd>
          </div>
          <div>
            <dt>User ID</dt>
            <dd>#{user?.id}</dd>
          </div>
        </dl>
      </section>

      <section className="card">
        <header className="card__head">
          <h3>Modules</h3>
          <span className="card__hint">Coming next</span>
        </header>
        <div className="module-grid">
          {MODULES.map((module) => (
            <Link key={module.to} className="module-tile" to={module.to}>
              <span className="module-tile__icon" aria-hidden="true">
                {module.icon}
              </span>
              <span className="module-tile__body">
                <strong>{module.label}</strong>
                <small>{module.description}</small>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
