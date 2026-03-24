'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Button from '@/components/ui/Button';
import { MediaGallery, StatusBadge, LoadingIndicator } from '@/components';
import toast from '@/lib/toast';
import styles from './page.module.css';

interface Media {
  id: number;
  url: string;
  type: 'IMAGE' | 'VIDEO' | 'CERTIFICATE';
  description: string | null;
}

interface Coach {
  id: number;
  userId: string;
  bio: string | null;
  discipline: string;
  portfolio: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
    createdAt: string;
  };
  media: Media[];
  chats: Array<{
    id: number;
    client: {
      user: {
        id: string;
        name: string | null;
        email: string;
      };
    };
  }>;
}

export default function AdminCoachReviewPage() {
  const params = useParams();
  const tCommon = useTranslations('common');
  const [coach, setCoach] = useState<Coach | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState('');

  const userId = params?.userId as string;

  useEffect(() => {
    if (!userId) return;
    
    const fetchCoach = async () => {
      try {
        const response = await fetch(`/api/admin/coaches/${userId}`, {
          credentials: 'include'
        });
        const data = await response.json();

        if (data.success) {
          setCoach(data.coach);
        } else {
          toast.error('Failed to fetch coach');
        }
      } catch (error) {
        console.error('Error fetching coach:', error);
        toast.error('Failed to fetch coach');
      } finally {
        setLoading(false);
      }
    };

    fetchCoach();
  }, [userId]);

  const handleStatusUpdate = async (status: 'APPROVED' | 'REJECTED' | 'PENDING') => {
    if (submitting) return;

    const messages = {
      APPROVED: 'Are you sure you want to approve this coach application?',
      REJECTED: 'Are you sure you want to reject this coach application?',
      PENDING: 'Are you sure you want to set this application back to pending?',
    };

    if (!confirm(messages[status])) return;

    setSubmitting(true);

    try {
      const response = await fetch(`/api/admin/coaches/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status, reason: reason || undefined }),
      });

      const data = await response.json();

      if (data.success) {
        const statusText = status.charAt(0) + status.slice(1).toLowerCase();
        toast.success(`Coach application ${statusText} successfully!`);
        setCoach(data.coach);
        setReason('');
      } else {
        toast.error('Failed to update coach status. Please try again.');
      }
    } catch (error) {
      console.error('Error updating coach status:', error);
      toast.error('Failed to update coach status. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <div className={styles.container}>
          <div className={styles.loading}>
            <LoadingIndicator label={tCommon('loading')} unstyledLabel />
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!coach) {
    return (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <div className={styles.container}>
          <div className={styles.error}>
            <h2>Coach Not Found</h2>
            <p>This coach profile does not exist.</p>
            <Link href="/admin/dashboard">
              <Button variant="primary">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const certificates = coach.media.filter((m) => m.type === 'CERTIFICATE');
  const images = coach.media.filter((m) => m.type === 'IMAGE');
  const videos = coach.media.filter((m) => m.type === 'VIDEO');
  const mediaItems = [...videos, ...images].map((m) => ({
    id: String(m.id),
    type: (m.type === 'VIDEO' ? 'video' : 'image') as 'video' | 'image',
    url: m.url,
    caption: m.description || undefined,
  }));

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <Link href="/admin/dashboard" className={styles.backButton}>
              ← Back to Dashboard
            </Link>
            <h1 className={styles.headerTitle}>Review Coach Application</h1>
            <StatusBadge status={coach.status} />
          </div>
        </div>

        <div className={styles.content}>
          {/* Coach Info Card */}
          <section className={styles.section}>
            <div className={styles.infoCard}>
              <div className={styles.infoHeader}>
                <div className={styles.coachAvatar}>
                  {coach.user.avatar ? (
                    <Image
                      src={coach.user.avatar}
                      alt={coach.user.name || 'Coach'}
                      width={80}
                      height={80}
                      style={{ borderRadius: '50%', objectFit: 'cover' }}
                      unoptimized
                    />
                  ) : (
                    coach.user.name?.[0]?.toUpperCase() || 'C'
                  )}
                </div>
                <div className={styles.infoDetails}>
                  <h2 className={styles.coachName}>{coach.user.name || 'Coach'}</h2>
                  <p className={styles.coachEmail}>{coach.user.email}</p>
                  <span className={styles.coachDiscipline}>{coach.discipline}</span>
                </div>
              </div>

              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>User UUID:</span>
                  <span className={styles.infoValue}>{coach.userId}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Registered:</span>
                  <span className={styles.infoValue}>
                    {new Date(coach.user.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Applied:</span>
                  <span className={styles.infoValue}>
                    {new Date(coach.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Active Chats:</span>
                  <span className={styles.infoValue}>{coach.chats.length}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Bio Section */}
          {coach.bio && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Bio</h2>
              <div className={styles.bioCard}>
                <p className={styles.bioText}>{coach.bio}</p>
              </div>
            </section>
          )}

          {/* Portfolio Section */}
          {coach.portfolio && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Portfolio</h2>
              <div className={styles.portfolioCard}>
                <a
                  href={coach.portfolio}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.portfolioLink}
                >
                  {coach.portfolio}
                </a>
              </div>
            </section>
          )}

          {/* Certifications Section */}
          {certificates.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Certifications ({certificates.length})
              </h2>
              <div className={styles.certificateGrid}>
                {certificates.map((cert) => (
                  <div key={cert.id} className={styles.certificateCard}>
                    <div className={styles.certificateIcon}>✓</div>
                    <div className={styles.certificateInfo}>
                      <h3 className={styles.certificateName}>
                        {cert.description || 'Certification'}
                      </h3>
                      <a
                        href={cert.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.certificateLink}
                      >
                        View Certificate
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Media Gallery Section - Using MediaGallery component */}
          {mediaItems.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Media Gallery ({mediaItems.length})</h2>
              <MediaGallery media={mediaItems} />
            </section>
          )}

          {/* Review Actions */}
          <section className={styles.section}>
            <div className={styles.actionsCard}>
              <h2 className={styles.actionsTitle}>Review Decision</h2>

              {coach.status === 'REJECTED' && (
                <div className={styles.reasonInput}>
                  <label htmlFor="reason" className={styles.reasonLabel}>
                    Reason for Rejection (Optional):
                  </label>
                  <textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Provide feedback to the coach..."
                    className={styles.reasonTextarea}
                    rows={4}
                  />
                </div>
              )}

              <div className={styles.actionButtons}>
                {coach.status !== 'APPROVED' && (
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => handleStatusUpdate('APPROVED')}
                    disabled={submitting}
                  >
                    {submitting ? 'Processing...' : 'Approve Application'}
                  </Button>
                )}
                {coach.status !== 'REJECTED' && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => handleStatusUpdate('REJECTED')}
                    disabled={submitting}
                  >
                    {submitting ? 'Processing...' : 'Reject Application'}
                  </Button>
                )}
                {coach.status !== 'PENDING' && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => handleStatusUpdate('PENDING')}
                    disabled={submitting}
                  >
                    {submitting ? 'Processing...' : 'Set to Pending'}
                  </Button>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </ProtectedRoute>
  );
}
