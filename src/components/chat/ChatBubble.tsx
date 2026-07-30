'use client';

import React from 'react';
import styles from './ChatBubble.module.css';
import UserAvatar from '../ui/UserAvatar/UserAvatar';

export interface ChatMessage {
  id?: string;
  content: string;
  timestamp: string;
  sender: {
    id?: number;
    name: string;
    avatar?: string;
  };
  status?: 'sending' | 'sent' | 'delivered' | 'read';
}

export interface ChatBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  showStatus?: boolean;
  className?: string;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isOwn,
  showAvatar = true,
  showTimestamp = true,
  showStatus = true,
  className = '',
}) => {


  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderStatus = () => {
    if (!showStatus || !isOwn || !message.status) return null;

    switch (message.status) {
      case 'sending':
        return (
          <span className={`${styles.status} ${styles.sending}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" strokeWidth="2" />
            </svg>
          </span>
        );
      case 'sent':
        return (
          <span className={`${styles.status} ${styles.sent}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        );
      case 'delivered':
        return (
          <span className={`${styles.status} ${styles.delivered}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
              <polyline points="23 6 12 17" />
            </svg>
          </span>
        );
      case 'read':
        return (
          <span className={`${styles.status} ${styles.read}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
              <polyline points="23 6 12 17" />
            </svg>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`${styles.messageWrapper} ${isOwn ? styles.own : styles.other} ${className}`}>
      {!isOwn && showAvatar && (
        <UserAvatar user={message.sender} size="sm" className={styles.avatarWrapper} />
      )}

      <div className={styles.messageContent}>
        {!isOwn && <span className={styles.senderName}>{message.sender.name}</span>}

        <div className={styles.bubble}>
          <p className={styles.text}>{message.content}</p>
        </div>

        <div className={styles.meta}>
          {showTimestamp && (
            <span className={styles.timestamp}>{formatTime(message.timestamp)}</span>
          )}
          {renderStatus()}
        </div>
      </div>

      {isOwn && showAvatar && (
        <UserAvatar user={message.sender} size="sm" className={styles.avatarWrapper} />
      )}
    </div>
  );
};

export default ChatBubble;
