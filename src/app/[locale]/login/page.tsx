"use client";

import Image from "next/image";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import PublicRoute from "@/components/auth/PublicRoute";
import { useAuth } from "@/contexts/AuthContext";
import { loginSchema, type LoginInput } from "@/lib/schemas";
import toast from "@/lib/toast";
import styles from "./page.module.css";

export default function LoginPage() {
  const t = useTranslations("auth");
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: data.identifier,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || "Login failed");
      }

      // Sync user state from the HttpOnly cookie set by the server
      await login();

      toast.success(t("loginSuccess"), "Redirecting...");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      toast.error("Login Failed", errorMessage);
    }
  };

  return (
    <PublicRoute>
      <div className={styles.container}>
        {/* Left Side - Form Section */}
        <div className={styles.formSection}>
          {/* Back Button */}
          <Link href="/" className={styles.backButton}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              width={20}
              height={20}
            >
              <path
                fillRule="evenodd"
                d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
                clipRule="evenodd"
              />
            </svg>
            <span>{t("back")}</span>
          </Link>

          <div className={styles.card}>
            <div className={styles.header}>
              <div className={styles.logo}>
                <Image
                  src="/coachMe-logo.png"
                  alt="CoachMe by Ecotosport"
                  width={400}
                  height={180}
                  priority
                />
              </div>
              <h1 className={styles.title}>{t("loginTitle")}</h1>
              <p className={styles.subtitle}>{t("loginSubtitle")}</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
              <div className={styles.inputGroup}>
                <Input
                  type="text"
                  label={t("emailOrPhone")}
                  placeholder="name@example.com or +237659037423"
                  error={errors.identifier?.message}
                  {...register("identifier")}
                />

                <Input
                  type={showPassword ? "text" : "password"}
                  label={t("password")}
                  placeholder="••••••••"
                  error={errors.password?.message}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      style={{
                        background: "transparent",
                        border: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 0,
                        cursor: "pointer",
                      }}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  }
                  {...register("password")}
                />
              </div>

              <div className={styles.rememberForgot}>
                <div className={styles.rememberMe}>
                  <input
                    type="checkbox"
                    id="rememberMe"
                    {...register("rememberMe")}
                  />
                  <label htmlFor="rememberMe">{t("rememberMe")}</label>
                </div>
                <Link href="/forgot-password" className={styles.forgotPassword}>
                  {t("forgotPassword")}
                </Link>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={isSubmitting}
                className={styles.submitButton}
              >
                {isSubmitting ? t("loggingIn") : t("loginButton")}
              </Button>
            </form>

            <div className={styles.footer}>
              <p>
                {t("noAccount")} <Link href="/register">{t("signUpHere")}</Link>
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Image Section */}
        <div className={styles.imageSection}>
          <Image
            src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=1470&auto=format&fit=crop"
            alt="Sport Training"
            fill
            className={styles.heroImage}
            priority
          />
          <div className={styles.imageOverlay} />
        </div>
      </div>
    </PublicRoute>
  );
}
