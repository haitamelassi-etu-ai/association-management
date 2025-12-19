import axios from 'axios'

// API Base URL - Use environment variable in production
const getAPIBaseURL = () => {
  // First priority: environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  
  // Second priority: check if running locally
  const hostname = window.location.hostname
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5000'
  }
  
  // Third priority: use same domain (Vercel deployment)
  return window.location.origin
}

const API_BASE_URL = getAPIBaseURL()
const API_URL = `${API_BASE_URL}/api`

console.log('🔧 API Configuration:', { 
  hostname: window.location.hostname, 
  API_BASE_URL,
  API_URL,
  env: import.meta.env.VITE_API_URL,
  mode: import.meta.env.MODE
})

// Socket.io URL export for chat
export const SOCKET_URL = API_BASE_URL

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('professionalToken')
  const user = localStorage.getItem('professionalUser')
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  } else if (user) {
    const userData = JSON.parse(user)
    if (userData.token) {
      config.headers.Authorization = `Bearer ${userData.token}`
    }
  }
  
  console.log('API Request:', config.url, 'Token:', config.headers.Authorization ? 'Present' : 'Missing')
  return config
})

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me')
}

// Beneficiaries API
export const beneficiariesAPI = {
  getAll: (params) => api.get('/beneficiaries', { params }),
  getById: (id) => api.get(`/beneficiaries/${id}`),
  create: (data) => api.post('/beneficiaries', data),
  update: (id, data) => api.put(`/beneficiaries/${id}`, data),
  delete: (id) => api.delete(`/beneficiaries/${id}`),
  addSuivi: (id, data) => api.post(`/beneficiaries/${id}/suivi`, data),
  getStats: () => api.get('/beneficiaries/stats/dashboard')
}

// Announcements API
export const announcementsAPI = {
  getAll: () => api.get('/announcements'),
  create: (data) => api.post('/announcements', data),
  delete: (id) => api.delete(`/announcements/${id}`)
}

// Attendance API
export const attendanceAPI = {
  checkIn: (data) => api.post('/attendance/checkin', data),
  checkOut: (id) => api.put(`/attendance/checkout/${id}`),
  getMy: (params) => api.get('/attendance/me', { params }),
  getAll: (params) => api.get('/attendance', { params })
}

export default api
