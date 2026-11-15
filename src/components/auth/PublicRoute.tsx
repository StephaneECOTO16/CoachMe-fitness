'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useAuth } from '@/contexts/AuthContext';
import LoadingIndicator from '@/components/loading/LoadingIndicator';

interface PublicRouteProps {
  children: React.ReactNode;
}

/**
 * PublicRoute component for login/register pages
 * Redirects authenticated users to their appropriate dashboard
 */
export default function PublicRoute({ children }: PublicRouteProps) {
  const tCommon = useTranslations('common');
  const { isAuthenticated, user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      // Redirect based on user role
      if (user.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else if (user.role === 'COACH') {
        router.push('/coach/dashboard');
      } else {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, user, isLoading, router]);

  // Render the page immediately while the session check runs: almost every
  // visitor of login/register is anonymous, and blocking on /api/auth/me
  // showed a full-screen "Loading..." (slow on mobile data, e.g. ad traffic).
  // Signed-in users are redirected by the effect above once the check ends.
  if (!isLoading && isAuthenticated) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        <LoadingIndicator label={tCommon('loading')} />
      </div>
    );
  }

  return <>{children}</>;
}
