/**
 * Get API URL - works on both desktop and mobile
 * Automatically detects the current hostname and uses it with port 5000
 */
export const getApiUrl = () => {
  // Check for environment variable first
  if (import.meta.env.VITE_API_URL) {
    console.log('📍 Using VITE_API_URL:', import.meta.env.VITE_API_URL);
    return import.meta.env.VITE_API_URL;
  }

  // Always use localhost for development
  console.log('📍 Using localhost API');
  return 'http://localhost:5000';
};

export const API_BASE_URL = getApiUrl();
export const API_URL = `${API_BASE_URL}/api`;

console.log('🌐 API Configuration:');
console.log('   BASE_URL:', API_BASE_URL);
console.log('   API_URL:', API_URL);
