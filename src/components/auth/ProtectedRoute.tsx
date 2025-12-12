"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("PROSPECT" | "COACH" | "ADMIN")[];
  redirectTo?: string;
}

export default function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo = "/login",
}: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading, isLoggingOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isLoggingOut) {
      // Not authenticated - redirect to login (but not if logging out)
      if (!isAuthenticated) {
        router.push(redirectTo);
        return;
      }

      // Authenticated but doesn't have required role
      if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        // Redirect based on user's actual role
        if (user.role === "ADMIN") {
          router.push("/admin/dashboard");
        } else if (user.role === "COACH") {
          router.push("/coach/dashboard");
        } else {
          router.push("/dashboard");
        }
      }
    }
  }, [
    isAuthenticated,
    user,
    isLoading,
    isLoggingOut,
    allowedRoles,
    router,
    redirectTo,
  ]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <div>Loading...</div>
      </div>
    );
  }

  // Don't render children if not authenticated or doesn't have required role
  if (!isAuthenticated) {
    return null;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
