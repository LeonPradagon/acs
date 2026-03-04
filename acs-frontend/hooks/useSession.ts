import { useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const TOKEN_CHECK_COOLDOWN = 60000; // 60 seconds
const MAX_TOKEN_CHECKS_PER_MINUTE = 3;

/**
 * Hook to manage user session and authentication tokens
 */
export const useSession = () => {
  const router = useRouter();
  const lastTokenCheckRef = useRef<number>(0);
  const tokenCheckCountRef = useRef<number>(0);
  const tokenCheckResetTimeoutRef = useRef<NodeJS.Timeout>();

  const redirectToLogin = useCallback(() => {
    console.log("🔄 Redirecting to login page...");
    router.push("/login");
  }, [router]);

  const clearTokensAndRedirect = useCallback(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    redirectToLogin();
  }, [redirectToLogin]);

  const performTokenValidation = useCallback((): boolean => {
    try {
      const token = localStorage.getItem("accessToken");

      if (!token) {
        console.log("❌ Token not found, redirecting to login");
        redirectToLogin();
        return false;
      }

      if (!token.startsWith("eyJ") || token.length < 50) {
        console.log("❌ Invalid token format, redirecting to login");
        clearTokensAndRedirect();
        return false;
      }

      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const expiry = payload.exp * 1000;
        if (Date.now() > expiry) {
          console.log("❌ Token expired, redirecting to login");
          clearTokensAndRedirect();
          return false;
        }
      } catch (e) {
        console.log("⚠️ Could not check token expiry, continuing");
      }

      console.log("✅ Token valid");
      return true;
    } catch (error) {
      console.error("❌ Error checking token:", error);
      clearTokensAndRedirect();
      return false;
    }
  }, [redirectToLogin, clearTokensAndRedirect]);

  const checkTokenWithCooldown = useCallback((): boolean => {
    const now = Date.now();
    const timeSinceLastCheck = now - lastTokenCheckRef.current;

    if (!tokenCheckResetTimeoutRef.current) {
      tokenCheckResetTimeoutRef.current = setTimeout(() => {
        tokenCheckCountRef.current = 0;
        tokenCheckResetTimeoutRef.current = undefined;
      }, 60000);
    }

    if (tokenCheckCountRef.current >= MAX_TOKEN_CHECKS_PER_MINUTE) {
      return true;
    }

    if (timeSinceLastCheck < TOKEN_CHECK_COOLDOWN) {
      return true;
    }

    lastTokenCheckRef.current = now;
    tokenCheckCountRef.current++;

    return performTokenValidation();
  }, [performTokenValidation]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");

    if (tokenCheckResetTimeoutRef.current) {
      clearTimeout(tokenCheckResetTimeoutRef.current);
    }

    console.log("Logout successful");
    router.push("/login");
  }, [router]);

  useEffect(() => {
    checkTokenWithCooldown();

    const handleFocus = () => {
      checkTokenWithCooldown();
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
      if (tokenCheckResetTimeoutRef.current) {
        clearTimeout(tokenCheckResetTimeoutRef.current);
      }
    };
  }, [checkTokenWithCooldown]);

  return {
    handleLogout,
    checkTokenWithCooldown,
  };
};
