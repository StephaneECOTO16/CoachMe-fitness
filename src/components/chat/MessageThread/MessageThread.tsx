'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import ChatBubble, { ChatMessage } from '../ChatBubble';
import { LoadingIndicator } from '@/components';
import styles from './MessageThread.module.css';

interface MessageThreadProps {
    messages: ChatMessage[];
    currentUserId?: number;
    rightSideUserId?: number; // Force this user to the right side
    isLoading?: boolean;
    readOnly?: boolean;
    className?: string;
}

const MessageThread: React.FC<MessageThreadProps> = ({
    messages,
    currentUserId,
    rightSideUserId,
    isLoading = false,
    readOnly = false,
    className = '',
}) => {
    const t = useTranslations('admin.messages');
    const messagesEndRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const formatDateDivider = (timestamp: string) => {
        const date = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return t('today');
        } else if (date.toDateString() === yesterday.toDateString()) {
            return t('yesterday');
        } else {
            return date.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
            });
        }
    };

    const groupMessagesByDate = () => {
        const groups: { [key: string]: ChatMessage[] } = {};

        messages.forEach((message) => {
            const dateKey = new Date(message.timestamp).toDateString();
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(message);
        });

        return groups;
    };

    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <LoadingIndicator label={t('loadingMessages')} />
            </div>
        );
    }

    if (!messages.length) {
        return (
            <div className={styles.emptyContainer}>
                <p className={styles.emptyText}>{t('selectConversation')}</p>
            </div>
        );
    }

    const messageGroups = groupMessagesByDate();

    return (
        <div className={`${styles.container} ${className}`}>
            <div className={styles.messagesContainer}>
                {Object.entries(messageGroups).map(([dateKey, msgs]) => (
                    <div key={dateKey}>
                        <div className={styles.dateDivider}>
                            <span>{formatDateDivider(msgs[0].timestamp)}</span>
                        </div>
                        {msgs.map((message, index) => {
                            const isOwn = rightSideUserId
                                ? message.sender.id === rightSideUserId
                                : currentUserId
                                    ? message.sender.id === currentUserId
                                    : false;

                            return (
                                <ChatBubble
                                    key={message.id || index}
                                    message={message}
                                    isOwn={isOwn}
                                    showAvatar={true}
                                    showTimestamp={true}
                                    showStatus={!readOnly}
                                />
                            );
                        })}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {readOnly && (
                <div className={styles.readOnlyBanner}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{t('readOnlyMode')}</span>
                </div>
            )}
        </div>
    );
};

export default MessageThread;
