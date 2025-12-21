'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Button from '@/components/ui/Button';
import { HeroSection, StatsGrid, LoadingIndicator, PendingApprovalsList, DisciplinesList, Modal, UserAvatar, StatusBadge, ChatCard } from '@/components';
import { Users, UserCheck, MessageSquare, Upload, X, Image as ImageIcon } from 'lucide-react';
import toast from '@/lib/toast';
import styles from './page.module.css';
import type { DisciplineStat } from '@/components/admin/DisciplinesList/DisciplinesList';
import { useDropzone } from 'react-dropzone';
import imageCompression from 'browser-image-compression';
import { useRouter } from 'next/navigation';
import { ChatCardData } from '@/components/cards/ChatCard';

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
    avatar: string | null;
    createdAt: string;
  };
}

export default function AdminDashboard() {
  const t = useTranslations('admin.dashboard');
  const tCommon = useTranslations('common');
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [pendingCoaches, setPendingCoaches] = useState<PendingCoach[]>([]);
  const [recentChats, setRecentChats] = useState<ChatCardData[]>([]);
  const [disciplineStats, setDisciplineStats] = useState<DisciplineStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedCoachId, setSelectedCoachId] = useState<number | null>(null);
  const [selectedCoach, setSelectedCoach] = useState<PendingCoach | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Create Discipline State
  const [createDisciplineModalOpen, setCreateDisciplineModalOpen] = useState(false);
  const [newDisciplineName, setNewDisciplineName] = useState('');
  const [newDisciplineImage, setNewDisciplineImage] = useState<{ file: File, preview: string } | null>(null);
  const [isCreatingDiscipline, setIsCreatingDiscipline] = useState(false);

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
        setDisciplineStats(statsData.disciplines || []);
      } else {
        toast.error(t('messages.loadStatsError'));
      }

      // Fetch pending coaches
      const coachesRes = await fetch('/api/admin/coaches?status=PENDING&limit=5', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const coachesData = await coachesRes.json();
      if (coachesData.success) {
        setPendingCoaches(coachesData.coaches);
      } else {
        toast.error(t('messages.loadCoachesError'));
      }

      // Fetch recent chats
      const chatsRes = await fetch('/api/chat?limit=5', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const chatsData = await chatsRes.json();
      if (chatsData.success) {
        setRecentChats(chatsData.chats.map((chat: any) => ({
          id: chat.id,
          participant: chat.coach.user, // Primary: Coach
          secondaryParticipant: chat.client.user, // Secondary: Client
          lastMessage: chat.lastMessage,
          lastUpdate: chat.updatedAt,
          isOnline: false, // You might want to hook this up to a real presence system later
        })));
      } else {
        console.error('Failed to load recent chats');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error(t('messages.loadDashboardError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleChatClick = (chatId: string) => {
    router.push(`/admin/messages?chatId=${chatId}`);
  };

  const handleApprove = async (coachId: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/coaches/${coachId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        toast.success(t('messages.approveSuccess'));
        setPendingCoaches((prev) => prev.filter((c) => c.id !== coachId));
        // Optionally decrement pending stats count locally
        setStats(prev => prev ? { ...prev, pendingCoaches: prev.pendingCoaches - 1, approvedCoaches: prev.approvedCoaches + 1 } : null);
      } else {
        toast.error(t('messages.approveError'));
      }
    } catch (error) {
      console.error('Error approving coach:', error);
      toast.error(t('messages.errorOccurred'));
    }
  };

  const openRejectModal = (coachId: number) => {
    setSelectedCoachId(coachId);
    const coach = pendingCoaches.find(c => c.id === coachId);
    if (coach) setSelectedCoach(coach);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const handleOpenView = (coach: PendingCoach) => {
    setSelectedCoach(coach);
    setIsViewModalOpen(true);
  };

  const handleReject = async () => {
    if (!selectedCoachId || !rejectionReason.trim()) {
      toast.error(t('messages.provideReason'));
      return;
    }

    if (rejectionReason.length < 5) {
      toast.error(t('messages.reasonTooShort'));
      return;
    }

    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/coaches/${selectedCoachId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: rejectionReason }),
      });

      if (res.ok) {
        toast.success(t('messages.rejectSuccess'));
        setPendingCoaches((prev) => prev.filter((c) => c.id !== selectedCoachId));
        // Optionally update stats locally
        setStats(prev => prev ? { ...prev, pendingCoaches: prev.pendingCoaches - 1, rejectedCoaches: prev.rejectedCoaches + 1 } : null);
        setRejectModalOpen(false);
      } else {
        const data = await res.json();
        toast.error(data.error?.message || t('messages.rejectError'));
      }
    } catch (error) {
      console.error('Error rejecting coach:', error);
      toast.error(t('messages.errorOccurred'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Discipline Image Drop
  const onDropDisciplineImage = async (acceptedFiles: File[]) => {
    if (acceptedFiles?.length > 0) {
      const file = acceptedFiles[0];
      // Compress if image
      try {
        const compressed = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1200,
          useWebWorker: true,
        });
        setNewDisciplineImage({
          file: compressed,
          preview: URL.createObjectURL(compressed)
        });
      } catch (error) {
        console.error('Compression failed', error);
        setNewDisciplineImage({
          file,
          preview: URL.createObjectURL(file)
        });
      }
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxFiles: 1,
    onDrop: onDropDisciplineImage,
  });

  const removeDisciplineImage = () => {
    if (newDisciplineImage?.preview) {
      URL.revokeObjectURL(newDisciplineImage.preview);
    }
    setNewDisciplineImage(null);
  };

  const handleCreateDiscipline = async () => {
    if (!newDisciplineName.trim()) {
      toast.error(t('createDiscipline.nameLabel') + ' is required');
      return;
    }
    if (!newDisciplineImage) {
      toast.error(t('createDiscipline.imageLabel') + ' is required');
      return;
    }

    setIsCreatingDiscipline(true);
    try {
      const token = localStorage.getItem('token');

      // 1. Upload Image
      const presignedResponse = await fetch('/api/admin/media/presigned-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fileName: newDisciplineImage.file.name,
          mimeType: newDisciplineImage.file.type,
          fileSize: newDisciplineImage.file.size,
        }),
      });

      const presignedData = await presignedResponse.json();
      if (!presignedData.success) throw new Error('Failed to get upload URL');
      const { url: uploadUrl, key } = presignedData.presignedUrl;

      await fetch(uploadUrl, {
        method: 'PUT',
        body: newDisciplineImage.file,
        headers: { 'Content-Type': newDisciplineImage.file.type }
      });

      // 2. Create Discipline
      const response = await fetch('/api/disciplines/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newDisciplineName,
          imageKey: key,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(t('createDiscipline.success'));
        setCreateDisciplineModalOpen(false);
        setNewDisciplineName('');
        setNewDisciplineImage(null);
        fetchDashboardData();
      } else {
        toast.error(data.error?.message || t('createDiscipline.error'));
      }

    } catch (error) {
      console.error('Create discipline error', error);
      toast.error(t('createDiscipline.error'));
    } finally {
      setIsCreatingDiscipline(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className={styles.container}>
        {/* Hero Section */}
        <HeroSection
          title={t('title')}
          subtitle={t('welcome', { name: user?.name || 'Admin' })}
          backgroundImage="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1740&auto=format&fit=crop"
          overlayOpacity={0.6}
        />

        <div className={styles.content}>
          {loading ? (
            <div className={styles.loading}>
              <LoadingIndicator label={tCommon('loading')} unstyledLabel />
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <StatsGrid
                stats={[
                  {
                    icon: <Users size={24} className="text-blue-500" />,
                    value: stats?.totalUsers?.toString() || '0',
                    label: t('totalUsers'),
                  },
                  {
                    icon: <UserCheck size={24} className="text-orange-500" />,
                    value: stats?.pendingCoaches?.toString() || '0',
                    label: t('pendingReviews'), // Changed from "Pending Coaches" to "Pending Reviews" to match en.json key better or use totalProspects
                  },
                  {
                    icon: <MessageSquare size={24} className="text-green-500" />,
                    value: stats?.totalChats?.toString() || '0',
                    label: t('activeChats'),
                  },
                ]}
              />

              {/* Dashboard Grid */}
              <div className={styles.dashboardGrid}>
                {/* Pending Approvals */}
                <PendingApprovalsList
                  coaches={pendingCoaches}
                  onApprove={handleApprove}
                  onReject={openRejectModal}
                  onView={handleOpenView}
                />

                {/* Disciplines */}
                <DisciplinesList
                  disciplines={disciplineStats}
                  onAddNew={() => setCreateDisciplineModalOpen(true)}
                />

                {/* Recent Chats */}
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>{t('activeChats')}</h2>
                    <Link href="/admin/messages" className={styles.viewAllLink}>
                      {t('viewAllCoaches').replace('Coaches', 'Chats')} {/* Hacky fallback if key missing, ideally add 'viewAllChats' key */}
                    </Link>
                  </div>
                  <div className={styles.chatList}>
                    {recentChats.length > 0 ? (
                      recentChats.map((chat) => (
                        <ChatCard
                          key={chat.id}
                          chat={chat}
                          onClick={() => handleChatClick(chat.id)}
                          locale={user?.language || 'en'}
                        />
                      ))
                    ) : (
                      <div className={styles.emptyState}>
                        <MessageSquare size={48} className="text-gray-300 mb-4" />
                        <p>{tCommon('noData')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Create Discipline Modal */}
              <Modal
                isOpen={createDisciplineModalOpen}
                onClose={() => setCreateDisciplineModalOpen(false)}
                title={t('createDiscipline.title')}
                size="md"
              >
                <div className={styles.createDisciplineForm}>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>
                      {t('createDiscipline.nameLabel')}
                    </label>
                    <input
                      type="text"
                      className={styles.textInput}
                      placeholder={t('createDiscipline.namePlaceholder')}
                      value={newDisciplineName}
                      onChange={(e) => setNewDisciplineName(e.target.value)}
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>
                      {t('createDiscipline.imageLabel')}
                    </label>
                    {newDisciplineImage ? (
                      <div className={styles.previewContainer}>
                        <img
                          src={newDisciplineImage.preview}
                          alt="Preview"
                          className={styles.previewImage}
                        />
                        <button
                          className={styles.removeImageBtn}
                          onClick={removeDisciplineImage}
                          type="button"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div
                        {...getRootProps()}
                        className={`${styles.dropzone} ${isDragActive ? styles.dropzoneActive : ''}`}
                      >
                        <input {...getInputProps()} />
                        <ImageIcon size={32} className="text-gray-400" />
                        <p className={styles.dropzoneText}>
                          {t('createDiscipline.dropzone')}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className={styles.modalFooter}>
                    <Button
                      variant="outline"
                      onClick={() => setCreateDisciplineModalOpen(false)}
                      disabled={isCreatingDiscipline}
                    >
                      {tCommon('cancel')}
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleCreateDiscipline}
                      disabled={isCreatingDiscipline}
                      loading={isCreatingDiscipline}
                    >
                      {t('createDiscipline.submit')}
                    </Button>
                  </div>
                </div>
              </Modal>

              {/* View Coach Modal */}
              <Modal
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                title={t('users.detailsTitle', { role: 'COACH' })}
                size="md"
              >
                {selectedCoach && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <UserAvatar user={selectedCoach.user} size="xl" />
                      <div>
                        <h2 style={{ margin: 0 }}>{selectedCoach.user.name}</h2>
                        <p style={{ color: '#6b7280', margin: 0 }}>{selectedCoach.user.email}</p>
                        <div className="mt-2">
                          <span style={{
                            background: '#eff6ff',
                            color: '#1e40af',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}>
                            COACH
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                      <div>
                        <h4 style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('users.joinedDate')}</h4>
                        <p style={{ margin: 0, fontWeight: 500 }}>{new Date(selectedCoach.createdAt).toLocaleDateString()}</p>
                      </div>

                      <div>
                        <h4 style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('users.specialty')}</h4>
                        <p style={{ margin: 0, fontWeight: 500 }}>{selectedCoach.discipline || t('users.notSpecified')}</p>
                      </div>
                      <div>
                        <h4 style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('users.status')}</h4>
                        <StatusBadge status={selectedCoach.status || 'PENDING'} />
                      </div>
                      <div>
                        <h4 style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('users.portfolio')}</h4>
                        <p style={{ margin: 0, fontWeight: 500 }}>
                          {selectedCoach.portfolio ? (
                            <a href={selectedCoach.portfolio} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
                              View Portfolio
                            </a>
                          ) : t('users.notSpecified')}
                        </p>
                      </div>
                    </div>

                    <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '12px' }}>
                      <h4 style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('users.bio')}</h4>
                      <p style={{ margin: 0, lineHeight: 1.6 }}>{selectedCoach.bio || 'No bio provided.'}</p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                      <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>{tCommon('close')}</Button>
                    </div>
                  </div>
                )}
              </Modal>

              {/* Reject Modal */}
              <Modal
                isOpen={rejectModalOpen}
                onClose={() => setRejectModalOpen(false)}
                title={t('rejectModal.title')}
                size="md"
              >
                <div className={styles.modalContent}>
                  <p className={styles.modalDescription}>
                    {t('rejectModal.description')}
                  </p>
                  <textarea
                    className={styles.textarea}
                    rows={4}
                    placeholder={t('rejectModal.placeholder')}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                  <div className={styles.modalActions}>
                    <Button
                      variant="outline"
                      onClick={() => setRejectModalOpen(false)}
                      disabled={isProcessing}
                    >
                      {tCommon('cancel')}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={handleReject}
                      disabled={isProcessing}
                      loading={isProcessing}
                    >
                      {t('rejectModal.confirm')}
                    </Button>
                  </div>
                </div>
              </Modal>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
