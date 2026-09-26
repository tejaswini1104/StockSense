import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { toErrorMessage } from '../api/client'
import Alert from '../components/Alert'
import Button from '../components/Button'
import Field from '../components/Field'
import { useAuth } from '../context/AuthContext'

const ROLES = [
  { value: 'staff', label: 'Staff - record stock movements' },
  { value: 'manager', label: 'Manager - manage products and warehouses' },
  { value: 'admin', label: 'Admin - full access' },
]

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Signup() {
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'staff',
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const update = (key) => (event) => {
    setForm({ ...form, [key]: event.target.value })
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const validate = () => {
    const errors = {}
    if (form.name.trim().length < 2) errors.name = 'Enter your full name.'
    if (!EMAIL_PATTERN.test(form.email.trim())) {
      errors.email = 'Enter a valid email address.'
    }
    if (form.password.length < 8) {
      errors.password = 'Use at least 8 characters.'
    } else if (new TextEncoder().encode(form.password).length > 72) {
      // bcrypt ignores anything past 72 bytes, so the backend rejects it too.
      errors.password = 'Password must be at most 72 bytes.'
    }
    if (form.confirmPassword !== form.password) {
      errors.confirmPassword = 'Passwords do not match.'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    if (!validate()) return

    setSubmitting(true)
    try {
      await signUp({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(toErrorMessage(err, 'Unable to create your account. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <header className="auth-card__head">
        <h2>Create your account</h2>
        <p>Set up your StockSense workspace in a minute.</p>
      </header>

      <Alert onDismiss={() => setError('')}>{error}</Alert>

      <form className="form" onSubmit={handleSubmit} noValidate>
        <Field
          label="Full name"
          name="name"
          autoComplete="name"
          placeholder="Jane Doe"
          value={form.name}
          onChange={update('name')}
          error={fieldErrors.name}
          required
        />
        <Field
          label="Work email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={form.email}
          onChange={update('email')}
          error={fieldErrors.email}
          required
        />

        <div className="field">
          <label className="field__label" htmlFor="signup-role">
            Role
          </label>
          <div className="field__control">
            <select
              id="signup-role"
              className="field__input"
              value={form.role}
              onChange={update('role')}
            >
              {ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form__grid">
          <Field
            label="Password"
            type="password"
            name="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={update('password')}
            error={fieldErrors.password}
            showPasswordToggle
            required
          />
          <Field
            label="Confirm password"
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="Re-enter password"
            value={form.confirmPassword}
            onChange={update('confirmPassword')}
            error={fieldErrors.confirmPassword}
            required
          />
        </div>

        <Button type="submit" loading={submitting} className="btn--block">
          {submitting ? 'Creating account...' : 'Create account'}
        </Button>
      </form>

      <p className="auth-card__foot">
        Already registered?{' '}
        <Link className="link" to="/login">
          Log in
        </Link>
      </p>
    </>
  )
}
