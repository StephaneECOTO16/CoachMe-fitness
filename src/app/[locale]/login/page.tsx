'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import PublicRoute from '@/components/auth/PublicRoute';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { loginSchema, type LoginInput } from '@/lib/schemas';
import styles from './page.module.css';

export default function LoginPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const { login } = useAuth();
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setApiError('');
    setSuccess(false);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Login failed');
      }

      // Use auth context to login
      if (result.token) {
        login(result.token);
      }

      // Show success message briefly
      setSuccess(true);

      // Auth context will handle redirect based on user role
      setTimeout(() => {
        router.push('/dashboard');
      }, 500);
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
          <h1 className={styles.title}>{t('loginTitle')}</h1>
          <p className={styles.subtitle}>{t('loginSubtitle')}</p>
        </div>

        {apiError && (
          <div className={cn(styles.alert, styles.error)} role="alert">
            {apiError}
          </div>
        )}

        {success && (
          <div className={cn(styles.alert, styles.success)} role="alert">
            {t('loginSuccess')}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.inputGroup}>
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
          </div>

          <div className={styles.rememberForgot}>
            <div className={styles.rememberMe}>
              <input
                type="checkbox"
                id="rememberMe"
                {...register('rememberMe')}
              />
              <label htmlFor="rememberMe">{t('rememberMe')}</label>
            </div>
            <Link href="/forgot-password" className={styles.forgotPassword}>
              {t('forgotPassword')}
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
            {isSubmitting ? t('loggingIn') : t('loginButton')}
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
            {t('noAccount')}{' '}
            <Link href="/register">{t('signUpHere')}</Link>
          </p>
        </div>
      </div>
    </div>
    </PublicRoute>
  );
}
