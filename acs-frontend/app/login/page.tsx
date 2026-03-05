"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  Eye,
  EyeOff,
  User,
  Lock,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
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
    // Check if user already has an active session
    const checkSession = async () => {
      const token = localStorage.getItem("accessToken");
      if (token) {
        const tokenInfo = await verifyToken();
        if (tokenInfo && tokenInfo.remainingTime > 0) {
          setupAutoRefresh();
          setRemainingTime(tokenInfo.remainingTime);
        }
      }
    };

    checkSession();

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
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Background Elements - Light Theme Aligned */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse"></div>
      <div
        className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse"
        style={{ animationDelay: "2s" }}
      ></div>
      <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-primary/5 rounded-full blur-[80px]"></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-md w-full relative z-10"
      >
        <div className="bg-card/70 backdrop-blur-xl border border-border rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] p-7 space-y-6 overflow-hidden relative">
          {/* Subtle overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none"></div>

          {/* Token expiry indicator */}
          <AnimatePresence>
            {remainingTime !== null && remainingTime > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-4 right-4"
              >
                <div
                  className={`text-[10px] uppercase tracking-wider font-bold px-3 py-1 rounded-full border backdrop-blur-md flex items-center gap-2 ${
                    remainingTime > 300
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : remainingTime > 60
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  <RefreshCw
                    className={`w-3 h-3 ${remainingTime < 60 ? "animate-spin" : ""}`}
                  />
                  <span>{formatTime(remainingTime)}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Header */}
          <div className="text-center flex flex-col items-center">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="h-16 w-16 relative rounded-2xl overflow-hidden bg-white border border-border p-2.5 shadow-sm group"
            >
              <Image
                src={appLogo}
                alt={appName}
                fill
                className="object-contain p-2 group-hover:brightness-110 transition-all"
                sizes="64px"
                priority
              />
            </motion.div>
            <h2 className="mt-4 text-2xl font-black text-foreground tracking-tight">
              {appName.split(" ")[0]}{" "}
              <span className="text-primary">
                {appName.split(" ").slice(1).join(" ")}
              </span>
            </h2>
            <p className="mt-1 text-xs text-muted-foreground font-medium">
              Analyst Central Access
            </p>
          </div>

          {/* Form Login */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
                Username / Email
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-muted/30 border border-border text-foreground placeholder:text-muted-foreground/50 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white outline-none transition-all"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Password
                </label>
                <button
                  type="button"
                  className="text-[10px] font-bold text-primary hover:text-primary/80 uppercase tracking-wider transition-colors"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-muted/30 border border-border text-foreground placeholder:text-muted-foreground/50 rounded-xl py-2.5 pl-10 pr-10 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white outline-none transition-all"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 inset-y-0 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {message && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  className={`text-sm font-semibold p-4 rounded-2xl flex items-center gap-3 border ${
                    message.type === "success"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                  <span>{message.text}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full overflow-hidden rounded-xl py-3.5 bg-primary text-primary-foreground font-bold text-xs tracking-wide transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 shadow-[0_10px_20px_rgba(0,0,0,0.1)] hover:shadow-primary/20"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4 text-black"
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
                  Processing...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Sign In
                  <ArrowRight
                    size={18}
                    className="translate-x-0 group-hover:translate-x-1 transition-transform"
                  />
                </span>
              )}
            </button>
          </form>

          <footer className="pt-4 border-t border-border flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-4 text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
              <span className="hover:text-primary cursor-pointer transition-colors">
                Privacy Policy
              </span>
              <span className="w-1 h-1 bg-border rounded-full"></span>
              <span className="hover:text-primary cursor-pointer transition-colors">
                Support
              </span>
            </div>
            <p className="text-[9px] text-muted-foreground tracking-tight font-medium mt-1">
              © {new Date().getFullYear()} ASISGO CORE • PRE-ALPHA SE
            </p>
          </footer>
        </div>

        {/* Sub-footer extra text */}
        <div className="mt-5 text-center">
          <p className="text-muted-foreground text-[10px] font-medium">
            Protected by advanced sovereign encryption systems.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
