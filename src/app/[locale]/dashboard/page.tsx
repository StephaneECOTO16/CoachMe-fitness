"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import HeroSection from "@/components/sections/HeroSection";
import DashboardSection from "@/components/sections/DashboardSection";
import CoachCard from "@/components/cards/CoachCard";
import ChatCard from "@/components/cards/ChatCard";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import toast from "@/lib/toast";
import type { CoachData } from "@/components/cards/CoachCard";
import type { ChatCardData } from "@/components/cards/ChatCard";
import styles from "./page.module.css";

interface Coach {
  id: number;
  userId: number;
  bio: string | null;
  discipline: {
    id: number;
    name: string;
    imageUrl?: string;
  };
  portfolio: string | null;
  status: string;
  user: {
    id: number;
    name: string | null;
    email: string;
    avatar?: string | null;
  };
  media: Array<{
    id: number;
    url: string;
    type: string;
  }>;
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
    };
    user: {
      id: number;
      name: string | null;
      email: string;
      avatar?: string | null;
    };
  };
}

export default function ClientDashboard() {
  const t = useTranslations("client.dashboard");
  const { user, token } = useAuth();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!token) return;

      try {
        // Fetch coaches
        const coachesRes = await fetch("/api/coaches?limit=6");
        const coachesData = await coachesRes.json();
        if (coachesData.success) {
          setCoaches(coachesData.coaches);
        }

        // Fetch user's chats
        const chatsRes = await fetch("/api/chat", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const chatsData = await chatsRes.json();
        if (chatsData.success) {
          setChats(chatsData.chats);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [token]);

  // Transform Coach data to CoachData format
  const transformCoachData = (coach: Coach): CoachData => ({
    _id: coach.id.toString(),
    firstName: coach.user.name?.split(" ")[0] || "Coach",
    lastName: coach.user.name?.split(" ").slice(1).join(" ") || "",
    email: coach.user.email,
    avatar: coach.user.avatar || undefined,
    discipline: coach.discipline.name,
    bio: coach.bio || undefined,
  });

  // Transform Chat data to ChatCardData format
  const transformChatData = (chat: Chat): ChatCardData => ({
    id: chat.id.toString(),
    participant: {
      id: chat.coach.user.id.toString(),
      name: chat.coach.user.name || "Coach",
      avatar: chat.coach.user.avatar || undefined,
      role: "COACH",
      discipline: chat.coach.discipline.name,
    },
    lastUpdate: chat.updatedAt,
  });

  return (
    <ProtectedRoute allowedRoles={["PROSPECT"]}>
      <div className={styles.container}>
        <HeroSection
          title={`${t("welcomeBack")}, ${user?.name?.split(" ")[0] || "User"}!`}
          subtitle={t("subtitle")}
          backgroundImage="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=1740&auto=format&fit=crop"
          overlayOpacity={0.6}
          height="medium"
          align="left"
        />

        <div className={styles.content}>
          {/* Recent Chats Section */}
          <DashboardSection
            title={t("recentChats")}
            headerAction={{
              label: t("viewAll"),
              href: "/messages",
            }}
          >
            {loading ? (
              <div className={styles.loading}>Loading...</div>
            ) : chats.length > 0 ? (
              <div className={styles.chatList}>
                {chats.slice(0, 3).map((chat) => (
                  <ChatCard
                    key={chat.id}
                    chat={transformChatData(chat)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon="💬"
                title={t("emptyConversations")}
                actions={[
                  {
                    label: t("findCoach"),
                    href: "/coaches",
                    variant: "primary",
                  },
                ]}
              />
            )}
          </DashboardSection>

          {/* Discover Coaches Section */}
          <DashboardSection
            title={t("browseCoaches")}
            headerAction={{
              label: t("viewAll"),
              href: "/coaches",
            }}
          >
            <p className={styles.sectionDescription}>
              {t("discoverCoachesDesc")}
            </p>

            {loading ? (
              <div className={styles.loading}>Loading...</div>
            ) : coaches.length > 0 ? (
              <>
                <div className={styles.coachGrid}>
                  {coaches.map((coach) => (
                    <CoachCard
                      key={coach.id}
                      coach={transformCoachData(coach)}
                      variant="grid"
                      bioMaxLength={80}
                      showSocialLinks={false}
                    />
                  ))}
                </div>
                <div className={styles.browseCoachesButtonWrapper}>
                  <Link href="/coaches">
                    <Button variant="primary" size="lg">
                      {t("browseCoachesAction")}
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              <EmptyState
                title="No coaches available at the moment."
              />
            )}
          </DashboardSection>

          {/* Quick Actions */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t("quickActions")}</h2>
            <div className={styles.quickActions}>
              <Link href="/coaches" className={styles.actionCard}>
                <div className={styles.actionIconWrapper}>
                  <svg className={styles.actionIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className={styles.actionTitle}>
                  {t("browseCoachesAction")}
                </h3>
                <p className={styles.actionDescription}>
                  {t("browseCoachesDesc")}
                </p>
              </Link>
              <Link href="/messages" className={styles.actionCard}>
                <div className={styles.actionIconWrapper}>
                  <svg className={styles.actionIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 10H8.01M12 10H12.01M16 10H16.01M9 16H5C4.46957 16 3.96086 15.7893 3.58579 15.4142C3.21071 15.0391 3 14.5304 3 14V6C3 5.46957 3.21071 4.96086 3.58579 4.58579C3.96086 4.21071 4.46957 4 5 4H19C19.5304 4 20.0391 4.21071 20.4142 4.58579C20.7893 4.96086 21 5.46957 21 6V14C21 14.5304 20.7893 15.0391 20.4142 15.4142C20.0391 15.7893 19.5304 16 19 16H14L9 21V16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className={styles.actionTitle}>{t("messagesAction")}</h3>
                <p className={styles.actionDescription}>{t("messagesDesc")}</p>
              </Link>
              <Link href="/profile" className={styles.actionCard}>
                <div className={styles.actionIconWrapper}>
                  <svg className={styles.actionIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5.121 17.804C7.21942 16.6179 9.58958 15.9963 12 16C14.5 16 16.847 16.655 18.879 17.804M15 10C15 10.7956 14.6839 11.5587 14.1213 12.1213C13.5587 12.6839 12.7956 13 12 13C11.2044 13 10.4413 12.6839 9.87868 12.1213C9.31607 11.5587 9 10.7956 9 10C9 9.20435 9.31607 8.44129 9.87868 7.87868C10.4413 7.31607 11.2044 7 12 7C12.7956 7 13.5587 7.31607 14.1213 7.87868C14.6839 8.44129 15 9.20435 15 10ZM21 12C21 13.1819 20.7672 14.3522 20.3149 15.4442C19.8626 16.5361 19.1997 17.5282 18.364 18.364C17.5282 19.1997 16.5361 19.8626 15.4442 20.3149C14.3522 20.7672 13.1819 21 12 21C10.8181 21 9.64778 20.7672 8.55585 20.3149C7.46392 19.8626 6.47177 19.1997 5.63604 18.364C4.80031 17.5282 4.13738 16.5361 3.68508 15.4442C3.23279 14.3522 3 13.1819 3 12C3 9.61305 3.94821 7.32387 5.63604 5.63604C7.32387 3.94821 9.61305 3 12 3C14.3869 3 16.6761 3.94821 18.364 5.63604C20.0518 7.32387 21 9.61305 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className={styles.actionTitle}>{t("profileAction")}</h3>
                <p className={styles.actionDescription}>{t("profileDesc")}</p>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </ProtectedRoute>
  );
}
