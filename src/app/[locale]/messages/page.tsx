"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import {
  HeroSection,
  EmptyState,
  LoadingIndicator,
  ConversationList,
  Chat,
} from "@/components";
import { AnimatedName } from "@/components/ui/animated-name";
import toast from "@/lib/toast";
import styles from "./page.module.css";



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
          <ConversationList
            chats={chats}
            isLoading={loading}
            userRole={user?.role}
            locale={locale}
            emptyState={{
              title: t("noConversations"),
              message:
                user?.role === "COACH"
                  ? t("noConversationsCoach")
                  : t("noConversationsClient"),
              action:
                user?.role === "PROSPECT" ? (
                  <Link href="/coaches" className={styles.emptyButton}>
                    {t("browseCoaches")}
                  </Link>
                ) : undefined,
            }}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}
