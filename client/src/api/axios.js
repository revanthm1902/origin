import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true 
});

// Add a response interceptor
api.interceptors.response.use(
  (response) => response, // If the request succeeds, just return it
  async (error) => {
    const originalRequest = error.config;

    // If the error is 403 (Forbidden/Expired) and we haven't already retried this request
    if (error.response?.status === 403 && !originalRequest._retry) {
      originalRequest._retry = true; // Mark as retried to prevent infinite loops

      try {
        // Ask backend for a new access token using our refresh cookie
        await api.post('/auth/refresh');
        
        // If successful, the new cookie is set. Retry the original request!
        return api(originalRequest);
      } catch (refreshError) {
        // If the refresh token is ALSO expired, force a logout (redirect to login)
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;