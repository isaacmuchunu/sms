import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor: attach auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sms_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      toast.error('Network error. Please check your connection.');
      return Promise.reject(error);
    }

    const { status, data } = error.response;

    switch (status) {
      case 401:
        localStorage.removeItem('sms_token');
        localStorage.removeItem('sms_user');
        toast.error('Session expired. Please log in again.');
        window.location.href = '/login';
        break;

      case 403:
        toast.error(data?.message || 'You do not have permission to access this resource.');
        break;

      case 404:
        toast.error(data?.message || 'Resource not found.');
        break;

      case 422:
        // Validation errors - handled by forms
        break;

      case 429:
        toast.error('Too many requests. Please try again later.');
        break;

      case 500:
        toast.error('Server error. Please try again later.');
        break;

      default:
        toast.error(data?.message || 'An unexpected error occurred.');
    }

    return Promise.reject(error);
  }
);

export default api;
