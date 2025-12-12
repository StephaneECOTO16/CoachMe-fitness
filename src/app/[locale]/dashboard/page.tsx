"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Button from "@/components/ui/Button";
import styles from "./page.module.css";

interface Coach {
  id: number;
  userId: number;
  bio: string | null;
  discipline: string;
  portfolio: string | null;
  status: string;
  user: {
    id: number;
    name: string | null;
    email: string;
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
    discipline: string;
    user: {
      id: number;
      name: string | null;
      email: string;
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
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [token]);

  return (
    <ProtectedRoute allowedRoles={["PROSPECT"]}>
      <div className={styles.container}>
        <div className={styles.hero}>
          <div className={styles.heroContent}>
            <h1 className={styles.title}>
              {t("title")}, {user?.name || "User"}! 👋
            </h1>
            <p className={styles.subtitle}>
              Ready to continue your fitness journey?
            </p>
          </div>
        </div>

        <div className={styles.content}>
          {/* Recent Chats Section */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{t("recentChats")}</h2>
              <Link href="/messages">
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </div>

            {loading ? (
              <div className={styles.loading}>Loading...</div>
            ) : chats.length > 0 ? (
              <div className={styles.chatList}>
                {chats.slice(0, 3).map((chat) => (
                  <Link
                    key={chat.id}
                    href={`/messages/${chat.id}`}
                    className={styles.chatCard}
                  >
                    <div className={styles.chatAvatar}>
                      {chat.coach.user.name?.[0]?.toUpperCase() || "C"}
                    </div>
                    <div className={styles.chatInfo}>
                      <h3 className={styles.chatName}>
                        {chat.coach.user.name || "Coach"}
                      </h3>
                      <p className={styles.chatDiscipline}>
                        {chat.coach.discipline}
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
                <p>No active conversations yet. Start by browsing coaches!</p>
                <Link href="/coaches">
                  <Button variant="primary">Find a Coach</Button>
                </Link>
              </div>
            )}
          </section>

          {/* Discover Coaches Section */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{t("browseCoaches")}</h2>
              <Link href="/coaches">
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </div>

            {loading ? (
              <div className={styles.loading}>Loading...</div>
            ) : (
              <div className={styles.coachGrid}>
                {coaches.map((coach) => (
                  <Link
                    key={coach.id}
                    href={`/coaches/${coach.id}`}
                    className={styles.coachCard}
                  >
                    <div className={styles.coachAvatar}>
                      {coach.user.name?.[0]?.toUpperCase() || "C"}
                    </div>
                    <h3 className={styles.coachName}>
                      {coach.user.name || "Coach"}
                    </h3>
                    <p className={styles.coachDiscipline}>{coach.discipline}</p>
                    {coach.bio && (
                      <p className={styles.coachBio}>
                        {coach.bio.length > 80
                          ? `${coach.bio.substring(0, 80)}...`
                          : coach.bio}
                      </p>
                    )}
                    <Button variant="primary" size="sm" fullWidth>
                      View Profile
                    </Button>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Quick Actions */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Quick Actions</h2>
            <div className={styles.quickActions}>
              <Link href="/coaches" className={styles.actionCard}>
                <div className={styles.actionIcon}>🔍</div>
                <h3 className={styles.actionTitle}>Browse Coaches</h3>
                <p className={styles.actionDescription}>
                  Find the perfect coach for your goals
                </p>
              </Link>
              <Link href="/messages" className={styles.actionCard}>
                <div className={styles.actionIcon}>💬</div>
                <h3 className={styles.actionTitle}>Messages</h3>
                <p className={styles.actionDescription}>
                  Chat with your coaches
                </p>
              </Link>
              <Link href="/profile" className={styles.actionCard}>
                <div className={styles.actionIcon}>⚙️</div>
                <h3 className={styles.actionTitle}>My Profile</h3>
                <p className={styles.actionDescription}>
                  Update your fitness goals
                </p>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </ProtectedRoute>
  );
}
