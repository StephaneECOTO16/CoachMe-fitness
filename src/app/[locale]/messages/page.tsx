"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import {
  HeroSection,
  ChatCard,
  EmptyState,
  LoadingIndicator,
} from "@/components";
import { AnimatedName } from "@/components/ui/animated-name";
import toast from "@/lib/toast";
import styles from "./page.module.css";

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
  _count?: {
    messages: number;
  };
}

export default function MessagesPage() {
  const t = useTranslations("messages");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const { user, token } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChats = async () => {
      if (!token) return;

      try {
        const response = await fetch("/api/chat", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (data.success) {
          setChats(data.chats);
        } else {
          toast.error(tErrors("generic"));
        }
      } catch (error) {
        console.error("Error fetching chats:", error);
        toast.error(tErrors("networkError"));
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, [token, tErrors]);

  const getOtherParticipant = (chat: Chat) => {
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

  return (
    <ProtectedRoute allowedRoles={["PROSPECT", "COACH"]}>
      <div className={styles.container}>
        <HeroSection
          title={
            <AnimatedName
              prefix={t("title")}
              name={
                user?.name?.split(" ")[0] ||
                (user?.role === "COACH" ? "Coach" : "User")
              }
            />
          }
          subtitle={
            user?.role === "COACH" ? t("subtitleCoach") : t("subtitleClient")
          }
          backgroundImage="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1740&auto=format&fit=crop"
        />

        <div className={styles.content}>
          {loading ? (
            <div className={styles.loading}>
              <LoadingIndicator label={t("loading")} unstyledLabel />
            </div>
          ) : chats.length > 0 ? (
            <div className={styles.chatList}>
              {chats.map((chat) => {
                const participant = getOtherParticipant(chat);
                const chatCardData = {
                  id: String(chat.id),
                  participant: {
                    id:
                      user?.role === "COACH"
                        ? String(chat.client.id)
                        : String(chat.coach.id),
                    name: participant.name,
                    avatar: participant.avatar || undefined,
                    role: undefined,
                    discipline: participant.type,
                  },
                  lastMessage: undefined,
                  lastUpdate: chat.updatedAt,
                  unreadCount: chat._count?.messages,
                  isOnline: false,
                };
                return (
                  <ChatCard
                    key={chat.id}
                    chat={chatCardData}
                    locale={locale}
                    className={styles.listItem}
                  />
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon="💬"
              title={t("noConversations")}
              message={
                user?.role === "COACH"
                  ? t("noConversationsCoach")
                  : t("noConversationsClient")
              }
              action={
                user?.role === "PROSPECT" ? (
                  <Link href="/coaches" className={styles.emptyButton}>
                    {t("browseCoaches")}
                  </Link>
                ) : undefined
              }
            />
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
