import client from './client'

export const signup = (payload) =>
  client.post('/auth/signup', payload).then((res) => res.data)

export const login = (email, password) =>
  client.post('/auth/login', { email, password }).then((res) => res.data)

export const fetchCurrentUser = () =>
  client.get('/auth/me').then((res) => res.data)

export const logout = () => client.post('/auth/logout').then((res) => res.data)

export const requestPasswordReset = (email) =>
  client.post('/auth/forgot-password', { email }).then((res) => res.data)

export const verifyOtp = (email, code) =>
  client.post('/auth/verify-otp', { email, code }).then((res) => res.data)

export const resetPassword = (email, code, newPassword) =>
  client
    .post('/auth/reset-password', { email, code, new_password: newPassword })
    .then((res) => res.data)

export const updateProfile = (payload) =>
  client.patch('/users/me', payload).then((res) => res.data)
