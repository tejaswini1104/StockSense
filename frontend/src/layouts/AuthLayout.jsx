import { Outlet } from 'react-router-dom'

import Logo from '../components/Logo'

const HIGHLIGHTS = [
  'Track every product, batch and bin in one place.',
  'Record receipts, issues and transfers as they happen.',
  'Keep an auditable stock ledger across all warehouses.',
]

export default function AuthLayout() {
  return (
    <div className="auth-shell">
      <aside className="auth-aside">
        <div className="auth-aside__top">
          <Logo size={36} tone="light" />
        </div>
        <div className="auth-aside__body">
          <h1>Inventory control, without the spreadsheets.</h1>
          <ul className="auth-aside__list">
            {HIGHLIGHTS.map((item) => (
              <li key={item}>
                <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
                  <circle cx="10" cy="10" r="10" fill="rgba(255,255,255,.14)" />
                  <path
                    d="M6 10.4l2.6 2.6L14.2 7.4"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="auth-aside__foot">StockSense — Inventory Management System</p>
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
