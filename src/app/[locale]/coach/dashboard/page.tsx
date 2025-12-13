"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/routing";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Button from "@/components/ui/Button";
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
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [token]);

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
        <div className={styles.hero}>
          {/* Background Image */}
          <div className={styles.heroBackground}>
            <Image
              src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1740&auto=format&fit=crop"
              alt="Gym Training"
              fill
              className={styles.heroImage}
              priority
            />
            <div className={styles.heroOverlay} />
          </div>

          <div className={styles.heroContent}>
            <h1 className={styles.title}>
              <AnimatedName
                prefix={t("welcomeBackCoach")}
                name={user?.name?.split(" ")[0] || "Coach"}
                suffix="! 👋"
              />
            </h1>
            <p className={styles.subtitle}>{t("subtitle")}</p>
          </div>
        </div>

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

          {/* Stats Cards */}
          <section className={styles.statsSection}>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>👥</div>
                <div className={styles.statInfo}>
                  <h3 className={styles.statValue}>{chats.length}</h3>
                  <p className={styles.statLabel}>{t("stats.activeClients")}</p>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>💬</div>
                <div className={styles.statInfo}>
                  <h3 className={styles.statValue}>{chats.length}</h3>
                  <p className={styles.statLabel}>{t("stats.conversations")}</p>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  {profile?.status === "APPROVED" ? "✓" : "⏳"}
                </div>
                <div className={styles.statInfo}>
                  <div className={styles.statValue}>
                    {getStatusBadge(profile?.status || "PENDING")}
                  </div>
                  <p className={styles.statLabel}>{t("stats.accountStatus")}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Profile Summary */}
          {profile && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>{t("yourProfile")}</h2>
                <Link href="/profile?openModal=true">
                  <Button variant="outline" size="sm">
                    {t("settings")}
                  </Button>
                </Link>
              </div>

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
            </section>
          )}

          {/* Recent Chats Section */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{t("recentConversations")}</h2>
              {chats.length > 0 && (
                <Link href="/messages">
                  <Button variant="outline" size="sm">
                    {t("viewAll")}
                  </Button>
                </Link>
              )}
            </div>

            {loading ? (
              <div className={styles.loading}>{t("loading")}</div>
            ) : chats.length > 0 ? (
              <div className={styles.chatList}>
                {chats.slice(0, 5).map((chat) => (
                  <Link
                    key={chat.id}
                    href={`/messages/${chat.id}`}
                    className={styles.chatCard}
                  >
                    <div className={styles.chatAvatar}>
                      {chat.client.user.name?.[0]?.toUpperCase() || "C"}
                    </div>
                    <div className={styles.chatInfo}>
                      <h3 className={styles.chatName}>
                        {chat.client.user.name || "Client"}
                      </h3>
                      <p className={styles.chatEmail}>
                        {chat.client.user.email}
                      </p>
                    </div>
                    <div className={styles.chatMeta}>
                      <span className={styles.chatTime}>
                        {new Date(chat.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>💬</div>
                <h3 className={styles.emptyTitle}>{t("noConversations")}</h3>
                <p className={styles.emptyText}>
                  {profile?.status === "APPROVED"
                    ? t("noConversationsApproved")
                    : t("noConversationsPending")}
                </p>
              </div>
            )}
          </section>

          {/* Quick Actions */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t("quickActions")}</h2>
            <div className={styles.quickActions}>
              <Link href="/profile?openModal=true" className={styles.actionCard}>
                <div className={styles.actionIcon}>👤</div>
                <h3 className={styles.actionTitle}>
                  {t("editProfileAction.title")}
                </h3>
                <p className={styles.actionDescription}>
                  {t("editProfileAction.description")}
                </p>
              </Link>

              <Link href="/messages" className={styles.actionCard}>
                <div className={styles.actionIcon}>💬</div>
                <h3 className={styles.actionTitle}>
                  {t("messagesAction.title")}
                </h3>
                <p className={styles.actionDescription}>
                  {t("messagesAction.description")}
                </p>
              </Link>

              <Link href="/coaches" className={styles.actionCard}>
                <div className={styles.actionIcon}>🔍</div>
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
