"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { registerSchema, type RegisterInput } from "@/lib/schemas";
import { useAuth } from "@/contexts/AuthContext";
import PublicRoute from "@/components/auth/PublicRoute";
import toast from "@/lib/toast";
import styles from "./page.module.css";

interface Discipline {
  id: number;
  name: string;
  imageUrl?: string;
}

export default function RegisterPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const { login } = useAuth();
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [loadingDisciplines, setLoadingDisciplines] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      accountType: "PROSPECT",
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      termsAccepted: false,
      ageRange: "",
      heightCm: "",
      weightKg: "",
      goals: "",
      discipline: "",
      bio: "",
      portfolio: "",
    },
  });

  const accountType = watch("accountType");

  // Fetch disciplines on component mount
  useEffect(() => {
    const fetchDisciplines = async () => {
      try {
        const response = await fetch("/api/disciplines");
        const result = await response.json();
        if (result.success) {
          setDisciplines(result.disciplines);
        }
      } catch (error) {
        console.error("Error fetching disciplines:", error);
      } finally {
        setLoadingDisciplines(false);
      }
    };

    fetchDisciplines();
  }, []);

  const onSubmit = async (data: RegisterInput) => {
    try {
      // Prepare payload based on account type
      const payload: Record<string, unknown> = {
        accountType: data.accountType,
        name: data.name,
        email: data.email,
        password: data.password,
      };

      if (data.accountType === "PROSPECT") {
        if (data.ageRange) payload.ageRange = data.ageRange;
        if (data.heightCm) payload.heightCm = parseFloat(data.heightCm);
        if (data.weightKg) payload.weightKg = parseFloat(data.weightKg);
        if (data.goals) payload.goals = data.goals;
      } else if (data.accountType === "COACH") {
        payload.discipline = data.discipline;
        if (data.bio) payload.bio = data.bio;
        if (data.portfolio) payload.portfolio = data.portfolio;
      }

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || "Registration failed");
      }

      // Show success toast
      toast.success(
        t("registerSuccess"),
        data.accountType === "COACH"
          ? "Your coach account is pending approval"
          : "Logging you in..."
      );

      // Auto-login by fetching token
      const loginResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      const loginResult = await loginResponse.json();

      if (loginResult.token) {
        login(loginResult.token);

        // Redirect based on account type
        setTimeout(() => {
          if (data.accountType === "COACH") {
            router.push("/coach/dashboard");
          } else {
            router.push("/dashboard");
          }
        }, 500);
      } else {
        // If auto-login fails, redirect to login page
        toast.info("Please log in to continue");
        setTimeout(() => {
          router.push("/login");
        }, 1500);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      toast.error("Registration Failed", errorMessage);
    }
  };

  return (
    <PublicRoute>
      <div className={styles.container}>
        {/* Left Side - Form Section */}
        <div className={styles.formSection}>
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
              <h1 className={styles.title}>{t("registerTitle")}</h1>
              <p className={styles.subtitle}>{t("registerSubtitle")}</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
              {/* Account Type Selector */}
              <div className={styles.inputGroup}>
                <label className={styles.label}>{t("accountType")}</label>
                <div className={styles.accountTypeSelector}>
                  <label className={styles.radioOption}>
                    <input
                      type="radio"
                      value="PROSPECT"
                      {...register("accountType")}
                    />
                    <span>{t("lookingForCoach")}</span>
                  </label>
                  <label className={styles.radioOption}>
                    <input
                      type="radio"
                      value="COACH"
                      {...register("accountType")}
                    />
                    <span>{t("imACoach")}</span>
                  </label>
                </div>
                {errors.accountType && (
                  <span className={cn(styles.helperText, styles.errorText)}>
                    {errors.accountType.message}
                  </span>
                )}
              </div>

              {/* Common Fields */}
              <div className={styles.inputGroup}>
                <Input
                  type="text"
                  label={t("fullName")}
                  placeholder="John Doe"
                  error={errors.name?.message}
                  {...register("name")}
                />

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
                  helperText={
                    !errors.password ? t("passwordRequirement") : undefined
                  }
                  {...register("password")}
                />

                <Input
                  type="password"
                  label={t("confirmPassword")}
                  placeholder="••••••••"
                  error={errors.confirmPassword?.message}
                  {...register("confirmPassword")}
                />
              </div>

              {/* Conditional Fields - PROSPECT */}
              {accountType === "PROSPECT" && (
                <div className={styles.inputGroup}>
                  <h3 className={styles.sectionTitle}>{t("additionalInfo")}</h3>

                  <div className={styles.formRow}>
                    <div className={styles.formCol}>
                      <label className={styles.label}>{t("ageRange")}</label>
                      <select
                        className={styles.select}
                        {...register("ageRange")}
                      >
                        <option value="">{t("selectAgeRange")}</option>
                        <option value="18-25">18-25</option>
                        <option value="26-35">26-35</option>
                        <option value="36-45">36-45</option>
                        <option value="46-55">46-55</option>
                        <option value="56+">56+</option>
                      </select>
                    </div>

                    <div className={styles.formCol}>
                      <Input
                        type="number"
                        label={t("heightCm")}
                        placeholder="170"
                        error={errors.heightCm?.message}
                        {...register("heightCm")}
                      />
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formCol}>
                      <Input
                        type="number"
                        label={t("weightKg")}
                        placeholder="70"
                        error={errors.weightKg?.message}
                        {...register("weightKg")}
                      />
                    </div>

                    <div className={styles.formCol}>
                      <label className={styles.label}>
                        {t("sportGoals")}
                      </label>
                      <textarea
                        className={styles.textarea}
                        placeholder={t("sportGoalsPlaceholder")}
                        rows={2}
                        {...register("goals")}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional Fields - COACH */}
              {accountType === "COACH" && (
                <div className={styles.inputGroup}>
                  <h3 className={styles.sectionTitle}>
                    {t("coachInformation")}
                  </h3>

                  <div className={styles.formCol}>
                    <label className={styles.label}>
                      {t("disciplineRequired")}
                    </label>
                    <select
                      className={cn(
                        styles.select,
                        errors.discipline && styles.selectError
                      )}
                      {...register("discipline")}
                      disabled={loadingDisciplines}
                    >
                      <option value="">
                        {loadingDisciplines ? "Loading disciplines..." : t("selectDiscipline")}
                      </option>
                      {disciplines.map((discipline) => (
                        <option key={discipline.id} value={discipline.name}>
                          {discipline.name}
                        </option>
                      ))}
                    </select>
                    {errors.discipline && (
                      <span className={cn(styles.helperText, styles.errorText)}>
                        {errors.discipline.message}
                      </span>
                    )}
                  </div>

                  <div className={styles.formCol}>
                    <label className={styles.label}>{t("bioOptional")}</label>
                    <textarea
                      className={styles.textarea}
                      placeholder={t("bioCoachPlaceholder")}
                      rows={2}
                      {...register("bio")}
                    />
                  </div>

                  <Input
                    type="url"
                    label={t("portfolioOptional")}
                    placeholder="https://yourwebsite.com"
                    error={errors.portfolio?.message}
                    {...register("portfolio")}
                  />

                  <div className={cn(styles.alert, styles.info)}>
                    ℹ️ {t("coachPendingNotice")}
                  </div>
                </div>
              )}

              <div className={styles.rememberForgot}>
                <div className={styles.rememberMe}>
                  <input
                    type="checkbox"
                    id="termsAccepted"
                    {...register("termsAccepted")}
                  />
                  <label htmlFor="termsAccepted">
                    {t("acceptTerms")}{" "}
                    <Link href="/terms" className={styles.forgotPassword}>
                      {t("termsConditions")}
                    </Link>
                  </label>
                </div>
                {errors.termsAccepted && (
                  <span className={cn(styles.helperText, styles.errorText)}>
                    {errors.termsAccepted.message}
                  </span>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={isSubmitting}
                className={styles.submitButton}
              >
                {isSubmitting ? t("registering") : t("registerButton")}
              </Button>
            </form>

            <div className={styles.footer}>
              <p>
                {t("hasAccount")} <Link href="/login">{t("signInHere")}</Link>
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Image Section */}
        <div className={styles.imageSection}>
          <Image
            src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop"
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
