"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/routing";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Button from "@/components/ui/Button";
import { HeroSection, StatsGrid, DashboardSection, ChatCard, EmptyState } from "@/components";
import toast from "@/lib/toast";
import { AnimatedName } from "@/components/ui/animated-name";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Sparkles } from "lucide-react";
import styles from "./page.module.css";

interface Chat {
  id: number;
  coachId: number;
  clientId: number;
  createdAt: string;
  updatedAt: string;
  client: {
    id: number;
    user: {
      id: number;
      name: string | null;
      email: string;
    };
  };
}

interface CoachProfile {
  id: number;
  userId: number;
  bio: string | null;
  discipline: string;
  portfolio: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

interface ProfileData {
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
  const { user, token } = useAuth();
  const router = useRouter();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
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
          setProfileData(profileResponse);
          if (profileResponse.profile) {
            setProfile(profileResponse.profile);

            // Check if this is a new user (created in last 2 minutes)
            const createdAt = new Date(profileResponse.user.createdAt);
            const now = new Date();
            const diffMinutes = (now.getTime() - createdAt.getTime()) / 1000 / 60;
            const isNewUser = diffMinutes < 2;

            // Show welcome prompt if profile incomplete AND (new user OR hasn't seen it)
            const welcomeSeen = localStorage.getItem("welcomePromptSeen");
            if (!isProfileComplete(profileResponse.profile) && (isNewUser || !welcomeSeen)) {
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
        toast.error(t("errors.loadFailed"));
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [token, t]);

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
          title={
            <AnimatedName
              prefix={t("welcomeBackCoach")}
              name={user?.name?.split(" ")[0] || "Coach"}
              suffix="! 👋"
            />
          }
          subtitle={t("subtitle")}
          backgroundImage="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1740&auto=format&fit=crop"
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
                    {user?.name?.[0]?.toUpperCase() || "C"}
                  </div>
                  <div className={styles.profileInfo}>
                    <h3 className={styles.profileName}>
                      {user?.name || "Coach"}
                    </h3>
                    <p className={styles.profileDiscipline}>
                      {profile.discipline}
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
                    <span>
                      {t("profileIncomplete.messageShort")}
                    </span>
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
            {loading ? (
              <div className={styles.loading}>{t("loading")}</div>
            ) : chats.length > 0 ? (
              <div className={styles.chatList}>
                {chats.slice(0, 5).map((chat) => (
                  <ChatCard
                    key={chat.id}
                    id={chat.id}
                    name={chat.client.user.name || "Client"}
                    email={chat.client.user.email}
                    lastMessageTime={new Date(chat.updatedAt)}
                    href={`/messages/${chat.id}`}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon="💬"
                title={t("noConversations")}
                message={
                  profile?.status === "APPROVED"
                    ? t("noConversationsApproved")
                    : t("noConversationsPending")
                }
              />
            )}
          </DashboardSection>

          {/* Quick Actions */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t("quickActions")}</h2>
            <div className={styles.quickActions}>
              <Link href="/profile?openModal=true" className={styles.actionCard}>
                <div className={styles.actionIconWrapper}>
                  <svg className={styles.actionIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5.121 17.804C7.21942 16.6179 9.58958 15.9963 12 16C14.5 16 16.847 16.655 18.879 17.804M15 10C15 10.7956 14.6839 11.5587 14.1213 12.1213C13.5587 12.6839 12.7956 13 12 13C11.2044 13 10.4413 12.6839 9.87868 12.1213C9.31607 11.5587 9 10.7956 9 10C9 9.20435 9.31607 8.44129 9.87868 7.87868C10.4413 7.31607 11.2044 7 12 7C12.7956 7 13.5587 7.31607 14.1213 7.87868C14.6839 8.44129 15 9.20435 15 10ZM21 12C21 13.1819 20.7672 14.3522 20.3149 15.4442C19.8626 16.5361 19.1997 17.5282 18.364 18.364C17.5282 19.1997 16.5361 19.8626 15.4442 20.3149C14.3522 20.7672 13.1819 21 12 21C10.8181 21 9.64778 20.7672 8.55585 20.3149C7.46392 19.8626 6.47177 19.1997 5.63604 18.364C4.80031 17.5282 4.13738 16.5361 3.68508 15.4442C3.23279 14.3522 3 13.1819 3 12C3 9.61305 3.94821 7.32387 5.63604 5.63604C7.32387 3.94821 9.61305 3 12 3C14.3869 3 16.6761 3.94821 18.364 5.63604C20.0518 7.32387 21 9.61305 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className={styles.actionTitle}>
                  {t("editProfileAction.title")}
                </h3>
                <p className={styles.actionDescription}>
                  {t("editProfileAction.description")}
                </p>
              </Link>

              <Link href="/messages" className={styles.actionCard}>
                <div className={styles.actionIconWrapper}>
                  <svg className={styles.actionIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 10H8.01M12 10H12.01M16 10H16.01M9 16H5C4.46957 16 3.96086 15.7893 3.58579 15.4142C3.21071 15.0391 3 14.5304 3 14V6C3 5.46957 3.21071 4.96086 3.58579 4.58579C3.96086 4.21071 4.46957 4 5 4H19C19.5304 4 20.0391 4.21071 20.4142 4.58579C20.7893 4.96086 21 5.46957 21 6V14C21 14.5304 20.7893 15.0391 20.4142 15.4142C20.0391 15.7893 19.5304 16 19 16H14L9 21V16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className={styles.actionTitle}>
                  {t("messagesAction.title")}
                </h3>
                <p className={styles.actionDescription}>
                  {t("messagesAction.description")}
                </p>
              </Link>

              <Link href="/coaches" className={styles.actionCard}>
                <div className={styles.actionIconWrapper}>
                  <svg className={styles.actionIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className={styles.actionTitle}>
                  {t("browseCoachesAction.title")}
                </h3>
                <p className={styles.actionDescription}>
                  {t("browseCoachesAction.description")}
                </p>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </ProtectedRoute>
  );
}
