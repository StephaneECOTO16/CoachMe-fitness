'use client';

import NotificationCenter from '@/components/notifications/NotificationCenter';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function NotificationsPage() {
  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-slate-50 px-4 pb-14 pt-28 sm:px-6">
        <div className="mx-auto w-full max-w-5xl">
          <NotificationCenter />
        </div>
      </main>
    </ProtectedRoute>
  );
}
