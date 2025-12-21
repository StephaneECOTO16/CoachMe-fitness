'use client';

import { usePathname } from '@/i18n/routing';
import Header from './Header';
import Footer from './Footer';

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Hide header/footer on auth pages and chat pages
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password';
  const isChatPage = pathname.startsWith('/messages/') || pathname.startsWith('/admin/messages');

  if (isAuthPage || isChatPage) {
    return <>{children}</>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <main style={{ flex: 1 }}>{children}</main>
      <Footer />
    </div>
  );
}
