"use client";

import { useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import PublicRoute from "@/components/auth/PublicRoute";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { loginSchema, type LoginInput } from "@/lib/schemas";
import styles from "./page.module.css";

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const { login } = useAuth();
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setApiError("");
    setSuccess(false);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || "Login failed");
      }

      // Use auth context to login
      if (result.token) {
        login(result.token);
      }

      // Show success message briefly
      setSuccess(true);

      // Auth context will handle redirect based on user role
      setTimeout(() => {
        router.push("/dashboard");
      }, 500);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "An error occurred");
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
                  alt="CoachMe by Ecotofitness"
                  width={400}
                  height={180}
                  priority
                />
              </div>
              <h1 className={styles.title}>{t("loginTitle")}</h1>
              <p className={styles.subtitle}>{t("loginSubtitle")}</p>
            </div>

            {apiError && (
              <div className={cn(styles.alert, styles.error)} role="alert">
                {apiError}
              </div>
            )}

            {success && (
              <div className={cn(styles.alert, styles.success)} role="alert">
                {t("loginSuccess")}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
              <div className={styles.inputGroup}>
                <Input
                  type="email"
                  label={t("email")}
                  placeholder="name@example.com"
                  error={errors.email?.message}
                  {...register("email")}
                />

                <Input
                  type="password"
                  label={t("password")}
                  placeholder="••••••••"
                  error={errors.password?.message}
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
            alt="Fitness Training"
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
