/**
 * Axios instance with JWT interceptors.
 * Automatically attaches Authorization header and handles 401 errors.
 */
import axios from 'axios'

const API_BASE_URL = 'http://127.0.0.1:5000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
})

// ---- Request interceptor: attach JWT ----
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ---- Response interceptor: handle 401 ----
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid — clear storage and redirect to login
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      // Only redirect if not already on the login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// ---- Auth API helpers ----
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
}

// ---- User Management API helpers ----
export const usersAPI = {
  list:      (params)      => api.get('/users', { params }),
  get:       (id)          => api.get(`/users/${id}`),
  create:    (data)        => api.post('/users', data),
  update:    (id, data)    => api.put(`/users/${id}`, data),
  setStatus: (id, active)  => api.patch(`/users/${id}/status`, { is_active: active }),
}

export default api
