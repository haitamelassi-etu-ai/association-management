/**
 * Get API URL - works on both desktop and mobile
 * Automatically detects the current hostname and uses it with port 5000
 */
export const getApiUrl = () => {
  const hostname = window.location.hostname;

  // Local development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    console.log('📍 Using localhost API');
    return 'http://localhost:5000';
  }

  // Production: use same origin (Vercel frontend + /api serverless)
  console.log('📍 Using same-origin API:', window.location.origin);
  return window.location.origin;
};

export const API_BASE_URL = getApiUrl();
export const API_URL = `${API_BASE_URL}/api`;

console.log('🌐 API Configuration:');
console.log('   BASE_URL:', API_BASE_URL);
console.log('   API_URL:', API_URL);
