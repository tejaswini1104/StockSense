import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'

import Logo from '../components/Logo'
import { useAuth } from '../context/AuthContext'
import { NAV_SECTIONS, findNavItem } from '../navigation'

function initialsOf(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

export default function AppLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const menuRef = useRef(null)

  const current = findNavItem(location.pathname)

  // Close the drawer / user menu whenever the route changes.
  useEffect(() => {
    setSidebarOpen(false)
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return undefined
    const onClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false)
    }
    const onEscape = (event) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onEscape)
    }
  }, [menuOpen])

  const handleSignOut = async () => {
    setSigningOut(true)
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className={`app-shell ${sidebarOpen ? 'app-shell--drawer' : ''}`.trim()}>
      <div
        className="app-shell__scrim"
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <aside className="sidebar">
        <div className="sidebar__brand">
          <Logo size={30} tone="light" />
        </div>

        <nav className="sidebar__nav" aria-label="Main navigation">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="sidebar__group">
              <p className="sidebar__group-title">{section.title}</p>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`.trim()
                  }
                >
                  <span className="sidebar__icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar__foot">
          <p>StockSense v0.1</p>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <button
            type="button"
            className="topbar__burger"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label="Toggle navigation"
          >
            <span />
            <span />
            <span />
          </button>

          <div className="topbar__heading">
            <h1>{current?.label ?? 'StockSense'}</h1>
            {current?.description && <p>{current.description}</p>}
          </div>

          <div className="topbar__user" ref={menuRef}>
            <button
              type="button"
              className="avatar-button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <span className="avatar">{initialsOf(user?.name)}</span>
              <span className="avatar-button__meta">
                <strong>{user?.name}</strong>
                <small>{user?.role}</small>
              </span>
              <svg width="14" height="14" viewBox="0 0 20 20" aria-hidden="true">
                <path
                  d="M5 8l5 5 5-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            {menuOpen && (
              <div className="menu" role="menu">
                <div className="menu__header">
                  <strong>{user?.name}</strong>
                  <span>{user?.email}</span>
                </div>
                <button
                  type="button"
                  className="menu__item"
                  role="menuitem"
                  onClick={() => navigate('/profile')}
                >
                  Profile
                </button>
                <button
                  type="button"
                  className="menu__item menu__item--danger"
                  role="menuitem"
                  onClick={handleSignOut}
                  disabled={signingOut}
                >
                  {signingOut ? 'Signing out…' : 'Log out'}
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
