// API adapter for Electron - التخزين المحلي
const isElectron = window.electronAPI?.isElectron || false;

// Fallback axios
import axios from 'axios'
const API_BASE_URL = 'http://localhost:5000'
const API_URL = `${API_BASE_URL}/api`
export const SOCKET_URL = API_BASE_URL

const axiosApi = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
})

// Auth API
export const authAPI = {
  login: async (data) => {
    if (isElectron) {
      const result = await window.electronAPI.login(data)
      if (result.success) {
        return { data: { token: 'local-token', user: result.user } }
      }
      throw new Error(result.message)
    }
    return axiosApi.post('/auth/login', data)
  },
  logout: () => Promise.resolve({ data: { message: 'Logged out' } })
}

// Attendance API  
export const attendanceAPI = {
  getRecords: async (params) => {
    if (isElectron) {
      const user = JSON.parse(localStorage.getItem('professionalUser'))
      const result = await window.electronAPI.getAttendance({ 
        userId: user.id, 
        month: params?.month, 
        year: params?.year 
      })
      return { data: result.data }
    }
    return axiosApi.get('/attendance', { params })
  },
  checkIn: async () => {
    if (isElectron) {
      const user = JSON.parse(localStorage.getItem('professionalUser'))
      const result = await window.electronAPI.checkIn(user.id)
      if (!result.success) throw new Error(result.message)
      return { data: result.data }
    }
    return axiosApi.post('/attendance/checkin')
  },
  checkOut: async () => {
    if (isElectron) {
      const user = JSON.parse(localStorage.getItem('professionalUser'))
      const result = await window.electronAPI.checkOut(user.id)
      if (!result.success) throw new Error(result.message)
      return { data: result.data }
    }
    return axiosApi.post('/attendance/checkout')
  }
}

// Beneficiaries API
export const beneficiariesAPI = {
  getAll: async () => {
    if (isElectron) {
      const result = await window.electronAPI.getBeneficiaries()
      return { data: { data: result.data } }
    }
    return axiosApi.get('/beneficiaries')
  },
  create: async (data) => {
    if (isElectron) {
      const result = await window.electronAPI.createBeneficiary(data)
      if (!result.success) throw new Error(result.message)
      return { data: { data: result.data } }
    }
    return axiosApi.post('/beneficiaries', data)
  },
  getStats: async () => {
    if (isElectron) {
      const result = await window.electronAPI.getBeneficiariesStats()
      return { data: { data: result.data } }
    }
    return axiosApi.get('/beneficiaries/stats')
  },
  update: (id, data) => isElectron ? Promise.reject('Not yet') : axiosApi.put(`/beneficiaries/${id}`, data),
  delete: (id) => isElectron ? Promise.reject('Not yet') : axiosApi.delete(`/beneficiaries/${id}`)
}

// Announcements API
export const announcementsAPI = {
  getAll: async () => {
    if (isElectron) {
      const result = await window.electronAPI.getAnnouncements()
      return { data: { data: result.data } }
    }
    return axiosApi.get('/announcements')
  },
  create: (data) => isElectron ? Promise.reject('Not yet') : axiosApi.post('/announcements', data),
  update: (id, data) => isElectron ? Promise.reject('Not yet') : axiosApi.put(`/announcements/${id}`, data),
  delete: (id) => isElectron ? Promise.reject('Not yet') : axiosApi.delete(`/announcements/${id}`)
}

// Food Stock API
export const foodStockAPI = {
  getAll: () => Promise.resolve({ data: { data: [] } }),
  create: () => Promise.reject('Not yet'),
  update: () => Promise.reject('Not yet'),
  delete: () => Promise.reject('Not yet')
}

// Pharmacy API  
export const pharmacyAPI = {
  getAll: () => Promise.resolve({ data: { data: [] } }),
  create: () => Promise.reject('Not yet'),
  update: () => Promise.reject('Not yet'),
  delete: () => Promise.reject('Not yet')
}

// Meals API
export const mealsAPI = {
  getAll: () => Promise.resolve({ data: { data: [] } }),
  create: () => Promise.reject('Not yet')
}

// Medications API
export const medicationsAPI = {
  getAll: () => Promise.resolve({ data: { data: [] } }),
  create: () => Promise.reject('Not yet')
}

// Documents API
export const documentsAPI = {
  upload: () => Promise.reject('Not yet'),
  getAll: () => Promise.resolve({ data: { data: [] } }),
  delete: () => Promise.reject('Not yet')
}

// Notifications API
export const notificationsAPI = {
  getAll: () => Promise.resolve({ data: { data: [] } }),
  markAsRead: () => Promise.resolve({ data: {} }),
  markAllAsRead: () => Promise.resolve({ data: {} })
}

// Users API
export const usersAPI = {
  getAll: () => Promise.resolve({ data: { data: [] } }),
  create: () => Promise.reject('Not yet')
}

// Reports API
export const reportsAPI = {
  generate: () => Promise.resolve({ data: { data: {} } })
}

// Exit Logs API
export const exitLogsAPI = {
  getAll: () => Promise.resolve({ data: { data: [] } }),
  create: () => Promise.reject('Not yet')
}

export default axiosApi
