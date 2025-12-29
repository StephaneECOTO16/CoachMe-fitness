"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import PublicRoute from "@/components/auth/PublicRoute";
import toast from "@/lib/toast";
import styles from "../login/page.module.css";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * Reset Password Page
 * Allows users to set a new password using a valid reset token.
 */
export default function ResetPasswordPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  // Check if token is present on mount
  useEffect(() => {
    if (!token) {
      toast.error(t("invalidResetLink"), t("requestNewLink"));
    }
  }, [token, t]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    if (!token) {
      toast.error(t("invalidResetLink"));
      return;
    }

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || "Failed to reset password");
      }

      toast.success(t("passwordResetSuccess"), t("redirectingToLogin"));
      // Redirect to login after 3 seconds
      setTimeout(() => router.push("/login"), 3000);
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "An error occurred");
    }
  };

  return (
    <PublicRoute>
      <div className={styles.container}>
        <div className={styles.formSection}>
          <Link href="/login" className={styles.backButton}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width={20} height={20}>
              <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
            </svg>
            <span>{t("backToLogin")}</span>
          </Link>

          <div className={styles.card}>
            <div className={styles.header}>
              <div className={styles.logo}>
                <Image src="/coachMe-logo.png" alt="CoachMe by Ecotosport" width={400} height={180} priority />
              </div>
              <h1 className={styles.title}>{t("resetPasswordTitle")}</h1>
              <p className={styles.subtitle}>{t("resetPasswordSubtitle")}</p>
            </div>

            {!token ? (
              <div className={styles.footer}>
                <p>
                  {t("invalidResetLink")} <Link href="/forgot-password">{t("requestNewLink")}</Link>
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
                <div className={styles.inputGroup}>
                  <Input type="password" label={t("newPassword")} placeholder="••••••••" error={errors.password?.message} {...register("password")} />
                  <Input type="password" label={t("confirmPassword")} placeholder="••••••••" error={errors.confirmPassword?.message} {...register("confirmPassword")} />
                </div>
                <Button type="submit" variant="primary" size="lg" fullWidth loading={isSubmitting} className={styles.submitButton}>
                  {isSubmitting ? t("resetting") : t("resetPassword")}
                </Button>
              </form>
            )}
          </div>
        </div>

        <div className={styles.imageSection}>
          <Image src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=1470&auto=format&fit=crop" alt="Sport Training" fill className={styles.heroImage} priority />
          <div className={styles.imageOverlay} />
        </div>
      </div>
    </PublicRoute>
  );
}

