'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './ChatCard.module.css';
import UserAvatar from '../ui/UserAvatar/UserAvatar';

export interface ChatParticipant {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
  discipline?: string;
}

export interface ChatCardData {
  id: string;
  participant: ChatParticipant;
  secondaryParticipant?: ChatParticipant; // For dual avatars in Admin view
  lastMessage?: string;
  lastUpdate: string;
  unreadCount?: number;
  isOnline?: boolean;
}

export interface ChatCardProps {
  chat: ChatCardData;
  onClick?: (chatId: string) => void;
  isActive?: boolean;
  locale?: string;
  className?: string;
}

const ChatCard: React.FC<ChatCardProps> = ({
  chat,
  onClick,
  isActive = false,
  locale = 'en',
  className = '',
}) => {
  const router = useRouter();

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return minutes === 0 ? 'Just now' : `${minutes}m ago`;
      }
      return `${hours}h ago`;
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    try {
      return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return date.toLocaleDateString();
    }
  };

  const truncateMessage = (message: string, maxLength = 60) => {
    return message.length > maxLength
      ? `${message.substring(0, maxLength)}...`
      : message;
  };

  const handleClick = () => {
    if (onClick) {
      onClick(chat.id);
    } else {
      router.push(`/${locale}/messages/${chat.id}`);
    }
  };

  return (
    <div
      className={`${styles.chatCard} ${isActive ? styles.active : ''} ${className}`}
      onClick={handleClick}
    >
      <div className={styles.avatarWrapper}>
        {chat.secondaryParticipant ? (
          <div className={styles.avatarGroup}>
            <div className={styles.avatarItem}>
              <UserAvatar user={chat.participant} size="md" />
            </div>
            <div className={styles.avatarItem}>
              <UserAvatar user={chat.secondaryParticipant} size="md" />
            </div>
          </div>
        ) : (
          <UserAvatar user={chat.participant} size="lg" />
        )}
        {chat.isOnline && <span className={styles.onlineIndicator} />}
        {/* {chat.unreadCount && chat.unreadCount > 0 && (
          <span className={styles.unreadBadge}>
            {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
          </span>
        )} */}
      </div>

      <div className={styles.content}>
        <div className={styles.header}>
          <h4 className={styles.name}>
            {chat.secondaryParticipant ? (
              <>
                {chat.participant.name} <span style={{ color: '#9ca3af', fontWeight: 400 }}>×</span> {chat.secondaryParticipant.name}
              </>
            ) : (
              chat.participant.name
            )}
          </h4>
          <div className={styles.timeWrap}>
            <span className={styles.time}>{formatTime(chat.lastUpdate)}</span>
            {/* <span className={styles.date}>{formatDate(chat.lastUpdate)}</span> */}
          </div>
        </div>

        {(chat.participant.role || chat.participant.discipline) && !chat.secondaryParticipant && (
          <p className={styles.role}>
            {chat.participant.discipline || chat.participant.role}
          </p>
        )}

        {chat.lastMessage && (
          <p className={styles.lastMessage}>
            {truncateMessage(chat.lastMessage)}
          </p>
        )}
      </div>
    </div>
  );
};

export default ChatCard;
