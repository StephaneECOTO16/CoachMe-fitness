/**
 * Authentication context — provides user identity to all client components.
 *
 * Token storage: HttpOnly cookie only (set by the server on login).
 * The client never reads or stores the JWT — it calls /api/auth/me
 * and receives the user's public claims. This eliminates the XSS
 * token theft vector completely.
 *
 * The cookie is sent automatically on every same-origin request,
 * so API calls do not need to manually attach Authorization headers.
 */

"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useRouter } from "@/i18n/routing";
import { logger } from "@/lib/logger";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;         // UUID
  email: string;
  name: string | null;
  role: "PROSPECT" | "COACH" | "ADMIN";
  phone: string | null;
  avatar: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoggingOut: boolean;
  /** Call after login to sync user state without a page reload. */
  refreshUser: () => Promise<void>;
  /** Call to refresh user state after a successful login API call. */
  login: () => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (roles: AuthUser["role"][]) => boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();
  // Prevents double-fetch on React StrictMode double-invoke
  const hydrated = useRef(false);

  /**
   * Fetches the current user from /api/auth/me.
   * The browser sends the session cookie automatically — no manual token needed.
   */
  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch("/api/auth/me", {
        // Always send cookies, even from client components
        credentials: "include",
        // Prevent browser from caching this — always want fresh data
        headers: { "Cache-Control": "no-cache" },
      });

      // Only a real "not authenticated" answer logs the user out. A server
      // error (5xx) or a flaky mobile connection keeps the current state,
      // otherwise reopening the PWA on a weak network looks like a logout.
      if (res.status === 401 || res.status === 403) {
        setUser(null);
        return;
      }
      if (!res.ok) return;

      const data = await res.json();
      setUser(data.user ?? null);
    } catch {
      // Network error (offline, app resuming): keep the current user.
    }
  }, []);

  // Hydrate on mount — retry a few times if the network is not ready yet
  // (common when an installed PWA is cold-started from a notification).
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    const hydrate = async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await fetch("/api/auth/me", {
            credentials: "include",
            headers: { "Cache-Control": "no-cache" },
          });
          if (res.ok) {
            const data = await res.json();
            setUser(data.user ?? null);
            return;
          }
          if (res.status === 401 || res.status === 403) {
            setUser(null);
            return;
          }
        } catch {
          // offline / network not ready — retry below
        }
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    };

    hydrate().finally(() => setIsLoading(false));
  }, []);

  // Re-check (and slide) the session whenever the app comes back to the
  // foreground or the connection returns.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshUser();
    };
    const onOnline = () => void refreshUser();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [refreshUser]);

  const logout = useCallback(async (): Promise<void> => {
    setIsLoggingOut(true);
    try {
      // Server clears the HttpOnly cookie
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Ignore network errors — we clear client state regardless
    } finally {
      setUser(null);
      setIsLoggingOut(false);
      router.push("/");
    }
  }, [router]);

  const hasRole = useCallback(
    (roles: AuthUser["role"][]): boolean => {
      return user ? roles.includes(user.role) : false;
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        isLoggingOut,
        refreshUser,
        login: refreshUser, // login is an alias for refreshing after cookie is set
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
