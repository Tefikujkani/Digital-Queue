import axios from 'axios'

// Safely get the API URL with a fallback
const DEFAULT_API_URL = 'http://localhost:5000/api'
const FALLBACK_API_URL = 'http://localhost:5001/api'
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

// Add a request interceptor to include the JWT token
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

// Add a response interceptor to handle errors and fallbacks
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config

    // Handle Token Expiration
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('smartqueue_token')
      localStorage.removeItem('smartqueue_current_user')
      // Only redirect to login if we're not already there and it's not a login request
      if (!window.location.pathname.includes('/login') && !config.url.includes('/auth/login')) {
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }

    // Handle Connection Fallback (from 5000 to 5001 or vice-versa if needed)
    if (!error.response && config && !config._retry) {
      config._retry = true
      const currentBaseURL = config.baseURL || ''
      
      if (currentBaseURL.includes('5000')) {
        config.baseURL = FALLBACK_API_URL
        console.log(`Falling back to ${FALLBACK_API_URL}...`)
        return api(config)
      } else if (currentBaseURL.includes('5001')) {
        config.baseURL = DEFAULT_API_URL
        console.log(`Falling back to ${DEFAULT_API_URL}...`)
        return api(config)
      }
    }

    return Promise.reject(error)
  },
)

export default api
