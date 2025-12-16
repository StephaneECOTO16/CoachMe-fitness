'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Button from '@/components/ui/Button';
import { HeroSection, StatsGrid, DashboardSection, CoachCard, EmptyState } from '@/components';
import toast from '@/lib/toast';
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
        } else {
          toast.error('Failed to load statistics');
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
        } else {
          toast.error('Failed to load pending coaches');
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
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
        <HeroSection
          title="Admin Dashboard"
          subtitle={`Welcome back, ${user?.name || 'Admin'}! Manage users, review coaches, and monitor platform activity.`}
        />

        <div className={styles.content}>
          {loading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Loading dashboard...</p>
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <StatsGrid
                stats={[
                  {
                    icon: '👥',
                    value: stats?.totalUsers?.toString() || '0',
                    label: 'Total Users',
                  },
                  {
                    icon: '🏃',
                    value: stats?.totalProspects?.toString() || '0',
                    label: 'Prospects',
                  },
                  {
                    icon: '💪',
                    value: stats?.totalCoaches?.toString() || '0',
                    label: 'Total Coaches',
                  },
                  {
                    icon: '✓',
                    value: stats?.approvedCoaches?.toString() || '0',
                    label: 'Approved Coaches',
                  },
                  {
                    icon: '⏳',
                    value: stats?.pendingCoaches?.toString() || '0',
                    label: 'Pending Reviews',
                  },
                  {
                    icon: '💬',
                    value: stats?.totalChats?.toString() || '0',
                    label: 'Active Chats',
                  },
                ]}
              />

              {/* Pending Coach Applications */}
              <DashboardSection
                title={`Pending Coach Applications (${pendingCoaches.length})`}
                action={
                  <Link href="/admin/coaches">
                    <Button variant="outline" size="sm">
                      View All Coaches
                    </Button>
                  </Link>
                }
              >
                {pendingCoaches.length > 0 ? (
                  <div className={styles.coachList}>
                    {pendingCoaches.map((coach) => (
                      <CoachCard
                        key={coach.id}
                        id={coach.id}
                        name={coach.user.name || 'Coach'}
                        email={coach.user.email}
                        discipline={coach.discipline}
                        bio={coach.bio}
                        portfolio={coach.portfolio}
                        status={coach.status as 'PENDING' | 'APPROVED' | 'REJECTED'}
                        appliedDate={new Date(coach.createdAt)}
                        variant="admin"
                        href={`/admin/coaches/${coach.id}`}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon="✓"
                    title="All Caught Up!"
                    message="There are no pending coach applications to review at this time."
                  />
                )}
              </DashboardSection>

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
