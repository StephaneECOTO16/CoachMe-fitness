"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { useAuth } from "@/contexts/AuthContext";
import { usePusher } from "@/contexts/PusherContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Button from "@/components/ui/Button";
import { ChatBubble, LoadingIndicator } from "@/components";
import UserAvatar from "@/components/ui/UserAvatar/UserAvatar";
import toast from "@/lib/toast";
import styles from "./page.module.css";

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
    avatar: string | null;
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
    discipline: {
      id: number;
      name: string;
      imageUrl?: string;
    };
    user: {
      id: number;
      name: string | null;
      email: string;
      avatar: string | null;
    };
  };
  client: {
    id: number;
    user: {
      id: number;
      name: string | null;
      email: string;
      avatar: string | null;
    };
  };
  messages: Message[];
}

export default function ConversationPage() {
  const params = useParams();
  const t = useTranslations("messages.conversation");
  const tErrors = useTranslations("errors");
  const { user, isAuthenticated } = useAuth();
  const { subscribeToChat, isConnected } = usePusher();
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const chatId = params?.chatId as string;

  // Fetch initial chat data and messages
  useEffect(() => {
    const fetchChat = async () => {
      if (!isAuthenticated || !chatId) return;

      try {
        const response = await fetch(`/api/chat/${chatId}`, {
          credentials: "include",
        });
        const data = await response.json();

        if (data.success) {
          setChat(data.chat);
          setMessages(data.chat.messages || []);
        } else {
          toast.error(t("notFound"));
        }
      } catch (error) {
        console.error("Error fetching chat:", error);
        toast.error(tErrors("networkError"));
      } finally {
        setLoading(false);
      }
    };

    fetchChat();
  }, [isAuthenticated, chatId, t, tErrors]);

  /**
   * Handle incoming real-time messages from Pusher.
   * Only adds message if it's not already in the list (prevents duplicates from own sends).
   */
  const handleIncomingMessage = useCallback((message: Message) => {
    setMessages((prev) => {
      // Prevent duplicate messages (e.g., from own send that was already added optimistically)
      if (prev.some((m) => m.id === message.id)) {
        return prev;
      }
      return [...prev, message];
    });
  }, []);

  // Memoize coach and client IDs to prevent useEffect re-runs
  const coachId = useMemo(() => chat?.coachId, [chat?.coachId]);
  const clientId = useMemo(() => chat?.clientId, [chat?.clientId]);

  // Subscribe to real-time messages via Pusher
  useEffect(() => {
    if (!coachId || !clientId || !isConnected) return;

    // Subscribe to the chat channel for real-time updates
    const unsubscribe = subscribeToChat(
      coachId,
      clientId,
      handleIncomingMessage
    );

    return () => {
      unsubscribe();
    };
  }, [coachId, clientId, isConnected, subscribeToChat, handleIncomingMessage]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle textarea auto-resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${scrollHeight}px`;

      // Only show scrollbar if we hit or exceed max-height (150px from CSS)
      if (scrollHeight >= 150) {
        textareaRef.current.style.overflowY = "auto";
      } else {
        textareaRef.current.style.overflowY = "hidden";
      }
    }
  }, [newMessage]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !isAuthenticated || !chatId || sending) return;

    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage(""); // Optimistically clear input

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const response = await fetch(`/api/chat/${chatId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          content: messageContent,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        toast.error(t("sendError"));
        setNewMessage(messageContent); // Restore message on failure
      }
      // Don't add here - let Pusher handle it to avoid duplicates
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error(t("sendError"));
      setNewMessage(messageContent); // Restore message on failure
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getOtherParticipant = () => {
    if (!chat) return null;

    if (user?.role === "COACH") {
      return {
        name: chat.client.user.name || "Client",
        email: chat.client.user.email,
        avatar: chat.client.user.avatar || null,
        type: "Client",
      };
    } else {
      return {
        name: chat.coach.user.name || "Coach",
        email: chat.coach.user.email,
        avatar: chat.coach.user.avatar || null,
        type: chat.coach.discipline.name,
      };
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["PROSPECT", "COACH"]}>
        <div className={styles.container}>
          <div className={styles.loading}>
            <LoadingIndicator label={t("loading")} unstyledLabel />
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!chat) {
    return (
      <ProtectedRoute allowedRoles={["PROSPECT", "COACH"]}>
        <div className={styles.container}>
          <div className={styles.error}>
            <h2>{t("notFound")}</h2>
            <p>{t("notFoundMessage")}</p>
            <Link href="/messages">
              <Button variant="primary">{t("backToMessages")}</Button>
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const participant = getOtherParticipant();

  return (
    <ProtectedRoute allowedRoles={["PROSPECT", "COACH"]}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <Link href="/messages" className={styles.backButton}>
              ← {t("back")}
            </Link>
            <div className={styles.participantInfo}>
              <div className={styles.participantAvatar}>
                <UserAvatar user={participant} size="lg" />
              </div>
              <div>
                <h1 className={styles.participantName}>{participant?.name}</h1>
                <p className={styles.participantType}>
                  {participant?.type}
                </p>
              </div>
            </div>
            <div className={styles.headerActions}>
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                className={styles.iconAction}
                title={t("comingSoon")}
                disabled
                aria-disabled
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4 7a2 2 0 0 1 2-2h8l4 4v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M14 5v4h4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                className={styles.iconAction}
                title={t("comingSoon")}
                disabled
                aria-disabled
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.14 1.09.39 2.14.73 3.16a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1-1a2 2 0 0 1 2.11-.45c1.02.34 2.07.59 3.16.73A2 2 0 0 1 22 16.92Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                className={styles.iconAction}
                title={t("comingSoon")}
                disabled
                aria-disabled
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    x="3"
                    y="5"
                    width="18"
                    height="14"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path d="M10 9l5 3-5 3V9Z" fill="currentColor" />
                </svg>
              </Button>
              {/* <div
                className={styles.presence}
                title={t("comingSoon")}
                aria-disabled
              >
                <span className={styles.presenceDot}></span>
                <span className={styles.presenceText}>
                  {t("presenceLabel")}
                </span>
              </div> */}
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div className={styles.messagesContainer}>
          <div className={styles.messagesContent}>
            {messages.length === 0 ? (
              <div className={styles.emptyMessages}>
                <div className={styles.emptyIcon}>👋</div>
                <h3 className={styles.emptyTitle}>{t("startConversation")}</h3>
                <p className={styles.emptyText}>
                  {t("startMessage", {
                    name: participant?.name || "this user",
                  })}
                </p>
              </div>
            ) : (
              <div className={styles.messagesList}>
                {messages.map((message) => {
                  const isOwnMessage = String(message.senderId) === String(user?.id);
                  const bubbleMessage = {
                    id: String(message.id),
                    content: message.content,
                    timestamp: message.createdAt,
                    sender: {
                      name: isOwnMessage
                        ? user?.name || "You"
                        : participant?.name || "User",
                      avatar: isOwnMessage ? user?.avatar || undefined : message.sender.avatar || undefined,
                    },
                    status: undefined as 'sending' | 'sent' | 'delivered' | 'read' | undefined,
                  };
                  return (
                    <ChatBubble
                      key={message.id}
                      message={bubbleMessage}
                      isOwn={isOwnMessage}
                    />
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
              <button
                type="button"
                className={styles.inputIconButton}
                title={t("comingSoon")}
                disabled
                aria-disabled
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M21.44 11.05 12.95 2.56a1.5 1.5 0 0 0-2.12 0L2.56 10.83a1.5 1.5 0 0 0 0 2.12l8.49 8.49a1.5 1.5 0 0 0 2.12 0l8.27-8.27a1.5 1.5 0 0 0 0-2.12Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M7 12l5 5 5-5-5-5-5 5Z" fill="currentColor" />
                </svg>
              </button>
              <textarea
                ref={textareaRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("messagePlaceholder", {
                  name: participant?.name || "user",
                })}
                className={styles.input}
                disabled={sending}
                rows={1}
              />
              <Button
                type="submit"
                variant="primary"
                disabled={!newMessage.trim() || sending}
                className={styles.sendButton}
              >
                {sending ? t("sending") : t("send")}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
