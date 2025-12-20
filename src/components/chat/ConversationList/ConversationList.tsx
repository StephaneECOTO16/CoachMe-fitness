'use client';

import React from 'react';
import ChatCard from '@/components/cards/ChatCard';
import EmptyState, { EmptyStateAction } from '@/components/ui/EmptyState';
import LoadingIndicator, { LoadingIndicatorSize } from '@/components/loading/LoadingIndicator';
import { Chat } from '../types';
import styles from './ConversationList.module.css';

interface ConversationListProps {
    chats: Chat[];
    userId?: number;
    userRole?: string;
    isLoading?: boolean;
    loadingSize?: LoadingIndicatorSize;
    limit?: number;
    locale?: string;
    emptyState?: {
        title: string;
        message: string;
        action?: React.ReactNode;
        icon?: string;
    };
    onChatClick?: (chatId: string) => void;
    className?: string;
}

const ConversationList: React.FC<ConversationListProps> = ({
    chats,
    userId,
    userRole,
    isLoading = false,
    loadingSize = 'lg',
    limit,
    locale = 'en',
    emptyState,
    onChatClick,
    className = '',
}) => {
    if (isLoading) {
        return (
            <div className={styles.loadingWrapper}>
                <LoadingIndicator size={loadingSize} />
            </div>
        );
    }

    if (!chats.length) {
        if (emptyState) {
            return (
                <div className={styles.emptyStateWrapper}>
                    <EmptyState
                        icon={emptyState.icon || '💬'}
                        title={emptyState.title}
                        message={emptyState.message}
                        action={emptyState.action}
                    />
                </div>
            );
        }
        return null;
    }

    const displayChats = limit ? chats.slice(0, limit) : chats;

    const getOtherParticipant = (chat: Chat) => {
        // If userRole is provided, use it to determine the other side.
        // Otherwise fallback or check userId logic if needed (simplified here based on provided usage).

        // Default assumption: if we are COACH, we want to see Client.
        if (userRole === 'COACH') {
            return {
                id: String(chat.client.id),
                name: chat.client.user.name || 'Client',
                email: chat.client.user.email,
                avatar: chat.client.user.avatar || undefined,
                role: 'Client',
                discipline: 'Client', // Or just use role logic
            };
        } else {
            // If we are CLIENT (or PROSPECT), we want to see Coach
            return {
                id: String(chat.coach.id),
                name: chat.coach.user.name || 'Coach',
                email: chat.coach.user.email,
                avatar: chat.coach.user.avatar || undefined,
                role: chat.coach.discipline.name,
                discipline: chat.coach.discipline.name,
            };
        }
    };

    return (
        <div className={`${styles.list} ${className}`}>
            {displayChats.map((chat) => {
                const participant = getOtherParticipant(chat);

                const chatCardData = {
                    id: String(chat.id),
                    participant: {
                        id: participant.id,
                        name: participant.name,
                        avatar: participant.avatar,
                        role: participant.role,
                        discipline: participant.discipline,
                    },
                    lastMessage: chat.lastMessage,
                    lastUpdate: chat.updatedAt,
                    unreadCount: chat._count?.messages,
                    isOnline: chat.isOnline,
                };

                return (
                    <ChatCard
                        key={chat.id}
                        chat={chatCardData}
                        locale={locale}
                        onClick={onChatClick}
                        className={styles.listItem}
                    />
                );
            })}
        </div>
    );
};

export default ConversationList;
