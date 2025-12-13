"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Button from "@/components/ui/Button";
import { AnimatedName } from "@/components/ui/animated-name";
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

export default function CoachDashboard() {
  const t = useTranslations("coachDashboard");
  const { user, token } = useAuth();
  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

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
        const profileData = await profileRes.json();
        if (profileData.success && profileData.profile) {
          setProfile(profileData.profile);
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
          {/* Approval Status Alert */}
          {profile && profile.status !== "APPROVED" && (
            <div className={styles.alertSection}>
              {profile.status === "PENDING" && (
                <div className={styles.alertPending}>
                  <div className={styles.alertIcon}>⏳</div>
                  <div className={styles.alertContent}>
                    <h3 className={styles.alertTitle}>
                      Account Pending Approval
                    </h3>
                    <p className={styles.alertText}>
                      Your coach application is currently under review. You'll
                      be notified once an admin approves your profile. In the
                      meantime, you can update your profile information and
                      prepare for your coaching journey!
                    </p>
                  </div>
                </div>
              )}
              {profile.status === "REJECTED" && (
                <div className={styles.alertRejected}>
                  <div className={styles.alertIcon}>✗</div>
                  <div className={styles.alertContent}>
                    <h3 className={styles.alertTitle}>
                      Application Not Approved
                    </h3>
                    <p className={styles.alertText}>
                      Unfortunately, your coach application was not approved.
                      Please contact support for more information or to resubmit
                      your application with updated credentials.
                    </p>
                    <Link href="/contact">
                      <Button variant="outline" size="sm">
                        Contact Support
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
                  <p className={styles.statLabel}>Active Clients</p>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>💬</div>
                <div className={styles.statInfo}>
                  <h3 className={styles.statValue}>{chats.length}</h3>
                  <p className={styles.statLabel}>Conversations</p>
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
                  <p className={styles.statLabel}>Account Status</p>
                </div>
              </div>
            </div>
          </section>

          {/* Profile Summary */}
          {profile && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Your Profile</h2>
                <Link href="/profile">
                  <Button variant="outline" size="sm">
                    Edit Profile
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
                    <h4 className={styles.bioTitle}>Bio</h4>
                    <p className={styles.bioText}>{profile.bio}</p>
                  </div>
                )}

                {profile.portfolio && (
                  <div className={styles.profilePortfolio}>
                    <h4 className={styles.bioTitle}>Portfolio</h4>
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
              </div>
            </section>
          )}

          {/* Recent Chats Section */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Recent Conversations</h2>
              {chats.length > 0 && (
                <Link href="/messages">
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </Link>
              )}
            </div>

            {loading ? (
              <div className={styles.loading}>Loading...</div>
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
                <h3 className={styles.emptyTitle}>No Active Conversations</h3>
                <p className={styles.emptyText}>
                  {profile?.status === "APPROVED"
                    ? "You don't have any active conversations yet. Clients will be able to contact you once they find your profile."
                    : "Once your profile is approved, clients will be able to find and contact you."}
                </p>
              </div>
            )}
          </section>

          {/* Quick Actions */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Quick Actions</h2>
            <div className={styles.quickActions}>
              <Link href="/profile" className={styles.actionCard}>
                <div className={styles.actionIcon}>👤</div>
                <h3 className={styles.actionTitle}>Edit Profile</h3>
                <p className={styles.actionDescription}>
                  Update your bio, credentials, and portfolio
                </p>
              </Link>

              <Link href="/messages" className={styles.actionCard}>
                <div className={styles.actionIcon}>💬</div>
                <h3 className={styles.actionTitle}>Messages</h3>
                <p className={styles.actionDescription}>
                  View and respond to client messages
                </p>
              </Link>

              <Link href="/coaches" className={styles.actionCard}>
                <div className={styles.actionIcon}>🔍</div>
                <h3 className={styles.actionTitle}>Browse Coaches</h3>
                <p className={styles.actionDescription}>
                  See how other coaches present themselves
                </p>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </ProtectedRoute>
  );
}
