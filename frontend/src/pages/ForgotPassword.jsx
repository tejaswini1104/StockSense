import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import * as authApi from '../api/auth'
import { toErrorMessage } from '../api/client'
import Alert from '../components/Alert'
import Button from '../components/Button'
import Field from '../components/Field'
import OtpInput from '../components/OtpInput'

const STEPS = ['Email', 'Verify code', 'New password']
const RESEND_COOLDOWN_SECONDS = 30
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ForgotPassword() {
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [passwords, setPasswords] = useState({ password: '', confirmPassword: '' })

  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return undefined
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const requestCode = async ({ resend = false } = {}) => {
    setError('')
    setNotice('')
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError('Enter a valid email address.')
      return
    }
    setSubmitting(true)
    try {
      const data = await authApi.requestPasswordReset(email.trim())
      setNotice(resend ? 'A new code has been sent.' : data.message)
      setCooldown(RESEND_COOLDOWN_SECONDS)
      setCode('')
      setStep(1)
    } catch (err) {
      setError(toErrorMessage(err, 'Could not send a reset code. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  const verifyCode = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    if (code.length !== 6) {
      setError('Enter the 6-digit code from your email.')
      return
    }
    setSubmitting(true)
    try {
      await authApi.verifyOtp(email.trim(), code)
      setStep(2)
    } catch (err) {
      setError(toErrorMessage(err, 'That code could not be verified.'))
    } finally {
      setSubmitting(false)
    }
  }

  const submitNewPassword = async (event) => {
    event.preventDefault()
    setError('')
    if (passwords.password.length < 8) {
      setError('Your new password must be at least 8 characters.')
      return
    }
    if (passwords.password !== passwords.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      await authApi.resetPassword(email.trim(), code, passwords.password)
      navigate('/login', {
        replace: true,
        state: { notice: 'Password updated. You can now log in.' },
      })
    } catch (err) {
      // The code is single-use: if it was already burned, send the user back
      // to step one rather than leaving them stuck on a dead form.
      const message = toErrorMessage(err, 'Could not reset your password.')
      setError(message)
      if (/used|expired|request a new/i.test(message)) {
        setCode('')
        setStep(1)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <header className="auth-card__head">
        <h2>Reset your password</h2>
        <p>
          {step === 0 && 'We will email you a one-time code to confirm it is you.'}
          {step === 1 && `Enter the 6-digit code sent to ${email.trim()}.`}
          {step === 2 && 'Choose a new password for your account.'}
        </p>
      </header>

      <ol className="stepper" aria-label="Progress">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={`stepper__step ${
              index === step
                ? 'stepper__step--current'
                : index < step
                  ? 'stepper__step--done'
                  : ''
            }`.trim()}
          >
            <span className="stepper__dot">{index < step ? '✓' : index + 1}</span>
            <span className="stepper__label">{label}</span>
          </li>
        ))}
      </ol>

      <Alert variant="success" onDismiss={() => setNotice('')}>
        {notice}
      </Alert>
      <Alert onDismiss={() => setError('')}>{error}</Alert>

      {step === 0 && (
        <form
          className="form"
          onSubmit={(event) => {
            event.preventDefault()
            requestCode()
          }}
          noValidate
        >
          <Field
            label="Work email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Button type="submit" loading={submitting} className="btn--block">
            {submitting ? 'Sending code...' : 'Send reset code'}
          </Button>
        </form>
      )}

      {step === 1 && (
        <form className="form" onSubmit={verifyCode} noValidate>
          <OtpInput value={code} onChange={setCode} disabled={submitting} />
          <p className="field__hint field__hint--center">
            The code expires in 10 minutes and can be used once.
          </p>
          <Button type="submit" loading={submitting} className="btn--block">
            {submitting ? 'Verifying...' : 'Verify code'}
          </Button>
          <div className="form__row form__row--between">
            <button
              type="button"
              className="link link--button"
              onClick={() => {
                setStep(0)
                setError('')
                setNotice('')
              }}
            >
              Change email
            </button>
            <button
              type="button"
              className="link link--button"
              onClick={() => requestCode({ resend: true })}
              disabled={cooldown > 0 || submitting}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form className="form" onSubmit={submitNewPassword} noValidate>
          <Field
            label="New password"
            type="password"
            name="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={passwords.password}
            onChange={(event) =>
              setPasswords({ ...passwords, password: event.target.value })
            }
            showPasswordToggle
            required
          />
          <Field
            label="Confirm new password"
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="Re-enter password"
            value={passwords.confirmPassword}
            onChange={(event) =>
              setPasswords({ ...passwords, confirmPassword: event.target.value })
            }
            required
          />
          <Button type="submit" loading={submitting} className="btn--block">
            {submitting ? 'Updating password...' : 'Update password'}
          </Button>
        </form>
      )}

      <p className="auth-card__foot">
        <Link className="link" to="/login">
          Back to log in
        </Link>
      </p>
    </>
  )
}
