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
import QuickActionsSection from "@/components/quick-actions/QuickActionsSection";
import toast from "@/lib/toast";
import { MessageSquare, Search, User } from "lucide-react";
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
          <QuickActionsSection
            title={t("quickActions")}
            className={styles.section}
            titleClassName={styles.sectionTitle}
            actions={[
              {
                href: "/coaches",
                title: t("browseCoachesAction"),
                description: t("browseCoachesDesc"),
                icon: Search,
              },
              {
                href: "/messages",
                title: t("messagesAction"),
                description: t("messagesDesc"),
                icon: MessageSquare,
              },
              {
                href: "/profile",
                title: t("profileAction"),
                description: t("profileDesc"),
                icon: User,
              },
            ]}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}
