'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import styles from './page.module.css';

interface Chat {
  id: number;
  coachId: number;
  clientId: number;
  createdAt: string;
  updatedAt: string;
  coach: {
    id: number;
    discipline: string;
    user: {
      id: number;
      name: string | null;
      email: string;
    };
  };
  client: {
    id: number;
    user: {
      id: number;
      name: string | null;
      email: string;
    };
  };
  _count?: {
    messages: number;
  };
}

export default function MessagesPage() {
  const t = useTranslations('messages');
  const { user, token } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChats = async () => {
      if (!token) return;

      try {
        const response = await fetch('/api/chat', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (data.success) {
          setChats(data.chats);
        }
      } catch (error) {
        console.error('Error fetching chats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, [token]);

  const getOtherParticipant = (chat: Chat) => {
    if (user?.role === 'COACH') {
      return {
        name: chat.client.user.name || 'Client',
        email: chat.client.user.email,
        avatar: chat.client.user.name?.[0]?.toUpperCase() || 'C',
        type: 'Client',
      };
    } else {
      return {
        name: chat.coach.user.name || 'Coach',
        email: chat.coach.user.email,
        avatar: chat.coach.user.name?.[0]?.toUpperCase() || 'C',
        type: chat.coach.discipline,
      };
    }
  };

  return (
    <ProtectedRoute allowedRoles={['PROSPECT', 'COACH']}>
      <div className={styles.container}>
        {/* Hero Section */}
        <div className={styles.hero}>
          <div className={styles.heroContent}>
            <h1 className={styles.title}>Messages 💬</h1>
            <p className={styles.subtitle}>
              {user?.role === 'COACH'
                ? 'Connect with your clients and manage conversations'
                : 'Chat with your coaches and get personalized guidance'}
            </p>
          </div>
        </div>

        <div className={styles.content}>
          {loading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Loading conversations...</p>
            </div>
          ) : chats.length > 0 ? (
            <div className={styles.chatList}>
              {chats.map((chat) => {
                const participant = getOtherParticipant(chat);
                return (
                  <Link
                    key={chat.id}
                    href={`/messages/${chat.id}`}
                    className={styles.chatCard}
                  >
                    <div className={styles.chatAvatar}>{participant.avatar}</div>
                    <div className={styles.chatInfo}>
                      <div className={styles.chatHeader}>
                        <h3 className={styles.chatName}>{participant.name}</h3>
                        <span className={styles.chatTime}>
                          {new Date(chat.updatedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className={styles.chatMeta}>
                        <span className={styles.chatType}>{participant.type}</span>
                        {chat._count && chat._count.messages > 0 && (
                          <span className={styles.messageCount}>
                            {chat._count.messages} {chat._count.messages === 1 ? 'message' : 'messages'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={styles.chatArrow}>→</div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>💬</div>
              <h2 className={styles.emptyTitle}>No Conversations Yet</h2>
              <p className={styles.emptyText}>
                {user?.role === 'COACH'
                  ? "You don't have any active conversations yet. Clients will be able to contact you through your profile."
                  : "You haven't started any conversations yet. Browse our coaches to find the perfect fit and start chatting!"}
              </p>
              {user?.role === 'PROSPECT' && (
                <Link href="/coaches" className={styles.emptyButton}>
                  Browse Coaches
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
