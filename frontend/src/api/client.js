import axios from 'axios'

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api/v1'

export const TOKEN_STORAGE_KEY = 'stocksense.token'

export const getStoredToken = () => localStorage.getItem(TOKEN_STORAGE_KEY)

export const setStoredToken = (token) => {
  if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token)
  else localStorage.removeItem(TOKEN_STORAGE_KEY)
}

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
})

// Attach the bearer token to every outgoing request.
client.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// A 401 means the stored token is gone or expired: clear it and let the
// route guards send the user back to /login.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      setStoredToken(null)
      window.dispatchEvent(new Event('stocksense:unauthorized'))
    }
    return Promise.reject(error)
  },
)

/** Turn an axios error into a single human-readable message. */
export function toErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (error?.code === 'ECONNABORTED') return 'The request timed out. Please try again.'
  if (!error?.response) return 'Cannot reach the server. Is the backend running?'

  const detail = error.response.data?.detail
  if (typeof detail === 'string') return detail
  // FastAPI validation errors arrive as a list of {loc, msg} objects.
  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((item) => {
        const field = item.loc?.filter((part) => part !== 'body').join('.')
        return field ? `${field}: ${item.msg}` : item.msg
      })
      .join(' ')
  }
  return fallback
}

export default client
