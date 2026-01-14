"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Button from "@/components/ui/Button";
import {
  HeroSection,
  StatsGrid,
  DashboardSection,
  ConversationList,
  QuickActionsSection,
  Chat,
} from "@/components";
import toast from "@/lib/toast";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, MessageSquare, Pencil, Search, Sparkles } from "lucide-react";
import styles from "./page.module.css";
import UserAvatar from "@/components/ui/UserAvatar/UserAvatar";

interface CoachProfile {
  id: number;
  userId: number;
  bio: string | null;
  discipline: {
    id: number;
    name: string;
    imageUrl?: string;
  };
  portfolio: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

interface ProfileResponse {
  success: boolean;
  user: {
    id: number;
    name: string | null;
    email: string;
    role: string;
    createdAt: string;
  };
  profile?: CoachProfile;
}

export default function CoachDashboard() {
  const t = useTranslations("coachDashboard");
  const tErrors = useTranslations("errors");
  const { user, token } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWelcomePrompt, setShowWelcomePrompt] = useState(false);

  // Check if profile is complete
  const isProfileComplete = (profile: CoachProfile | null): boolean => {
    if (!profile) return false;

    // Profile is complete if it has bio AND portfolio (or at least bio with substantial content)
    const hasBio = profile.bio && profile.bio.length >= 50;
    const hasPortfolio = profile.portfolio && profile.portfolio.length > 0;

    return !!(hasBio || hasPortfolio);
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!token) return;

