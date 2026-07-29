'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { BellRing, X } from 'lucide-react';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { enablePushNotifications } from '@/lib/push-client';
import styles from './PushPermissionBanner.module.css';

const DISMISS_KEY = 'push-banner-dismissed-until';
const DISMISS_DAYS = 7;

/**
 * Prompts every logged-in user (any role) to enable push once, right after
 * login, instead of requiring a manual trip to Settings. Only ever shown
 * while Notification.permission is 'default' — the click on "Enable" is
 * the user gesture the browser requires, so this doesn't hit the
 * auto-prompt throttling that PWASetup avoids (see push-client.ts).
 */
export default function PushPermissionBanner() {
  const t = useTranslations('settings.sections.notifications.banner');
  const { isAuthenticated, isLoading } = useAuth();
  const [visible, setVisible] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (Notification.permission !== 'default') return;

    const dismissedUntil = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (Date.now() < dismissedUntil) return;

    setVisible(true);
  }, [isLoading, isAuthenticated]);

  const dismiss = (days: number) => {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + days * 24 * 60 * 60 * 1000));
    setVisible(false);
  };

  const handleEnable = async () => {
    setIsBusy(true);
    try {
      const ok = await enablePushNotifications();
      if (ok) {
        toast.success(t('enabledToast'));
        setVisible(false);
      } else {
        // Denied (or unsupported) — the browser won't prompt again either
        // way, so don't keep nagging.
        dismiss(365);
      }
    } finally {
      setIsBusy(false);
    }
  };

  if (!visible) return null;

  return (
    <div className={styles.banner} role="status">
      <div className={styles.iconWrap}>
        <BellRing size={18} />
      </div>
      <div className={styles.copy}>
        <strong>{t('title')}</strong>
        <p>{t('description')}</p>
      </div>
      <div className={styles.actions}>
        <Button size="sm" onClick={handleEnable} loading={isBusy}>
          {t('enableButton')}
        </Button>
        <button
          type="button"
          className={styles.dismissButton}
          onClick={() => dismiss(DISMISS_DAYS)}
          aria-label={t('laterButton')}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
