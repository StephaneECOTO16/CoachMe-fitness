'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Button from '@/components/ui/Button';
import styles from './page.module.css';

interface Message {
  id: number;
  chatId: number;
  senderId: number;
  content: string;
  createdAt: string;
  sender: {
    id: number;
    name: string | null;
    email: string;
    role: string;
  };
}

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
  messages: Message[];
}

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('messages');
  const { user, token } = useAuth();
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatId = params?.chatId as string;

  useEffect(() => {
    const fetchChat = async () => {
      if (!token || !chatId) return;

      try {
        const response = await fetch(`/api/chat/${chatId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await response.json();

        if (data.success) {
          setChat(data.chat);
          setMessages(data.chat.messages || []);
        } else {
          console.error('Failed to fetch chat');
        }
      } catch (error) {
        console.error('Error fetching chat:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChat();
  }, [token, chatId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !token || !chatId || sending) return;

    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage(''); // Optimistically clear input

    try {
      const response = await fetch(`/api/chat/${chatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: messageContent,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Add the new message to the list
        setMessages((prev) => [...prev, data.message]);
      } else {
        alert('Failed to send message. Please try again.');
        setNewMessage(messageContent); // Restore message on failure
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
      setNewMessage(messageContent); // Restore message on failure
    } finally {
      setSending(false);
    }
  };

  const getOtherParticipant = () => {
    if (!chat) return null;

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

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['PROSPECT', 'COACH']}>
        <div className={styles.container}>
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading conversation...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!chat) {
    return (
      <ProtectedRoute allowedRoles={['PROSPECT', 'COACH']}>
        <div className={styles.container}>
          <div className={styles.error}>
            <h2>Conversation Not Found</h2>
            <p>This conversation does not exist or you don't have access to it.</p>
            <Link href="/messages">
              <Button variant="primary">Back to Messages</Button>
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const participant = getOtherParticipant();

  return (
    <ProtectedRoute allowedRoles={['PROSPECT', 'COACH']}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <Link href="/messages" className={styles.backButton}>
              ← Back
            </Link>
            <div className={styles.participantInfo}>
              <div className={styles.participantAvatar}>
                {participant?.avatar}
              </div>
              <div>
                <h1 className={styles.participantName}>{participant?.name}</h1>
                <p className={styles.participantType}>{participant?.type}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div className={styles.messagesContainer}>
          <div className={styles.messagesContent}>
            {messages.length === 0 ? (
              <div className={styles.emptyMessages}>
                <div className={styles.emptyIcon}>👋</div>
                <h3 className={styles.emptyTitle}>Start the Conversation</h3>
                <p className={styles.emptyText}>
                  Send a message to {participant?.name} to begin your conversation.
                </p>
              </div>
            ) : (
              <div className={styles.messagesList}>
                {messages.map((message) => {
                  const isOwnMessage = message.senderId === user?.id;
                  return (
                    <div
                      key={message.id}
                      className={`${styles.messageWrapper} ${
                        isOwnMessage ? styles.messageWrapperOwn : styles.messageWrapperOther
                      }`}
                    >
                      {!isOwnMessage && (
                        <div className={styles.messageAvatar}>
                          {participant?.avatar}
                        </div>
                      )}
                      <div
                        className={`${styles.message} ${
                          isOwnMessage ? styles.messageOwn : styles.messageOther
                        }`}
                      >
                        <p className={styles.messageContent}>{message.content}</p>
                        <span className={styles.messageTime}>
                          {new Date(message.createdAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Message Input */}
        <div className={styles.inputContainer}>
          <div className={styles.inputContent}>
            <form onSubmit={handleSendMessage} className={styles.inputForm}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={`Message ${participant?.name}...`}
                className={styles.input}
                disabled={sending}
              />
              <Button
                type="submit"
                variant="primary"
                disabled={!newMessage.trim() || sending}
                className={styles.sendButton}
              >
                {sending ? 'Sending...' : 'Send'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
