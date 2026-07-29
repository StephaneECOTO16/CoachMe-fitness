'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { BellRing, BellOff, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import {
  disablePushNotifications,
  enablePushNotifications,
  getExistingPushSubscription,
} from '@/lib/push-client';
import styles from './NotificationPreferences.module.css';

type Status = 'loading' | 'granted' | 'denied' | 'unsupported';

export default function NotificationPreferences() {
  const t = useTranslations('settings.sections.notifications');
  // Push is active by default: optimistic "on" while we confirm the real
  // browser/subscription state in the background.
  const [enabled, setEnabled] = useState(true);
  const [status, setStatus] = useState<Status>('loading');
  const [isBusy, setIsBusy] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkState() {
      if (!('serviceWorker' in navigator) || !('Notification' in window)) {
        if (!cancelled) setStatus('unsupported');
        return;
      }
      if (Notification.permission === 'denied') {
        if (!cancelled) {
          setStatus('denied');
          setEnabled(false);
        }
        return;
      }

      const subscription = await getExistingPushSubscription();
      if (cancelled) return;
      setStatus('granted');
      setEnabled(Boolean(subscription) || Notification.permission === 'default');
    }

    void checkState();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggle = async (next: boolean) => {
    setIsBusy(true);
    try {
      if (next) {
        const ok = await enablePushNotifications();
        if (ok) {
          setEnabled(true);
          setStatus('granted');
          toast.success(t('enabledToast'));
        } else {
          setEnabled(false);
          setStatus(Notification.permission === 'denied' ? 'denied' : 'granted');
          toast.error(t('blockedToast'));
        }
      } else {
        await disablePushNotifications();
        setEnabled(false);
        toast.success(t('disabledToast'));
      }
    } finally {
      setIsBusy(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const res = await fetch('/api/web-push/test', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        toast.success('Notification envoyée — regarde ton appareil.');
        return;
      }

      // Surface the exact server-side reason instead of a generic failure,
      // so the user (or support) can actually act on it.
      const detail =
        data.error?.message ||
        data.results?.find((r: { status: string }) => r.status === 'error')?.message ||
        'Échec inconnu';
      toast.error(`Échec du test push : ${detail}`);
    } catch {
      toast.error('Impossible de contacter le serveur pour le test.');
    } finally {
      setIsTesting(false);
    }
  };

  if (status === 'unsupported') return null;

  return (
    <div className={styles.card}>
      <div className={styles.row}>
        <div className={styles.iconWrap} data-active={enabled}>
          {enabled ? <BellRing size={18} /> : <BellOff size={18} />}
        </div>
        <div className={styles.copy}>
          <h3>{t('push.label')}</h3>
          <p>{t('push.description')}</p>
          {status === 'denied' && (
            <p className={styles.warning}>
              <ShieldAlert size={14} />
              {t('push.blockedByBrowser')}
            </p>
          )}
        </div>
        <Switch
          checked={enabled}
          disabled={isBusy || status === 'loading' || status === 'denied'}
          onCheckedChange={handleToggle}
          aria-label={t('push.label')}
        />
      </div>
      {enabled && status === 'granted' && (
        <button
          type="button"
          className={styles.testButton}
          onClick={handleTest}
          disabled={isTesting}
        >
          {isTesting ? 'Envoi…' : 'Tester la notification push'}
        </button>
      )}
    </div>
  );
}
