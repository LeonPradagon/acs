"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import apiClient, { authApi } from "@/lib/api-client";

interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: {
      id: number;
      username: string;
      email: string;
      role: string;
      name: string;
    };
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiresIn: string;
      expiresAt?: string;
      remainingTime?: number;
    };
  };
  timestamp: string;
}

interface TokenInfo {
  expiresAt: string;
  remainingTime: number;
  isExpiringSoon: boolean;
  expiresIn: string;
}

interface RefreshTokenResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: string;
    remainingTime?: number;
  };
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Auto refresh token states & refs
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const tokenCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);

  // Env
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "ASISGO CORE-SOVEREIGN";
  const appLogo = process.env.NEXT_PUBLIC_APP_LOGO || "/images/Asisgo.png";

  const TOKEN_EXPIRY_THRESHOLD = 60; // refresh jika sisa 1 menit
  const TOKEN_CHECK_INTERVAL = 30000; // check setiap 30 detik
  const TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 menit

  // --- AUTO REFRESH SYSTEM ---
  useEffect(() => {
    apiClient.logBaseUrl?.(); // Optional: if still needed or just use authApi.logBaseUrl()
    authApi.logBaseUrl();

    // Cleanup pada unmount
    return () => {
      clearAllIntervals();
    };
  }, []);

  const clearAllIntervals = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    if (tokenCheckIntervalRef.current) {
      clearInterval(tokenCheckIntervalRef.current);
      tokenCheckIntervalRef.current = null;
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) throw new Error("No refresh token available");

      const data: RefreshTokenResponse =
        await authApi.refreshToken(refreshToken);
      if (!data.success) throw new Error("Token refresh failed");

      const { accessToken, expiresAt, remainingTime } = data.data;
      localStorage.setItem("accessToken", accessToken);
      if (remainingTime !== undefined) setRemainingTime(remainingTime);

      console.log("🔄 Token refreshed successfully");
      return true;
    } catch (err) {
      console.error("❌ Token refresh failed:", err);
      handleAutoLogout();
      return false;
    }
  };

  const quickRefreshToken = async (): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) throw new Error("No refresh token available");

      const data = await authApi.quickRefresh(refreshToken);
      if (!data.success) throw new Error("Quick refresh failed");

      const { accessToken, remainingTime } = data.data;
      localStorage.setItem("accessToken", accessToken);
      if (remainingTime !== undefined) setRemainingTime(remainingTime);

      console.log("⚡ Quick token refresh - Remaining:", remainingTime, "s");
      return true;
    } catch (err) {
      console.error("❌ Quick refresh failed:", err);
      return false;
    }
  };

  const verifyToken = async (): Promise<TokenInfo | null> => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return null;

      const data = await authApi.verifyToken();
      if (!data.success) throw new Error("Token verification failed");

      // Perbaikan: Sesuaikan dengan response structure yang sebenarnya
      return data.data as TokenInfo;
    } catch (err) {
      console.error("❌ Token verification failed:", err);
      return null;
    }
  };

  const setupAutoRefresh = () => {
    clearAllIntervals();

    // Token check interval
    tokenCheckIntervalRef.current = setInterval(async () => {
      const tokenInfo = await verifyToken();
      if (tokenInfo) {
        setRemainingTime(tokenInfo.remainingTime);

        if (
          tokenInfo.remainingTime < TOKEN_EXPIRY_THRESHOLD &&
          tokenInfo.remainingTime > 0
        ) {
          console.log("🔄 Token expiring soon, refreshing...");
          await quickRefreshToken();
        }

        if (tokenInfo.remainingTime <= 0) {
          console.log("🔄 Token expired, attempting refresh...");
          await refreshToken();
        }
      }
    }, TOKEN_CHECK_INTERVAL);

    // Scheduled refresh interval
    refreshIntervalRef.current = setInterval(async () => {
      console.log("🔄 Scheduled token refresh (10 minutes)");
      await quickRefreshToken();
    }, TOKEN_REFRESH_INTERVAL);

    console.log(
      "✅ Auto refresh setup - Checking every 30s, refreshing every 10m",
    );
  };

  const handleAutoLogout = () => {
    clearAllIntervals();
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setMessage({ type: "error", text: "Session expired. Please login again." });
    router.replace("/");
  };

  // --- LOGIN HANDLER ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi input
    if (!username.trim() || !password.trim()) {
      setMessage({
        type: "error",
        text: "Username dan password harus diisi.",
      });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const data: LoginResponse = await authApi.login({
        username: username.trim(),
        password: password.trim(),
      });

      if (!data.success) {
        throw new Error(data.message || "Login gagal");
      }

      const { accessToken, refreshToken, expiresAt, remainingTime } =
        data.data.tokens;

      // Simpan tokens dan user data
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("user", JSON.stringify(data.data.user));

      if (remainingTime !== undefined) setRemainingTime(remainingTime);

      setupAutoRefresh();

      setMessage({
        type: "success",
        text: "Login berhasil! Mengalihkan ke workspace...",
      });

      setTimeout(() => router.replace("/analyst-workspace"), 800);
    } catch (err: any) {
      console.error("Login error:", err);
      clearAllIntervals();

      // Clear storage hanya jika login gagal
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");

      setMessage({
        type: "error",
        text:
          err.message || "Login gagal. Periksa koneksi atau credential Anda.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number | null) => {
    if (seconds === null || seconds < 0) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-100 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-8 relative"
      >
        {/* Token expiry indicator */}
        {remainingTime !== null && remainingTime > 0 && (
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
            <div
              className={`text-xs px-3 py-1 rounded-full border flex items-center gap-2 ${
                remainingTime > 300
                  ? "bg-green-100 text-green-800 border-green-200"
                  : remainingTime > 60
                    ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                    : "bg-red-100 text-red-800 border-red-200"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full animate-pulse ${
                  remainingTime > 300
                    ? "bg-green-500"
                    : remainingTime > 60
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }`}
              ></div>
              <span>Token: {formatTime(remainingTime)}</span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center flex flex-col items-center">
          <div className="h-16 w-16 relative rounded-full overflow-hidden shadow-md">
            <Image
              src={appLogo}
              alt={appName}
              fill
              className="object-contain p-1"
              sizes="64px"
              priority
            />
          </div>
          <h2 className="mt-4 text-2xl font-extrabold text-gray-900">
            {appName}
          </h2>
          <p className="text-sm text-gray-600">
            Sign in to your Analyst Workspace
          </p>
        </div>

        {/* Form Login */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username"
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              disabled={isLoading}
            />
          </div>

          <div className="relative">
            <label className="text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 outline-none pr-10 transition-colors"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[34px] text-gray-500 hover:text-gray-700 transition-colors"
              disabled={isLoading}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>

          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-sm p-3 rounded-md ${
                message.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {message.text}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 text-white font-medium rounded-md bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Signing in...
              </span>
            ) : (
              "Login"
            )}
          </button>
        </form>

        <div className="text-center text-xs text-gray-500 pt-4 border-t">
          <p className="mt-1">{appName}</p>
        </div>
      </motion.div>
    </div>
  );
}
