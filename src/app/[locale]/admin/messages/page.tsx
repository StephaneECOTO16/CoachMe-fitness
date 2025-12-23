'use client';

import { Link } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Search, RefreshCw, ArrowLeft } from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { LoadingIndicator } from '@/components';
import ConversationList from '@/components/chat/ConversationList/ConversationList';
import MessageThread from '@/components/chat/MessageThread/MessageThread';
import { Chat } from '@/components/chat/types';
import { ChatMessage } from '@/components/chat/ChatBubble';
import toast from '@/lib/toast';
import { useAuth } from '@/contexts/AuthContext';
import { usePusher } from '@/contexts/PusherContext';
import UserAvatar from '@/components/ui/UserAvatar/UserAvatar';
import styles from './page.module.css';

export default function AdminMessagesPage() {
    const t = useTranslations('admin.messages');
    const tCommon = useTranslations('common');
    const { token, user } = useAuth();
    const { subscribeToChat, isConnected } = usePusher();
    const searchParams = useSearchParams();

    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoadingChats, setIsLoadingChats] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);

    // Initialize selectedChatId from URL param
    useEffect(() => {
        const chatIdParam = searchParams.get('chatId');
        if (chatIdParam) {
            setSelectedChatId(chatIdParam);
        }
    }, [searchParams]);

    // Fetch all conversations
    const fetchChats = async () => {
        if (!token) return;
        try {
            setIsLoadingChats(true);
            const res = await fetch('/api/chat', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success) {
                setChats(data.chats || []);
            } else {
                toast.error(data.error?.message || 'Failed to load conversations');
            }
        } catch (error) {
            console.error('Error fetching chats:', error);
            toast.error('Failed to load conversations');
        } finally {
            setIsLoadingChats(false);
        }
    };

    // Fetch messages for selected chat
    const fetchMessages = async (chatId: string) => {
        if (!token) return;
        try {
            setIsLoadingMessages(true);
            const res = await fetch(`/api/chat/${chatId}/messages`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success) {
                const formattedMessages: ChatMessage[] = (data.messages || []).map((msg: Message) => {
                    // In Admin view, we'll put Coach on the right and Client on the left
                    // to give it a structured 1:1 look.
                    const isCoach = msg.senderId === selectedChat?.coach.user.id;

                    return {
                        id: String(msg.id),
                        content: msg.content,
                        timestamp: msg.createdAt,
                        sender: {
                            id: msg.senderId, // Add ID for comparison in MessageThread
                            name: msg.sender.name || 'User',
                            avatar: msg.sender.avatar || undefined,
                        },
                        status: 'read',
                    };
                });
                setMessages(formattedMessages);
            } else {
                toast.error(data.error?.message || 'Failed to load messages');
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
            toast.error('Failed to load messages');
        } finally {
            setIsLoadingMessages(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchChats();
        }
    }, [token]);

    const handleChatClick = (chatId: string) => {
        setSelectedChatId(chatId);
    };

    const selectedChat = useMemo(() =>
        chats.find((chat) => String(chat.id) === selectedChatId),
        [chats, selectedChatId]);

    useEffect(() => {
        if (selectedChatId && token) {
            fetchMessages(selectedChatId);
        } else {
            setMessages([]);
        }
    }, [selectedChatId, token]);

    // Handle incoming real-time messages
    const handleIncomingMessage = useCallback((newMessage: any) => {
        setMessages((prev) => {
            // Prevent duplicate messages
            if (prev.some((m) => String(m.id) === String(newMessage.id))) {
                return prev;
            }

            const formatted: ChatMessage = {
                id: String(newMessage.id),
                content: newMessage.content,
                timestamp: newMessage.createdAt,
                sender: {
                    id: newMessage.senderId,
                    name: newMessage.sender.name || 'User',
                    avatar: newMessage.sender.avatar || undefined,
                },
                status: 'read',
            };

            return [...prev, formatted];
        });

        // Also update the chat list to show the latest message
        setChats(prev => prev.map(c => {
            if (String(c.id) === String(newMessage.chatId)) {
                return {
                    ...c,
                    lastMessage: newMessage.content,
                    updatedAt: newMessage.createdAt
                };
            }
            return c;
        }));
    }, []);

    // Subscribe to Pusher channel when a chat is selected
    useEffect(() => {
        if (!selectedChat || !isConnected) return;

        const unsubscribe = subscribeToChat(
            selectedChat.coachId,
            selectedChat.clientId,
            handleIncomingMessage
        );

        return () => {
            unsubscribe();
        };
    }, [selectedChat?.id, isConnected, subscribeToChat, handleIncomingMessage]);

    const filteredChats = useMemo(() => {
        if (!searchQuery.trim()) return chats;

        const query = searchQuery.toLowerCase();
        return chats.filter((chat) => {
            const coachName = chat.coach.user.name?.toLowerCase() || '';
            const clientName = chat.client.user.name?.toLowerCase() || '';
            const coachEmail = chat.coach.user.email.toLowerCase();
            const clientEmail = chat.client.user.email.toLowerCase();

            return (
                coachName.includes(query) ||
                clientName.includes(query) ||
                coachEmail.includes(query) ||
                clientEmail.includes(query)
            );
        });
    }, [chats, searchQuery]);


    return (
        <ProtectedRoute allowedRoles={['ADMIN']}>
            <div className={styles.container}>
                {/* Left Sidebar - Conversations List */}
                <div className={styles.sidebar}>
                    <div className={styles.sidebarHeader}>
                        <div className={styles.headerTop}>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                <h1 className={styles.title}>{t('title')}</h1>
                                <button
                                    className={styles.refreshBtn}
                                    onClick={fetchChats}
                                    title="Refresh"
                                >
                                    <RefreshCw size={18} />
                                </button>
                            </div>
                        </div>

                    </div>

                    <div className={styles.searchWrapper}>
                        <Search className={styles.searchIcon} size={18} />
                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder={t('searchPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className={styles.conversationListWrapper}>
                        <ConversationList
                            chats={filteredChats}
                            userRole="ADMIN"
                            isLoading={isLoadingChats}
                            onChatClick={handleChatClick}
                            emptyState={{
                                title: t('noConversations'),
                                message: '',
                                icon: '💬',
                            }}
                        />
                    </div>
                </div>

                {/* Right Panel - Message Thread */}
                <div className={styles.mainPanel}>
                    {selectedChat && (
                        <div className={styles.chatHeader}>
                            <div className={styles.chatHeaderContent}>
                                <div className={styles.avatarGroup}>
                                    <div className={styles.avatarWrapper}>
                                        <UserAvatar user={selectedChat.coach.user} size="md" />
                                    </div>
                                    <div className={styles.avatarWrapper}>
                                        <UserAvatar user={selectedChat.client.user} size="md" />
                                    </div>
                                </div>
                                <div className={styles.chatHeaderInfo}>
                                    <h2 className={styles.chatTitle}>
                                        {selectedChat.coach.user.name} <span className={styles.separator}>×</span> {selectedChat.client.user.name}
                                    </h2>
                                    <p className={styles.chatSubtitle}>
                                        {selectedChat.coach.discipline.name} · Thread #{selectedChat.id}
                                    </p>
                                </div>
                            </div>
                            <Link
                                href="/admin/dashboard"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    color: '#6b7280',
                                    textDecoration: 'none',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    transition: 'background-color 0.2s',
                                    marginLeft: 'auto'
                                }}
                                className="hover:bg-gray-100" // simpler hover effect if tailwind is available, else I might need inline hover or class
                            >
                                <ArrowLeft size={16} />
                                <span>{t('backToDashboard')}</span>
                            </Link>
                        </div>
                    )}

                    <MessageThread
                        messages={messages}
                        isLoading={isLoadingMessages}
                        readOnly={true}
                        rightSideUserId={selectedChat?.coach.user.id}
                        className={styles.messageThread}
                    />
                </div>
            </div>
        </ProtectedRoute>
    );
}
