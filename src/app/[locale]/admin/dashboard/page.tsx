'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Button from '@/components/ui/Button';
import styles from './page.module.css';

interface Stats {
  totalUsers: number;
  totalProspects: number;
  totalCoaches: number;
  totalAdmins: number;
  pendingCoaches: number;
  approvedCoaches: number;
  rejectedCoaches: number;
  totalChats: number;
  totalMessages: number;
}

interface PendingCoach {
  id: number;
  userId: number;
  bio: string | null;
  discipline: string;
  portfolio: string | null;
  status: string;
  createdAt: string;
  user: {
    id: number;
    name: string | null;
    email: string;
    createdAt: string;
  };
}

export default function AdminDashboard() {
  const t = useTranslations('admin.dashboard');
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [pendingCoaches, setPendingCoaches] = useState<PendingCoach[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token');

        // Fetch stats
        const statsRes = await fetch('/api/admin/stats', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const statsData = await statsRes.json();
        if (statsData.success) {
          setStats(statsData.stats);
        }

        // Fetch pending coaches
        const coachesRes = await fetch('/api/admin/coaches?status=PENDING', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const coachesData = await coachesRes.json();
        if (coachesData.success) {
          setPendingCoaches(coachesData.coaches);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className={styles.container}>
        {/* Hero Section */}
        <div className={styles.hero}>
          <div className={styles.heroContent}>
            <h1 className={styles.title}>
              Admin Dashboard 🛡️
            </h1>
            <p className={styles.subtitle}>
              Welcome back, {user?.name || 'Admin'}! Manage users, review coaches, and monitor platform activity.
            </p>
          </div>
        </div>

        <div className={styles.content}>
          {loading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Loading dashboard...</p>
            </div>
          ) : (
            <>
              {/* Stats Overview */}
              <section className={styles.statsSection}>
                <h2 className={styles.sectionTitle}>Platform Statistics</h2>
                <div className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <div className={styles.statIcon}>👥</div>
                    <div className={styles.statInfo}>
                      <h3 className={styles.statValue}>{stats?.totalUsers || 0}</h3>
                      <p className={styles.statLabel}>Total Users</p>
                    </div>
                  </div>

                  <div className={styles.statCard}>
                    <div className={styles.statIcon}>🏃</div>
                    <div className={styles.statInfo}>
                      <h3 className={styles.statValue}>{stats?.totalProspects || 0}</h3>
                      <p className={styles.statLabel}>Prospects</p>
                    </div>
                  </div>

                  <div className={styles.statCard}>
                    <div className={styles.statIcon}>💪</div>
                    <div className={styles.statInfo}>
                      <h3 className={styles.statValue}>{stats?.totalCoaches || 0}</h3>
                      <p className={styles.statLabel}>Total Coaches</p>
                    </div>
                  </div>

                  <div className={styles.statCard}>
                    <div className={styles.statIcon}>✓</div>
                    <div className={styles.statInfo}>
                      <h3 className={styles.statValue}>{stats?.approvedCoaches || 0}</h3>
                      <p className={styles.statLabel}>Approved Coaches</p>
                    </div>
                  </div>

                  <div className={styles.statCard}>
                    <div className={styles.statIcon}>⏳</div>
                    <div className={styles.statInfo}>
                      <h3 className={styles.statValue}>{stats?.pendingCoaches || 0}</h3>
                      <p className={styles.statLabel}>Pending Reviews</p>
                    </div>
                  </div>

                  <div className={styles.statCard}>
                    <div className={styles.statIcon}>💬</div>
                    <div className={styles.statInfo}>
                      <h3 className={styles.statValue}>{stats?.totalChats || 0}</h3>
                      <p className={styles.statLabel}>Active Chats</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Pending Coach Applications */}
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>
                    Pending Coach Applications ({pendingCoaches.length})
                  </h2>
                  <Link href="/admin/coaches">
                    <Button variant="outline" size="sm">
                      View All Coaches
                    </Button>
                  </Link>
                </div>

                {pendingCoaches.length > 0 ? (
                  <div className={styles.coachList}>
                    {pendingCoaches.map((coach) => (
                      <div key={coach.id} className={styles.coachCard}>
                        <div className={styles.coachHeader}>
                          <div className={styles.coachAvatar}>
                            {coach.user.name?.[0]?.toUpperCase() || 'C'}
                          </div>
                          <div className={styles.coachInfo}>
                            <h3 className={styles.coachName}>{coach.user.name || 'Coach'}</h3>
                            <p className={styles.coachEmail}>{coach.user.email}</p>
                            <span className={styles.coachDiscipline}>{coach.discipline}</span>
                          </div>
                          <div className={styles.coachMeta}>
                            <span className={styles.coachDate}>
                              Applied {new Date(coach.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {coach.bio && (
                          <div className={styles.coachBio}>
                            <p className={styles.bioText}>
                              {coach.bio.length > 200
                                ? `${coach.bio.substring(0, 200)}...`
                                : coach.bio}
                            </p>
                          </div>
                        )}

                        {coach.portfolio && (
                          <div className={styles.coachPortfolio}>
                            <strong>Portfolio:</strong>{' '}
                            <a
                              href={coach.portfolio}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.portfolioLink}
                            >
                              {coach.portfolio}
                            </a>
                          </div>
                        )}

                        <div className={styles.coachActions}>
                          <Link href={`/admin/coaches/${coach.id}`}>
                            <Button variant="primary" size="sm">
                              Review Application
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>✓</div>
                    <h3 className={styles.emptyTitle}>All Caught Up!</h3>
                    <p className={styles.emptyText}>
                      There are no pending coach applications to review at this time.
                    </p>
                  </div>
                )}
              </section>

              {/* Quick Actions */}
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Quick Actions</h2>
                <div className={styles.quickActions}>
                  <Link href="/admin/coaches" className={styles.actionCard}>
                    <div className={styles.actionIcon}>👥</div>
                    <h3 className={styles.actionTitle}>Manage Coaches</h3>
                    <p className={styles.actionDescription}>
                      Review, approve, or reject coach applications
                    </p>
                  </Link>

                  <Link href="/admin/users" className={styles.actionCard}>
                    <div className={styles.actionIcon}>🔍</div>
                    <h3 className={styles.actionTitle}>View All Users</h3>
                    <p className={styles.actionDescription}>
                      Browse and manage all platform users
                    </p>
                  </Link>

                  <Link href="/admin/reports" className={styles.actionCard}>
                    <div className={styles.actionIcon}>📊</div>
                    <h3 className={styles.actionTitle}>View Reports</h3>
                    <p className={styles.actionDescription}>
                      Access detailed platform analytics
                    </p>
                  </Link>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
