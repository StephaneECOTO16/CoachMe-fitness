'use client';

import { Link } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Search, RefreshCw, PanelLeft, ArrowLeft } from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import ConversationList from '@/components/chat/ConversationList/ConversationList';
import MessageThread from '@/components/chat/MessageThread/MessageThread';
import { Chat } from '@/components/chat/types';
import { ChatMessage } from '@/components/chat/ChatBubble';

interface Message {
    id: number;
    chatId: number;
    senderId: number;
    content: string;
    createdAt: string;
    sender: {
        name: string | null;
        avatar: string | null;
        email: string;
    };
}
import toast from '@/lib/toast';
import { useAuth } from '@/contexts/AuthContext';
import { usePusher } from '@/contexts/PusherContext';
import UserAvatar from '@/components/ui/UserAvatar/UserAvatar';
import styles from './page.module.css';

export default function AdminMessagesPage() {
    const t = useTranslations('admin.messages');
    const { isAuthenticated } = useAuth();
    const { subscribeToChat, isConnected } = usePusher();
    const searchParams = useSearchParams();

    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoadingChats, setIsLoadingChats] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [showMobileSidebar, setShowMobileSidebar] = useState(true);

    // Initialize selectedChatId from URL param
    useEffect(() => {
        const chatIdParam = searchParams.get('chatId');
        if (chatIdParam) {
            setSelectedChatId(chatIdParam);
            setShowMobileSidebar(false); // Hide sidebar on deep link to show chat
        } else {
            setShowMobileSidebar(true); // Show sidebar if no chat selected
        }
    }, [searchParams]);

    // Fetch all conversations
    const fetchChats = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            setIsLoadingChats(true);
            const res = await fetch('/api/chat', {
                credentials: 'include'
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
    }, [isAuthenticated]);

    // Fetch messages for selected chat
    const fetchMessages = useCallback(async (chatId: string) => {
        if (!isAuthenticated) return;
        try {
            setIsLoadingMessages(true);
            const res = await fetch(`/api/chat/${chatId}/messages`, {
                credentials: 'include'
            });
            const data = await res.json();

            if (data.success) {
                const formattedMessages: ChatMessage[] = (data.messages || []).map((msg: Message) => {
                    // In Admin view, we'll put Coach on the right and Client on the left
                    // to give it a structured 1:1 look.
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
    }, [isAuthenticated]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchChats();
        }
    }, [isAuthenticated, fetchChats]);

    const handleChatClick = (chatId: string) => {
        setSelectedChatId(chatId);
        setShowMobileSidebar(false); // Close sidebar on mobile when chat selected
    };

    const selectedChat = useMemo(() =>
        chats.find((chat) => String(chat.id) === selectedChatId),
        [chats, selectedChatId]);

    useEffect(() => {
        if (selectedChatId && isAuthenticated) {
            fetchMessages(selectedChatId);
        } else {
            setMessages([]);
        }
    }, [selectedChatId, isAuthenticated, fetchMessages]);

    // Handle incoming real-time messages
    const handleIncomingMessage = useCallback((newMessage: Message) => {
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
    }, [selectedChat, isConnected, subscribeToChat, handleIncomingMessage]);

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
                <div className={`${styles.sidebar} ${showMobileSidebar ? styles.active : ''}`}>
                    <div className={styles.sidebarHeader}>
                        <div className={styles.sidebarTopNav}>
                            <Link
                                href="/admin/dashboard"
                                className={styles.backToDashboardCompact}
                            >
                                <ArrowLeft size={16} />
                                <span>{t('backToDashboard')}</span>
                            </Link>

                            {/* Mobile Close Button */}
                            <button
                                className={styles.mobileCloseBtn}
                                onClick={() => setShowMobileSidebar(false)}
                                aria-label="Close conversation list"
                            >
                                <PanelLeft size={20} />
                            </button>
                        </div>

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
                    <div className={`${styles.chatHeader} ${!selectedChat ? styles.mobileOnlyHeader : ''}`}>
                        <div className={styles.chatHeaderContent}>
                            {/* Mobile Toggle Button - Always visible on mobile */}
                            <button
                                className={styles.mobileToggleBtn}
                                onClick={() => setShowMobileSidebar(true)}
                                aria-label="Show conversation list"
                            >
                                <PanelLeft size={20} />
                            </button>

                            {selectedChat && (
                                <>
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
                                </>
                            )}
                        </div>
                    </div>

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
