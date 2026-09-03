/**
 * Axios instance with JWT interceptors.
 * Automatically attaches Authorization header and handles 401 errors.
 */
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5005/api'

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
      // Only redirect if not already on the login or register page
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// ---- Auth API helpers ----
export const authAPI = {
  register:  (data) => api.post('/auth/register', data),
  login:     (email, password) => api.post('/auth/login', { email, password }),
  teamLogin: (data) => api.post('/auth/team-login', data),
  logout:    () => api.post('/auth/logout'),
  me:        () => api.get('/auth/me'),
}

// ---- User Management API helpers ----
export const usersAPI = {
  list:           (params)      => api.get('/users', { params }),
  get:            (id)          => api.get(`/users/${id}`),
  create:         (data)        => api.post('/users', data),
  update:         (id, data)    => api.put(`/users/${id}`, data),
  delete:         (id)          => api.delete(`/users/${id}`),
  setStatus:      (id, active)  => api.patch(`/users/${id}/status`, { is_active: active }),
  removeFromTeam: (id)          => api.post(`/users/${id}/remove-from-team`),
}

// ---- Project Management API helpers ----
export const projectsAPI = {
  list:                (params)    => api.get('/projects', { params }),
  get:                 (id)        => api.get(`/projects/${id}`),
  create:              (data)      => api.post('/projects', data),
  update:              (id, data)  => api.put(`/projects/${id}`, data),
  archive:             (id)        => api.patch(`/projects/${id}/archive`),
  members:             (id)        => api.get(`/projects/${id}/members`),
  removeMember:        (projectId, userId) => api.delete(`/projects/${projectId}/members/${userId}`),
  getWebhookConfig:    (id)        => api.get(`/projects/${id}/webhook-config`),
  rotateWebhookSecret: (id)        => api.post(`/projects/${id}/rotate-webhook-secret`),
}

// ---- Issue Management API helpers ----
export const issuesAPI = {
  list:         (params)       => api.get('/issues', { params }),
  get:          (id)           => api.get(`/issues/${id}`),
  create:       (data)         => api.post('/issues', data),
  update:       (id, data)     => api.put(`/issues/${id}`, data),
  updateStatus: (id, status)   => api.patch(`/issues/${id}/status`, { status }),
  delete:       (id)           => api.delete(`/issues/${id}`),
  assignees:    ()             => api.get('/issues/assignees'),
  stats:        ()             => api.get('/issues/stats'),
}

// ---- Comment System API helpers ----
export const commentsAPI = {
  list:   (issueId)          => api.get(`/comments/issue/${issueId}`),
  add:    (issueId, text)    => api.post(`/comments/issue/${issueId}`, { comment_text: text }),
  edit:   (commentId, text)  => api.put(`/comments/${commentId}`, { comment_text: text }),
  delete: (commentId)        => api.delete(`/comments/${commentId}`),
}

// ---- Dashboard API helpers ----
export const dashboardAPI = {
  get: () => api.get('/dashboard'),
}

// ---- Activity Log API helpers ----
export const activityAPI = {
  list:  (params) => api.get('/activity', { params }),
  stats: ()       => api.get('/activity/stats'),
  users: ()       => api.get('/activity/users'),
}

// ---- Reports API helpers ----
export const reportsAPI = {
  issues:      (params) => api.get('/reports/issues', { params }),
  performance: ()       => api.get('/reports/performance'),
  projects:    ()       => api.get('/reports/projects'),
  export:      (type)   => api.get(`/reports/export/${type}`, { responseType: 'blob' }),
  exportPDF:   (type)   => api.get(`/reports/export-pdf/${type}`, { responseType: 'blob' }),
}

// ---- GitHub Webhooks & Events API helpers ----
export const webhooksAPI = {
  events: (issueId) => api.get(`/webhooks/events/${issueId}`),
  stats:  ()        => api.get('/webhooks/stats'),
}


export default api
