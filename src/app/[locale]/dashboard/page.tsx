"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import HeroSection from "@/components/sections/HeroSection";
import DashboardSection from "@/components/sections/DashboardSection";
import {
  ConversationList,
  Chat,
  CoachCard,
  type CoachData,
  Button,
  EmptyState,
  QuickActionsSection,
  LoadingIndicator
} from "@/components";
import toast from "@/lib/toast";
import { MessageSquare, Search, User } from "lucide-react";
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
  rateAmount: number | string | null;
  rateType: "HOUR" | "WEEK" | "MONTH";
  address: string | null;
  city: string | null;
  country: string | null;
  minRating: number | null;
  experienceYears: number | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  twitter: string | null;
  youtube: string | null;
  status: string;
  user: {
    id: number;
    name: string | null;
    email: string;
    avatar: string | null;
  };
  media: Array<{
    id: number;
    url: string;
    type: string;
  }>;
}

export default function ClientDashboard() {
  const t = useTranslations("client.dashboard");
  const locale = useLocale();
  const { user, isAuthenticated } = useAuth();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!isAuthenticated) return;

      try {
        // Fetch coaches
        const coachesRes = await fetch("/api/coaches?limit=4", {
          credentials: "include",
        });
        const coachesData = await coachesRes.json();
        if (coachesData.success) {
          // Enforce limit strictly on client side as well
          setCoaches(coachesData.coaches.slice(0, 4));
        }

        // Fetch user's chats
        const chatsRes = await fetch("/api/chat", {
          credentials: "include",
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
  }, [isAuthenticated]);

  // Transform Coach data to CoachData format
  // Transform Coach data to CoachData format
  const transformCoachData = (coach: Coach): CoachData => ({
    _id: coach.id.toString(),
    firstName: coach.user.name?.split(" ")[0] || "Coach",
    lastName: coach.user.name?.split(" ").slice(1).join(" ") || "",
    email: coach.user.email,
    avatar: coach.user.avatar || undefined,
    discipline: coach.discipline.name,
    bio: coach.bio || undefined,
    location: [coach.city, coach.country].filter(Boolean).join(", "),
    experience: coach.experienceYears || undefined,
    rateAmount: typeof coach.rateAmount === 'string' ? parseFloat(coach.rateAmount) : (coach.rateAmount || undefined), // Handle possible string from API
    rateType: coach.rateType,
    socialMedia: {
      instagram: coach.instagram || undefined,
      facebook: coach.facebook || undefined,
      tiktok: coach.tiktok || undefined,
      twitter: coach.twitter || undefined,
      youtube: coach.youtube || undefined,
    },
    // Map media to portfolio/certifications if needed, purely visual here
    portfolio: coach.media.filter(m => m.type === 'IMAGE').map(m => ({ type: 'image', url: m.url })),
    certifications: coach.media.filter(m => m.type === 'CERTIFICATE').map(() => 'Certified'), // simplified
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
            <ConversationList
              chats={chats}
              isLoading={loading}
              loadingSize="sm"
              userRole="PROSPECT" // or 'CLIENT' depending on what's expected, but PROSPECT is in allowedRoles
              limit={3}
              locale={locale}
              className={styles.chatList}
              emptyState={{
                icon: "💬",
                title: t("emptyConversations"),
                message: t("emptyConversations"), // Providing a fallback message from title if needed, or check if 'emptyConversations' is suitable
                action: (
                  <Link href="/coaches">
                    <Button variant="primary">
                      {t("findCoach")}
                    </Button>
                  </Link>
                )
              }}
            />
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
              <div className={styles.loading}>
                <LoadingIndicator size="md" />
              </div>
            ) : coaches.length > 0 ? (
              <>
                <div className={styles.coachGrid}>
                  {coaches.map((coach) => (
                    <CoachCard
                      key={coach.id}
                      coach={transformCoachData(coach)}
                      variant="list"
                    // bioMaxLength={150} // Optional: default is usually fine
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
