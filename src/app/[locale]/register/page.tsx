'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { registerSchema, type RegisterInput, DISCIPLINES } from '@/lib/schemas';
import { useAuth } from '@/contexts/AuthContext';
import PublicRoute from '@/components/auth/PublicRoute';
import styles from '../login/page.module.css';

export default function RegisterPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const { login } = useAuth();
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      accountType: 'PROSPECT',
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      termsAccepted: false,
      // Prospect fields
      ageRange: '',
      heightCm: '',
      weightKg: '',
      goals: '',
      // Coach fields
      discipline: '',
      bio: '',
      portfolio: '',
    },
  });

  const accountType = watch('accountType');

  const onSubmit = async (data: RegisterInput) => {
    setApiError('');
    setSuccess(false);

    try {
      // Prepare payload based on account type
      const payload: Record<string, unknown> = {
        accountType: data.accountType,
        name: data.name,
        email: data.email,
        password: data.password,
      };

      if (data.accountType === 'PROSPECT') {
        if (data.ageRange) payload.ageRange = data.ageRange;
        if (data.heightCm) payload.heightCm = parseFloat(data.heightCm);
        if (data.weightKg) payload.weightKg = parseFloat(data.weightKg);
        if (data.goals) payload.goals = data.goals;
      } else if (data.accountType === 'COACH') {
        payload.discipline = data.discipline;
        if (data.bio) payload.bio = data.bio;
        if (data.portfolio) payload.portfolio = data.portfolio;
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Registration failed');
      }

      // Show success message briefly
      setSuccess(true);

      // Auto-login by fetching token
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
          if (data.accountType === 'COACH') {
            router.push('/coach/dashboard');
          } else {
            router.push('/dashboard');
          }
        }, 500);
      } else {
        // If auto-login fails, redirect to login page
        setTimeout(() => {
          router.push('/login');
        }, 1500);
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <PublicRoute>
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.header}>
            <div className={styles.logo}>
              <Image
                src="/logo.jpeg"
                alt="CoachMe by Ecotofitness"
                width={240}
                height={53}
                priority
              />
            </div>
            <h1 className={styles.title}>{t('registerTitle')}</h1>
            <p className={styles.subtitle}>{t('registerSubtitle')}</p>
          </div>

          {apiError && (
            <div className={cn(styles.alert, styles.error)} role="alert">
              {apiError}
            </div>
          )}

          {success && (
            <div className={cn(styles.alert, styles.success)} role="alert">
              {t('registerSuccess')}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
            {/* Account Type Selector */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>Account Type</label>
              <div className={styles.accountTypeSelector}>
                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    value="PROSPECT"
                    {...register('accountType')}
                  />
                  <span>I'm looking for a coach</span>
                </label>
                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    value="COACH"
                    {...register('accountType')}
                  />
                  <span>I'm a fitness coach</span>
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
                label={t('fullName')}
                placeholder="John Doe"
                error={errors.name?.message}
                {...register('name')}
                leftIcon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
                  </svg>
                }
              />

              <Input
                type="email"
                label={t('email')}
                placeholder="name@example.com"
                error={errors.email?.message}
                {...register('email')}
                leftIcon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" />
                    <path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
                  </svg>
                }
              />

              <Input
                type="password"
                label={t('password')}
                placeholder="••••••••"
                error={errors.password?.message}
                helperText={!errors.password ? 'Must contain uppercase, lowercase, and number' : undefined}
                {...register('password')}
                leftIcon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
                      clipRule="evenodd"
                    />
                  </svg>
                }
              />

              <Input
                type="password"
                label={t('confirmPassword')}
                placeholder="••••••••"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
                leftIcon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
                      clipRule="evenodd"
                    />
                  </svg>
                }
              />
            </div>

            {/* Conditional Fields - PROSPECT */}
            {accountType === 'PROSPECT' && (
              <div className={styles.inputGroup}>
                <h3 className={styles.sectionTitle}>Additional Information (Optional)</h3>

                <div className={styles.formRow}>
                  <div className={styles.formCol}>
                    <label className={styles.label}>Age Range</label>
                    <select className={styles.select} {...register('ageRange')}>
                      <option value="">Select age range</option>
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
                      label="Height (cm)"
                      placeholder="170"
                      error={errors.heightCm?.message}
                      {...register('heightCm')}
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formCol}>
                    <Input
                      type="number"
                      label="Weight (kg)"
                      placeholder="70"
                      error={errors.weightKg?.message}
                      {...register('weightKg')}
                    />
                  </div>

                  <div className={styles.formCol}>
                    <label className={styles.label}>Fitness Goals</label>
                    <textarea
                      className={styles.textarea}
                      placeholder="e.g., Weight loss, muscle gain, general fitness..."
                      rows={3}
                      {...register('goals')}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Conditional Fields - COACH */}
            {accountType === 'COACH' && (
              <div className={styles.inputGroup}>
                <h3 className={styles.sectionTitle}>Coach Information</h3>

                <div className={styles.formCol}>
                  <label className={styles.label}>Discipline *</label>
                  <select
                    className={cn(styles.select, errors.discipline && styles.selectError)}
                    {...register('discipline')}
                  >
                    <option value="">Select your discipline</option>
                    {DISCIPLINES.map((discipline) => (
                      <option key={discipline} value={discipline}>
                        {discipline}
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
                  <label className={styles.label}>Bio (Optional)</label>
                  <textarea
                    className={styles.textarea}
                    placeholder="Tell us about your coaching experience and philosophy..."
                    rows={4}
                    {...register('bio')}
                  />
                </div>

                <Input
                  type="url"
                  label="Portfolio/Website (Optional)"
                  placeholder="https://yourwebsite.com"
                  error={errors.portfolio?.message}
                  {...register('portfolio')}
                />

                <div className={cn(styles.alert, styles.info)}>
                  ℹ️ Your coach account will be pending approval. You'll be able to access your dashboard, but clients won't see your profile until an admin approves your application.
                </div>
              </div>
            )}

          <div className={styles.rememberForgot}>
            <div className={styles.rememberMe}>
              <input
                type="checkbox"
                id="termsAccepted"
                {...register('termsAccepted')}
              />
              <label htmlFor="termsAccepted">
                {t('acceptTerms')}{' '}
                <Link href="/terms" className={styles.forgotPassword}>
                  {t('termsConditions')}
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
            {isSubmitting ? t('registering') : t('registerButton')}
          </Button>
        </form>

        {/* Social Auth - Commented out for MVP */}
        {/* <div className={styles.divider}>
          <span>{t('or')}</span>
        </div>

        <div className={styles.socialButtons}>
          <button className={styles.socialButton} type="button">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <button className={styles.socialButton} type="button">
            <svg viewBox="0 0 24 24" fill="#1877F2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Continue with Facebook
          </button>
        </div> */}

        <div className={styles.footer}>
          <p>
            {t('hasAccount')}{' '}
            <Link href="/login">{t('signInHere')}</Link>
          </p>
        </div>
      </div>
    </div>
    </PublicRoute>
  );
}
