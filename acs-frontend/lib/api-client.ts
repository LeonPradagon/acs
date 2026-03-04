import axios from "axios";

/**
 * API Client ("Interpreter")
 * Centralized axios instance with interceptors for token management and error handling
 */

const getBaseUrl = () => {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
};

const apiClient = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Attach access token to headers
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response Interceptor: Handle errors and token expiration
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized (Token expired or invalid)
    if (error.response && error.response.status === 401) {
      console.warn(
        "Unauthorized access - redirecting to login or refreshing token",
      );

      // Optional: Logic to clear storage and redirect
      if (typeof window !== "undefined") {
        // localStorage.removeItem("accessToken");
        // window.location.href = "/login";
      }
    }

    // Centralized error logging
    console.error("API Error:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    return Promise.reject(error);
  },
);

// Auth functions to replace redundant api.ts
export const authApi = {
  login: async (credentials: { username: string; password: string }) => {
    const response = await apiClient.post("/api/auth/login", credentials);
    return response.data;
  },

  verifyToken: async () => {
    const response = await apiClient.get("/api/auth/verify");
    return response.data;
  },

  refreshToken: async (refreshToken: string) => {
    const response = await apiClient.post("/api/auth/refresh", {
      refreshToken,
    });
    return response.data;
  },

  quickRefresh: async (refreshToken: string) => {
    const response = await apiClient.post("/api/auth/quick-refresh", {
      refreshToken,
    });
    return response.data;
  },

  logBaseUrl: () => {
    console.log("🔧 API Base URL:", apiClient.defaults.baseURL);
    console.log("🔧 App Name:", process.env.NEXT_PUBLIC_APP_NAME);
  },
};

export default apiClient;
