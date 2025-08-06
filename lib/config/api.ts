import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const API_VERSION = "/api/v1";


// Default axios config
const defaultConfig: AxiosRequestConfig = {
  baseURL: API_URL + API_VERSION,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // Required for CORS with credentials
};

// Public API - for endpoints that don't require authentication
export const publicApi: AxiosInstance = axios.create({
  ...defaultConfig,
});

// Private API - for endpoints that require authentication
export const privateApi: AxiosInstance = axios.create({
  ...defaultConfig,
});

// Add optional auth interceptor to publicApi - includes token if available
publicApi.interceptors.request.use(async (config) => {
  return config;
});

// Create the authentication header interceptor for privateApi
privateApi.interceptors.request.use(async (config) => {
  return config;
});

// Error handling interceptor for both APIs
const errorInterceptor = (error: AxiosError) => {
  // You can add global error handling here
  if (error.response?.status === 500) {
    console.error('Server error occurred');
  }
  
  if (error.response?.status === 0 || error.code === 'ERR_NETWORK') {
    console.error('Network error - server may be down or CORS issue');
  }
  
  return Promise.reject(error);
};

publicApi.interceptors.response.use(
  (response) => response,
  errorInterceptor
);

privateApi.interceptors.response.use(
  (response) => response,
  errorInterceptor
);

export default {
  publicApi,
  privateApi,
}; 