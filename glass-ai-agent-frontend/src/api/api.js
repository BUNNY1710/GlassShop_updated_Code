
import axios from "axios";

// Determine API base URL
// Priority:
// 1. REACT_APP_API_URL environment variable (explicitly set)
// 2. Auto-detect S3 deployment and use EC2 backend
// 3. localhost:8080 for development
const getBaseURL = () => {
  // If REACT_APP_API_URL is explicitly set, use it
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Auto-detect S3 deployment (hostname contains 's3-website' or 'amazonaws.com')
  const hostname = window.location.hostname;
  if (hostname.includes('s3-website') || hostname.includes('amazonaws.com') || hostname.includes('cloudfront.net')) {
    // S3/CloudFront deployment - use EC2 backend with port 8080
    return 'http://16.16.73.29:8080';
  }
  
  // Development: use localhost:8080
  return "http://localhost:8080";
};

const api = axios.create({
  baseURL: getBaseURL(),
});

// 🔐 ADD JWT TOKEN TO EVERY REQUEST
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// 🔄 HANDLE 401 UNAUTHORIZED - REDIRECT TO LOGIN
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and role
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("role");
      
      // Redirect to login (only if not already on login page)
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;