import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

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

// Track whether we are currently refreshing to prevent infinite loops
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

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

// Response Interceptor: Auto-refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized — only if this isn't already a retry or a refresh request
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/api/auth/refresh") &&
      !originalRequest.url?.includes("/api/auth/quick-refresh") &&
      !originalRequest.url?.includes("/api/auth/login")
    ) {
      if (typeof window === "undefined") return Promise.reject(error);

      if (isRefreshing) {
        // Queue this request until the refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const storedRefreshToken = localStorage.getItem("refreshToken");

      if (!storedRefreshToken) {
        isRefreshing = false;
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${getBaseUrl()}/api/auth/quick-refresh`, {
          refreshToken: storedRefreshToken,
        });

        const newAccessToken = res.data?.data?.accessToken;
        if (newAccessToken) {
          localStorage.setItem("accessToken", newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          processQueue(null, newAccessToken);
          return apiClient(originalRequest);
        } else {
          throw new Error("No access token in refresh response");
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Centralized error logging (skip for AbortError / cancelled requests)
    if (error.code !== "ERR_CANCELED") {
      console.error("API Error:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    }

    return Promise.reject(error);
  },
);

// Auth functions
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
