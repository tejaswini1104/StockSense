import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import * as authApi from '../api/auth'
import { getStoredToken, setStoredToken } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => getStoredToken())
  // `initializing` is true until we know whether the stored token is valid,
  // so route guards never redirect a logged-in user on a page refresh.
  const [initializing, setInitializing] = useState(Boolean(getStoredToken()))

  const clearSession = useCallback(() => {
    setStoredToken(null)
    setToken(null)
    setUser(null)
  }, [])

  const applySession = useCallback((data) => {
    setStoredToken(data.access_token)
    setToken(data.access_token)
    setUser(data.user)
    return data.user
  }, [])

  // Revalidate a token restored from localStorage against the backend.
  useEffect(() => {
    let cancelled = false
    // No stored token means `initializing` already started false.
    if (!getStoredToken()) return undefined

    authApi
      .fetchCurrentUser()
      .then((me) => {
        if (!cancelled) setUser(me)
      })
      .catch(() => {
        if (!cancelled) clearSession()
      })
      .finally(() => {
        if (!cancelled) setInitializing(false)
      })
    return () => {
      cancelled = true
    }
  }, [clearSession])

  // The axios interceptor fires this when any request comes back 401.
  useEffect(() => {
    const handler = () => clearSession()
    window.addEventListener('stocksense:unauthorized', handler)
    return () => window.removeEventListener('stocksense:unauthorized', handler)
  }, [clearSession])

  const signIn = useCallback(
    async (email, password) => applySession(await authApi.login(email, password)),
    [applySession],
  )

  const signUp = useCallback(
    async (payload) => applySession(await authApi.signup(payload)),
    [applySession],
  )

  const signOut = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // Logging out locally must succeed even if the server call fails.
    }
    clearSession()
  }, [clearSession])

  const value = useMemo(
    () => ({
      user,
      token,
      initializing,
      isAuthenticated: Boolean(token && user),
      signIn,
      signUp,
      signOut,
      setUser,
    }),
    [user, token, initializing, signIn, signUp, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside an <AuthProvider>')
  return context
}
