import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import * as authApi from '../api/auth'
import { toErrorMessage } from '../api/client'
import Alert from '../components/Alert'
import Button from '../components/Button'
import Field from '../components/Field'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { user, setUser, signOut } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState(user?.name ?? '')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const dirty = name.trim() !== (user?.name ?? '')

  const handleSave = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    if (name.trim().length < 2) {
      setError('Enter your full name.')
      return
    }
    setSaving(true)
    try {
      const updated = await authApi.updateProfile({ name: name.trim() })
      setUser(updated)
      setNotice('Profile updated.')
    } catch (err) {
      setError(toErrorMessage(err, 'Could not update your profile.'))
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="stack stack--narrow">
      <section className="card">
        <header className="card__head">
          <h3>Your profile</h3>
        </header>

        <Alert variant="success" onDismiss={() => setNotice('')}>
          {notice}
        </Alert>
        <Alert onDismiss={() => setError('')}>{error}</Alert>

        <form className="form" onSubmit={handleSave} noValidate>
          <Field
            label="Full name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <Field
            label="Email"
            name="email"
            value={user?.email ?? ''}
            readOnly
            disabled
            hint="Your email is used to log in and cannot be changed here."
          />
          <Field
            label="Role"
            name="role"
            value={user?.role ?? ''}
            readOnly
            disabled
            hint="Roles are assigned by an administrator."
          />

          <Button type="submit" loading={saving} disabled={!dirty}>
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </form>
      </section>

      <section className="card">
        <header className="card__head">
          <h3>Session</h3>
        </header>
        <p className="card__text">
          Logging out clears your access token from this browser.
        </p>
        <Button variant="danger" onClick={handleSignOut} loading={signingOut}>
          {signingOut ? 'Logging out...' : 'Log out'}
        </Button>
      </section>
    </div>
  )
}
