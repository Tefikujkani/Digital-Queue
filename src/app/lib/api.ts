import axios from 'axios'

const DEFAULT_API_URL = 'http://localhost:5001/api'
const API_URL =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : DEFAULT_API_URL

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('smartqueue_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config

    if (error.response && error.response.status === 401) {
      const isAuthRoute =
        config?.url?.includes('/auth/login') ||
        config?.url?.includes('/auth/register') ||
        config?.url?.includes('/auth/forgot') ||
        config?.url?.includes('/auth/reset')
      if (!isAuthRoute) {
        localStorage.removeItem('smartqueue_token')
        localStorage.removeItem('smartqueue_current_user')
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
      }
      return Promise.reject(error)
    }

    // Fallback port vetëm në development
    if (
      !import.meta.env.PROD &&
      !error.response &&
      config &&
      !(config as any)._retry
    ) {
      ;(config as any)._retry = true
      const currentBaseURL = config.baseURL || ''
      if (currentBaseURL.includes('5001')) {
        config.baseURL = 'http://localhost:5000/api'
        return api(config)
      }
      if (currentBaseURL.includes('5000')) {
        config.baseURL = 'http://localhost:5001/api'
        return api(config)
      }
    }

    return Promise.reject(error)
  },
)

export default api
