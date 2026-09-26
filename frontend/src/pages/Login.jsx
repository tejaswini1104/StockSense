import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toErrorMessage } from '../api/client'
import Alert from '../components/Alert'
import Button from '../components/Button'
import Field from '../components/Field'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(location.state?.notice ?? '')
  const [submitting, setSubmitting] = useState(false)

  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value })

  const handleSubmit = async (event) => {
    if (event) event.preventDefault()
    setError('')
    setNotice('')
    setSubmitting(true)
    try {
      await signIn(form.email.trim(), form.password)
      navigate(location.state?.from ?? '/dashboard', { replace: true })
    } catch (err) {
      setError(toErrorMessage(err, 'Unable to log in. Please check your email and password.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleQuickFill = async (email, password) => {
    setForm({ email, password })
    setError('')
    setNotice('')
    setSubmitting(true)
    try {
      await signIn(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(toErrorMessage(err, 'Quick login failed.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <header className="auth-card__head">
        <h2>Welcome Back</h2>
        <p>Enter your credentials to access your workspace.</p>
      </header>

      {notice && (
        <Alert variant="success" onDismiss={() => setNotice('')}>
          {notice}
        </Alert>
      )}
      {error && <Alert onDismiss={() => setError('')}>{error}</Alert>}

      {/* Quick Demo Credentials Box */}
      <div className="demo-credentials-box">
        <div className="demo-credentials-box__header">
          <span>⚡ One-Click Quick Demo Login:</span>
        </div>
        <div className="demo-credentials-box__chips">
          <button
            type="button"
            className="demo-chip demo-chip--admin"
            onClick={() => handleQuickFill('admin@stocksense.com', 'Admin123!')}
            disabled={submitting}
          >
            🔑 Admin Login
          </button>
          <button
            type="button"
            className="demo-chip demo-chip--manager"
            onClick={() => handleQuickFill('manager@stocksense.com', 'Manager123!')}
            disabled={submitting}
          >
            📋 Manager Login
          </button>
        </div>
      </div>

      <form className="form" onSubmit={handleSubmit} noValidate style={{ marginTop: '1.25rem' }}>
        <Field
          label="Work Email Address"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="e.g. admin@stocksense.com"
          value={form.email}
          onChange={update('email')}
          required
        />
        <Field
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="••••••••••••"
          value={form.password}
          onChange={update('password')}
          showPasswordToggle
          required
        />

        <div className="form__row form__row--between" style={{ margin: '0.25rem 0' }}>
          <span className="remember-text">Secure SSL Encrypted Session</span>
          <Link className="link" to="/forgot-password">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" loading={submitting} className="btn--block btn--lg">
          {submitting ? 'Authenticating...' : 'Sign In to Dashboard'}
        </Button>
      </form>

      <p className="auth-card__foot">
        Don't have an account yet?{' '}
        <Link className="link" to="/signup">
          Create a new workspace account
        </Link>
      </p>
    </>
  )
}
