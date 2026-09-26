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
    event.preventDefault()
    setError('')
    setNotice('')
    setSubmitting(true)
    try {
      await signIn(form.email.trim(), form.password)
      navigate(location.state?.from ?? '/dashboard', { replace: true })
    } catch (err) {
      setError(toErrorMessage(err, 'Unable to log in. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <header className="auth-card__head">
        <h2>Welcome back</h2>
        <p>Log in to your StockSense workspace.</p>
      </header>

      <Alert variant="success" onDismiss={() => setNotice('')}>
        {notice}
      </Alert>
      <Alert onDismiss={() => setError('')}>{error}</Alert>

      <form className="form" onSubmit={handleSubmit} noValidate>
        <Field
          label="Work email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={form.email}
          onChange={update('email')}
          required
        />
        <Field
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={form.password}
          onChange={update('password')}
          showPasswordToggle
          required
        />

        <div className="form__row form__row--between">
          <Link className="link" to="/forgot-password">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" loading={submitting} className="btn--block">
          {submitting ? 'Logging in...' : 'Log in'}
        </Button>
      </form>

      <p className="auth-card__foot">
        New to StockSense?{' '}
        <Link className="link" to="/signup">
          Create an account
        </Link>
      </p>
    </>
  )
}
