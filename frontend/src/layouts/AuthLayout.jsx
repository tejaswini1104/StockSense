import { Outlet } from 'react-router-dom'
import Logo from '../components/Logo'

const HIGHLIGHTS = [
  'Centralized real-time inventory tracking across all warehouses.',
  'Automated vendor receipts, customer deliveries & 4-step workflows.',
  'Complete stock ledger audit trail with zero negative stock enforcement.',
]

export default function AuthLayout() {
  return (
    <div className="auth-shell">
      <aside className="auth-aside">
        <div className="auth-aside__glow" />
        <div className="auth-aside__top">
          <Logo size={36} tone="light" />
          <span className="auth-aside__version-tag">Enterprise IMS v2.0</span>
        </div>

        <div className="auth-aside__body">
          <span className="auth-aside__badge">
            <span className="auth-aside__pulse" /> Real-time Warehouse Control
          </span>
          <h1>Master your inventory, eliminate spreadsheets.</h1>
          <p className="auth-aside__subtext">
            Streamline receipts, delivery orders, internal transfers, and physical counts in one unified platform.
          </p>

          <ul className="auth-aside__list">
            {HIGHLIGHTS.map((item) => (
              <li key={item}>
                <div className="auth-aside__check">
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path
                      d="M4 10.5L8 14.5L16 5.5"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="auth-aside__foot">
          <p>© 2026 StockSense Systems. Built for high-volume operations.</p>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-main__mobile-logo">
          <Logo size={32} />
        </div>
        <div className="auth-card">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
