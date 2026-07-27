'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  CheckCheck,
  Circle,
  Clock3,
  Inbox,
  LoaderCircle,
  Mail,
  MessageCircle,
  Radio,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useLocale } from 'next-intl';
import { usePusher } from '@/contexts/PusherContext';
import { useNotifications } from '@/contexts/NotificationsContext';

type FilterKey = 'ALL' | 'UNREAD';

const TYPE_STYLES: Record<string, { icon: React.ElementType; className: string }> = {
  CHAT: { icon: MessageCircle, className: 'bg-sky-600' },
  ACCOUNT_REVIEW: { icon: ShieldCheck, className: 'bg-amber-600' },
  MATCH: { icon: Sparkles, className: 'bg-fuchsia-600' },
  SYSTEM: { icon: Bell, className: 'bg-[#2eafa1]' },
};

function getTypeStyle(type: string) {
  return TYPE_STYLES[type] ?? TYPE_STYLES.SYSTEM;
}

export default function NotificationCenter() {
  const { isConnected } = usePusher();
  const { notifications, unreadCount, isLoading, markAsRead, markAsUnread, remove } = useNotifications();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isUpdating, setIsUpdating] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('ALL');
  // Clock starts unset and is only populated client-side, after mount.
  // Seeding it with `new Date()` during render would bake a timestamp into
  // the server-rendered HTML that never matches the client's first render,
  // causing a hydration mismatch (React discards the tree and re-renders,
  // which is what produced the broken/collapsed layout).
  const [now, setNow] = useState<Date | null>(null);
  const [freshIds, setFreshIds] = useState<Set<number>>(new Set());
  const knownIdsRef = useRef<Set<number> | null>(null);
  const locale = useLocale();
  const isFrench = locale === 'fr';
  const selectedCount = selectedIds.size;

  const copy = isFrench
    ? {
        title: 'Notifications',
        subtitle: 'Restez informé de chaque étape importante de votre parcours.',
        unread: 'non lue',
        unreadPlural: 'non lues',
        allCaughtUp: 'Tout est à jour',
        live: 'En direct',
        offline: 'Hors ligne',
        filterAll: 'Toutes',
        filterUnread: 'Non lues',
        selectAll: 'Tout sélectionner',
        selected: 'sélectionnée',
        selectedPlural: 'sélectionnées',
        markRead: 'Marquer comme lues',
        markUnread: 'Marquer comme non lues',
        delete: 'Supprimer',
        emptyTitle: 'Aucune notification pour le moment',
        emptyTextAll: 'Les nouveautés importantes de CoachMe apparaîtront ici, en temps réel.',
        emptyTextUnread: 'Vous avez lu toutes vos notifications.',
        loading: 'Chargement de vos notifications…',
        newBadge: 'Nouveau',
      }
    : {
        title: 'Notifications',
        subtitle: 'Stay informed about every important step in your journey.',
        unread: 'unread',
        unreadPlural: 'unread',
        allCaughtUp: 'You are all caught up',
        live: 'Live',
        offline: 'Offline',
        filterAll: 'All',
        filterUnread: 'Unread',
        selectAll: 'Select all',
        selected: 'selected',
        selectedPlural: 'selected',
        markRead: 'Mark as read',
        markUnread: 'Mark as unread',
        delete: 'Delete',
        emptyTitle: 'No notifications yet',
        emptyTextAll: 'Important CoachMe updates will appear here, in real time.',
        emptyTextUnread: 'You have read all your notifications.',
        loading: 'Loading your notifications…',
        newBadge: 'New',
      };

  // Live clock — ticks every second, client-side only (see comment above).
  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Flag anything that showed up after the initial load (real-time arrival
  // via NotificationsContext's Pusher subscription) with a "Nouveau" badge
  // for a few seconds, without this component owning the subscription itself.
  useEffect(() => {
    const currentIds = new Set(notifications.map((n) => n.id));
    if (knownIdsRef.current === null) {
      knownIdsRef.current = currentIds;
      return;
    }
    const newlyArrived = notifications.filter((n) => !knownIdsRef.current!.has(n.id));
    knownIdsRef.current = currentIds;
    if (newlyArrived.length === 0) return;

    setFreshIds((current) => {
      const next = new Set(current);
      newlyArrived.forEach((n) => next.add(n.id));
      return next;
    });
    newlyArrived.forEach((n) => {
      setTimeout(() => {
        setFreshIds((current) => {
          const next = new Set(current);
          next.delete(n.id);
          return next;
        });
      }, 6000);
    });
  }, [notifications]);

  const handleOpen = (notification: { id: number; isRead: boolean }) => {
    if (!notification.isRead) void markAsRead([notification.id]);
  };

  const visibleNotifications = useMemo(
    () => (filter === 'UNREAD' ? notifications.filter((n) => !n.isRead) : notifications),
    [notifications, filter],
  );

  const handleToggleSelect = (id: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds((current) =>
      current.size === visibleNotifications.length
        ? new Set()
        : new Set(visibleNotifications.map(({ id }) => id)),
    );
  };

  const handleMarkAs = async (isRead: boolean) => {
    if (!selectedCount) return;
    setIsUpdating(true);
    try {
      const ids = Array.from(selectedIds);
      await (isRead ? markAsRead(ids) : markAsUnread(ids));
      setSelectedIds(new Set());
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCount) return;
    setIsUpdating(true);
    try {
      await remove(Array.from(selectedIds));
      setSelectedIds(new Set());
    } finally {
      setIsUpdating(false);
    }
  };

  // Full precision — hour, minute AND second, as requested — so a coach or
  // client can see exactly when a notification landed, down to the second.
  const formatDate = (dateString: string) =>
    new Intl.DateTimeFormat(isFrench ? 'fr-FR' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(dateString));

  const formatClock = (date: Date) =>
    new Intl.DateTimeFormat(isFrench ? 'fr-FR' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);

  const formatClockDate = (date: Date) =>
    new Intl.DateTimeFormat(isFrench ? 'fr-FR' : 'en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(date);

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_-40px_rgba(15,23,42,0.35)]">
      {/* ── Topbar — light, brand-teal accent, professional ─────────────── */}
      <header className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-white via-slate-50 to-teal-50/60 px-5 py-7 sm:px-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#2eafa1]/10 blur-3xl" />

        <div className="relative flex flex-col gap-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#2eafa1] text-white shadow-lg shadow-[#2eafa1]/25">
                <Bell size={22} aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{copy.title}</h1>
                <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">{copy.subtitle}</p>
              </div>
            </div>

            {/* Live clock — real hour:minute:second, ticking (client-only) */}
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
              <div className="text-right">
                <div className="font-mono text-lg font-semibold tabular-nums text-slate-900">
                  {now ? formatClock(now) : '--:--:--'}
                </div>
                <div className="text-[11px] capitalize text-slate-400">{now ? formatClockDate(now) : ''}</div>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div
                className={`flex items-center gap-1.5 text-xs font-semibold ${isConnected ? 'text-emerald-600' : 'text-slate-400'}`}
                title={isConnected ? copy.live : copy.offline}
              >
                {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
                {isConnected ? copy.live : copy.offline}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm">
              <span className={`h-2 w-2 rounded-full ${unreadCount ? 'bg-[#2eafa1] animate-pulse' : 'bg-emerald-500'}`} />
              {unreadCount
                ? `${unreadCount} ${unreadCount > 1 ? copy.unreadPlural : copy.unread}`
                : copy.allCaughtUp}
            </div>

            <div className="ml-auto inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setFilter('ALL')}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${filter === 'ALL' ? 'bg-[#2eafa1] text-white' : 'text-slate-500 hover:text-slate-900'}`}
              >
                {copy.filterAll}
              </button>
              <button
                type="button"
                onClick={() => setFilter('UNREAD')}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${filter === 'UNREAD' ? 'bg-[#2eafa1] text-white' : 'text-slate-500 hover:text-slate-900'}`}
              >
                {copy.filterUnread} {unreadCount > 0 && `(${unreadCount})`}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Bulk actions toolbar ───────────────────────────────────────── */}
      <div className="border-b border-slate-100 px-5 py-3.5 sm:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex w-fit cursor-pointer items-center gap-3 text-sm font-medium text-slate-600">
            <input
              type="checkbox"
              checked={visibleNotifications.length > 0 && selectedCount === visibleNotifications.length}
              onChange={handleSelectAll}
              className="h-4 w-4 rounded border-slate-300 text-[#2eafa1] focus:ring-[#2eafa1]"
            />
            {copy.selectAll}
          </label>

          {selectedCount > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-sm font-medium text-slate-500">
                {selectedCount} {selectedCount > 1 ? copy.selectedPlural : copy.selected}
              </span>
              <button type="button" onClick={() => handleMarkAs(true)} disabled={isUpdating} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                <CheckCheck size={16} /> {copy.markRead}
              </button>
              <button type="button" onClick={() => handleMarkAs(false)} disabled={isUpdating} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                <Mail size={16} /> {copy.markUnread}
              </button>
              <button type="button" onClick={handleDelete} disabled={isUpdating} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50">
                <Trash2 size={16} /> {copy.delete}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-3 sm:p-5">
        {isLoading ? (
          <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-sm text-slate-500">
            <LoaderCircle className="animate-spin text-[#2eafa1]" size={24} />
            {copy.loading}
          </div>
        ) : visibleNotifications.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-5 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-teal-50 text-[#2eafa1]">
              {filter === 'UNREAD' ? <CheckCheck size={30} aria-hidden="true" /> : <Inbox size={30} aria-hidden="true" />}
            </div>
            <h2 className="text-lg font-bold text-slate-900">{copy.emptyTitle}</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
              {filter === 'UNREAD' ? copy.emptyTextUnread : copy.emptyTextAll}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleNotifications.map((notification) => {
              const isSelected = selectedIds.has(notification.id);
              const isFresh = freshIds.has(notification.id);
              const { icon: TypeIcon, className: typeClassName } = getTypeStyle(notification.type);
              return (
                <article
                  key={notification.id}
                  onClick={() => handleOpen(notification)}
                  className={`group relative flex cursor-pointer gap-3 rounded-2xl border p-4 transition duration-200 sm:gap-4 sm:p-5 ${notification.isRead ? 'border-transparent bg-slate-50/70 hover:border-slate-200 hover:bg-white' : 'border-teal-100 bg-teal-50/40 shadow-sm hover:border-teal-200'} ${isSelected ? 'ring-2 ring-[#2eafa1] ring-offset-2' : ''} ${isFresh ? 'ring-2 ring-emerald-400' : ''}`}
                >
                  <label
                    className="mt-1 flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input type="checkbox" checked={isSelected} onChange={() => handleToggleSelect(notification.id)} className="h-4 w-4 rounded border-slate-300 text-[#2eafa1] focus:ring-[#2eafa1]" />
                  </label>
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-lg ${notification.isRead ? 'bg-slate-300 text-slate-600 shadow-none' : typeClassName}`}>
                    <TypeIcon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
                      <h2 className={`text-sm leading-6 ${notification.isRead ? 'font-semibold text-slate-700' : 'font-bold text-slate-950'}`}>
                        {notification.title}
                        {isFresh && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                            <Radio size={10} /> {copy.newBadge}
                          </span>
                        )}
                      </h2>
                      <time className="flex shrink-0 items-center gap-1.5 text-xs text-slate-400" dateTime={notification.createdAt}>
                        <Clock3 size={13} /> {formatDate(notification.createdAt)}
                      </time>
                    </div>
                    <p className="mt-1.5 text-sm leading-6 text-slate-500">{notification.body}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">{notification.type}</span>
                    </div>
                  </div>
                  {!notification.isRead && <Circle className="mt-1 shrink-0 fill-[#2eafa1] text-[#2eafa1]" size={9} aria-label={copy.unread} />}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
