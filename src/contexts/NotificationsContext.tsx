'use client';

/**
 * NotificationsContext.tsx
 * Single source of truth for the current user's notification feed.
 * Both the header bell (unread count badge) and the /notifications page
 * read from and mutate this same state, so marking something read in
 * one place is reflected everywhere instantly — no page reload needed.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import { usePusher, type AppNotification } from './PusherContext';

export type Notification = {
  id: number;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
};

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
  markAsRead: (ids: number[]) => Promise<void>;
  markAsUnread: (ids: number[]) => Promise<void>;
  remove: (ids: number[]) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const { subscribeToNotifications } = usePusher();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (data.notifications) setNotifications(data.notifications);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Real-time: a new notification lands instantly on every screen — the
  // bell badge and the notifications list both update from this one feed.
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    const unsubscribe = subscribeToNotifications(user.id, (incoming: AppNotification) => {
      setNotifications((current) => {
        if (current.some((n) => n.id === incoming.id)) return current;
        return [
          {
            id: incoming.id,
            title: incoming.title,
            body: incoming.body,
            type: incoming.type,
            isRead: incoming.isRead,
            createdAt: incoming.createdAt,
          },
          ...current,
        ];
      });
    });
    return unsubscribe;
  }, [isAuthenticated, user?.id, subscribeToNotifications]);

  const markAsRead = useCallback(async (ids: number[]) => {
    if (!ids.length) return;
    setNotifications((current) =>
      current.map((n) => (ids.includes(n.id) ? { ...n, isRead: true } : n)),
    );
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationIds: ids, isRead: true }),
    });
  }, []);

  const markAsUnread = useCallback(async (ids: number[]) => {
    if (!ids.length) return;
    setNotifications((current) =>
      current.map((n) => (ids.includes(n.id) ? { ...n, isRead: false } : n)),
    );
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationIds: ids, isRead: false }),
    });
  }, []);

  const remove = useCallback(async (ids: number[]) => {
    if (!ids.length) return;
    setNotifications((current) => current.filter((n) => !ids.includes(n.id)));
    await fetch(`/api/notifications?ids=${ids.join(',')}`, { method: 'DELETE' });
  }, []);

  const value: NotificationsContextType = {
    notifications,
    unreadCount,
    isLoading,
    refresh,
    markAsRead,
    markAsUnread,
    remove,
  };

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