      try {
        // Fetch coach profile
        const profileRes = await fetch("/api/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const profileResponse = await profileRes.json();
        if (profileResponse.success) {
          if (profileResponse.profile) {
            setProfile(profileResponse.profile);

            // Check if this is a new user (created in last 2 minutes)
            const createdAt = new Date(profileResponse.user.createdAt);
            const now = new Date();
            const diffMinutes =
              (now.getTime() - createdAt.getTime()) / 1000 / 60;
            const isNewUser = diffMinutes < 2;

            // Show welcome prompt if profile incomplete AND (new user OR hasn't seen it)
            const welcomeSeen = localStorage.getItem("welcomePromptSeen");
            if (
              !isProfileComplete(profileResponse.profile) &&
              (isNewUser || !welcomeSeen)
            ) {
              setShowWelcomePrompt(true);
            }
          }
        }

        // Fetch coach's chats
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
        toast.error(tErrors("dashboardLoadFailed"));
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [token, tErrors]);

  const handleCompleteProfile = () => {
    setShowWelcomePrompt(false);
    localStorage.setItem("welcomePromptSeen", "true");
    // Navigate to profile page with modal open
    router.push("/profile?openModal=true");
  };

  const handleSkipWelcome = () => {
    setShowWelcomePrompt(false);
    localStorage.setItem("welcomePromptSeen", "true");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className={styles.statusApproved}>
            {t("stats.statusApproved")}
          </span>
        );
      case "PENDING":
        return (
          <span className={styles.statusPending}>
            {t("stats.statusPending")}
          </span>
        );
      case "REJECTED":
        return (
          <span className={styles.statusRejected}>
            {t("stats.statusRejected")}
          </span>
        );
      default:
        return <span className={styles.statusPending}>Unknown</span>;
    }
  };

  return (
    <ProtectedRoute allowedRoles={["COACH"]}>
      <div className={styles.container}>
        {/* Hero Section */}
        <HeroSection
          title={`${t("welcomeBackCoach")}, ${user?.name?.split(" ")[0] || "Coach"}!`}
          subtitle={t("subtitle")}
          backgroundImage="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1740&auto=format&fit=crop"
          overlayOpacity={0.6}
          height="medium"
          align="left"
        />

        <div className={styles.content}>
          {/* Welcome Prompt for Incomplete Profiles */}
          <AnimatePresence>
            {showWelcomePrompt && !isProfileComplete(profile) && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ type: "spring", duration: 0.5 }}
                className={styles.welcomePrompt}
              >
                <div className={styles.welcomeIcon}>
                  <Sparkles size={32} />
                </div>
                <div className={styles.welcomeContent}>
                  <h3 className={styles.welcomeTitle}>
                    {t("profileIncomplete.title")}
                  </h3>
                  <p className={styles.welcomeMessage}>
                    {t("profileIncomplete.message")}
                  </p>
                  <div className={styles.welcomeActions}>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleCompleteProfile}
                    >
                      {t("profileIncomplete.cta")}
                    </Button>
                    <button
                      onClick={handleSkipWelcome}
                      className={styles.skipButton}
                    >
                      {t("profileIncomplete.skip")}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Approval Status Alert */}
          {profile && profile.status !== "APPROVED" && (
            <div className={styles.alertSection}>
              {profile.status === "PENDING" && (
                <div className={styles.alertPending}>
                  <div className={styles.alertIcon}>⏳</div>
                  <div className={styles.alertContent}>
                    <h3 className={styles.alertTitle}>
                      {t("accountPending.title")}
                    </h3>
                    <p className={styles.alertText}>
                      {t("accountPending.message")}
                    </p>
                  </div>
                </div>
              )}
              {profile.status === "REJECTED" && (
                <div className={styles.alertRejected}>
                  <div className={styles.alertIcon}>✗</div>
                  <div className={styles.alertContent}>
                    <h3 className={styles.alertTitle}>
                      {t("accountRejected.title")}
                    </h3>
                    <p className={styles.alertText}>
                      {t("accountRejected.message")}
                    </p>
                    <Link href="/contact">
                      <Button variant="outline" size="sm">
                        {t("accountRejected.contactSupport")}
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stats Grid */}
          <StatsGrid
            stats={[
              {
                icon: "👥",
                value: chats.length.toString(),
                label: t("stats.activeClients"),
              },
              {
                icon: "💬",
                value: chats.length.toString(),
                label: t("stats.conversations"),
              },
              {
                icon: profile?.status === "APPROVED" ? "✓" : "⏳",
                value: getStatusBadge(profile?.status || "PENDING"),
                label: t("stats.accountStatus"),
                isCustomValue: true,
              },
            ]}
          />

          {/* Profile Summary */}
          {profile && (
            <DashboardSection
              title={t("yourProfile")}
              action={
                <Link href="/profile?openModal=true">
                  <Button variant="outline" size="sm">
                    {t("settings")}
                  </Button>
                </Link>
              }
            >
              <div className={styles.profileCard}>
                <div className={styles.profileHeader}>
                  <div className={styles.profileAvatar}>
                    <UserAvatar user={user} size="xl" />
                  </div>
                  <div className={styles.profileInfo}>
                    <h3 className={styles.profileName}>
                      {user?.name || "Coach"}
                    </h3>
                    <p className={styles.profileDiscipline}>
                      {profile.discipline.name}
                    </p>
                    {getStatusBadge(profile.status)}
                  </div>
                </div>

                {profile.bio && (
                  <div className={styles.profileBio}>
                    <h4 className={styles.bioTitle}>{t("bio")}</h4>
                    <p className={styles.bioText}>{profile.bio}</p>
                  </div>
                )}

                {profile.portfolio && (
                  <div className={styles.profilePortfolio}>
                    <h4 className={styles.bioTitle}>{t("portfolio")}</h4>
                    <a
                      href={profile.portfolio}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.portfolioLink}
                    >
                      {profile.portfolio}
                    </a>
                  </div>
                )}

                {/* Show incomplete profile notice */}
                {!isProfileComplete(profile) && (
                  <div className={styles.incompleteNotice}>
                    <AlertCircle size={16} />
                    <span>{t("profileIncomplete.messageShort")}</span>
                    <button
                      onClick={() => router.push("/profile?openModal=true")}
                      className={styles.completeLink}
                    >
                      Complete now →
                    </button>
                  </div>
                )}
              </div>
            </DashboardSection>
          )}

          {/* Recent Chats Section */}
          <DashboardSection
            title={t("recentConversations")}
            action={
              chats.length > 0 ? (
                <Link href="/messages">
                  <Button variant="outline" size="sm">
                    {t("viewAll")}
                  </Button>
                </Link>
              ) : undefined
            }
          >
            <ConversationList
              chats={chats as Chat[]}
              isLoading={loading}
              loadingSize="sm"
              userRole="COACH"
              limit={5}
              emptyState={{
                title: t("noConversations"),
                message:
                  profile?.status === "APPROVED"
                    ? t("noConversationsApproved")
                    : t("noConversationsPending"),
              }}
            />
          </DashboardSection>

          {/* Quick Actions */}
          <QuickActionsSection
            title={t("quickActions")}
            className={styles.section}
            titleClassName={styles.sectionTitle}
            actions={[
              {
                href: "/profile?openModal=true",
                title: t("editProfileAction.title"),
                description: t("editProfileAction.description"),
                icon: Pencil,
              },
              {
                href: "/messages",
                title: t("messagesAction.title"),
                description: t("messagesAction.description"),
                icon: MessageSquare,
              },
              {
                href: "/coaches",
                title: t("browseCoachesAction.title"),
                description: t("browseCoachesAction.description"),
                icon: Search,
              },
            ]}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}
