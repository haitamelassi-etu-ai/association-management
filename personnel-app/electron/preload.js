const { contextBridge, ipcRenderer } = require('electron');

// عرض API آمن للواجهة
contextBridge.exposeInMainWorld('electronAPI', {
  // Auth
  login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
  
  // Attendance
  getAttendance: (params) => ipcRenderer.invoke('attendance:get', params),
  checkIn: (userId) => ipcRenderer.invoke('attendance:checkIn', { userId }),
  checkOut: (userId) => ipcRenderer.invoke('attendance:checkOut', { userId }),
  
  // Beneficiaries
  getBeneficiaries: () => ipcRenderer.invoke('beneficiaries:getAll'),
  createBeneficiary: (data) => ipcRenderer.invoke('beneficiaries:create', data),
  getBeneficiariesStats: () => ipcRenderer.invoke('beneficiaries:stats'),
  
  // Announcements
  getAnnouncements: () => ipcRenderer.invoke('announcements:getAll'),
  
  // Platform info
  isElectron: true
});

console.log('✅ Preload script loaded - Electron API exposed');
