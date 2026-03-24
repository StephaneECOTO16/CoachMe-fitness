'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { User, ImageIcon, Settings, Upload, X } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import MediaUploadTab from '@/components/profile/MediaUploadTab';
import { TabNavigation, LoadingIndicator } from '@/components';
import styles from './page.module.css';

interface Discipline {
  id: number;
  name: string;
  imageUrl?: string;
}

// Schema factories for localized validation
const createEditProfileSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(2, t('validation.nameMinLength')),
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/, t('validation.invalidPhone')).or(z.literal('')).optional().nullable(),
});

const createEditCoachSchema = (t: (key: string) => string) => z.object({
  discipline: z.string().min(1, t('validation.disciplineRequired')),
  bio: z.string().optional(),
  portfolio: z.string().url(t('validation.invalidUrl')).or(z.literal('')).optional(),
  rateType: z.enum(['HOUR', 'WEEK', 'MONTH']).optional(),
  rateAmount: z.number().positive(t('validation.ratePositive')).optional().or(z.nan()),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  experienceYears: z.number().int().min(0, t('validation.experienceNonNegative')).optional().or(z.nan()),
  instagram: z.string().url(t('validation.invalidUrl')).or(z.literal('')).optional(),
  facebook: z.string().url(t('validation.invalidUrl')).or(z.literal('')).optional(),
  tiktok: z.string().url(t('validation.invalidUrl')).or(z.literal('')).optional(),
  twitter: z.string().url(t('validation.invalidUrl')).or(z.literal('')).optional(),
  youtube: z.string().url(t('validation.invalidUrl')).or(z.literal('')).optional(),
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const createEditClientSchema = (_t: (key: string) => string) => z.object({
  ageRange: z.string().optional(),
  heightCm: z.number().positive().optional().or(z.nan()),
  weightKg: z.number().positive().optional().or(z.nan()),
  goals: z.string().optional(),
});

interface ProfileData {
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    role: string;
    createdAt: string;
    avatar?: string | null;
  };
  profile?: {
    id: number;
    discipline?: string | Discipline;
    bio?: string | null;
    portfolio?: string | null;
    status?: string;
    rateAmount?: number | string | null;
    rateType?: 'HOUR' | 'WEEK' | 'MONTH';
    address?: string | null;
    city?: string | null;
    country?: string | null;
    experienceYears?: number | null;
    instagram?: string | null;
    facebook?: string | null;
    tiktok?: string | null;
    twitter?: string | null;
    youtube?: string | null;
    ageRange?: string | null;
    heightCm?: number | null;
    weightKg?: number | null;
    goals?: string | null;
  };
}

export default function ProfilePage() {
  const t = useTranslations('profile');
  const tToast = useTranslations('toast');
  const tCommon = useTranslations('common');
  const { login, isAuthenticated } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDisciplines, setLoadingDisciplines] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'media' | 'account'>('profile');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const getDisciplineName = (discipline: unknown): string => {
    if (!discipline) return '';
    if (typeof discipline === 'string') return discipline;
    if (typeof discipline === 'object' && 'name' in discipline) {
      const name = (discipline as { name?: unknown }).name;
      return typeof name === 'string' ? name : '';
    }
    return '';
  };

  const getRateLabel = (rateType?: 'HOUR' | 'WEEK' | 'MONTH') => {
    if (rateType === 'WEEK') return t('perWeek');
    if (rateType === 'MONTH') return t('perMonth');
    return t('perHour');
  };

  const {
    register: registerUser,
    handleSubmit: handleSubmitUser,
    formState: { errors: errorsUser },
    reset: resetUser,
  } = useForm({
    resolver: zodResolver(createEditProfileSchema(t)),
  });

  const {
    register: registerCoach,
    handleSubmit: handleSubmitCoach,
    formState: { errors: errorsCoach },
    reset: resetCoach,
  } = useForm({
    resolver: zodResolver(createEditCoachSchema(t)),
  });

  const {
    register: registerClient,
    handleSubmit: handleSubmitClient,
    formState: { errors: _errorsClient },
    reset: resetClient,
  } = useForm({
    resolver: zodResolver(createEditClientSchema(t)),
  });

  // Check if modal should be opened from query parameter
  useEffect(() => {
    const openModal = searchParams.get('openModal');
    if (openModal === 'true') {
      setIsEditModalOpen(true);
      // Remove the query parameter from URL
      router.replace('/profile');
    }
  }, [searchParams, router]);

  // Fetch disciplines
  useEffect(() => {
    const fetchDisciplines = async () => {
      try {
        const response = await fetch("/api/disciplines");
        const result = await response.json();
        if (result.success) {
          setDisciplines(result.disciplines);
        }
      } catch (error) {
        console.error("Error fetching disciplines:", error);
      } finally {
        setLoadingDisciplines(false);
      }
    };

    fetchDisciplines();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!isAuthenticated) return;

      try {
        const response = await fetch('/api/profile', {
          credentials: 'include',
        });
        const data = await response.json();

        if (data.success) {
          setProfileData(data);
          // Reset forms with current data
          resetUser({ 
            name: data.user.name || '',
            phone: data.user.phone || '',
          });
          if (data.user.role === 'COACH' && data.profile) {
            resetCoach({
              discipline: getDisciplineName(data.profile.discipline),
              bio: data.profile.bio || '',
              portfolio: data.profile.portfolio || '',
              rateType: data.profile.rateType || 'HOUR',
              rateAmount: data.profile.rateAmount || undefined,
              address: data.profile.address || '',
              city: data.profile.city || '',
              country: data.profile.country || '',
              experienceYears: data.profile.experienceYears || undefined,
              instagram: data.profile.instagram || '',
              facebook: data.profile.facebook || '',
              tiktok: data.profile.tiktok || '',
              twitter: data.profile.twitter || '',
              youtube: data.profile.youtube || '',
            });
          } else if (data.user.role === 'PROSPECT' && data.profile) {
            resetClient({
              ageRange: data.profile.ageRange || '',
              heightCm: data.profile.heightCm || undefined,
              weightKg: data.profile.weightKg || undefined,
              goals: data.profile.goals || '',
            });
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [isAuthenticated, resetUser, resetCoach, resetClient]);

  const compressAvatar = async (file: File): Promise<File> => {
    if (!file.type.startsWith('image/')) return file;
    try {
      return await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 512,
        useWebWorker: true,
      });
    } catch (error) {
      console.error('Avatar compression failed:', error);
      return file;
    }
  };

  const updateAvatar = async (avatarValue: string | null) => {
    const response = await fetch('/api/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ avatar: avatarValue }),
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error?.message || 'Failed to update avatar');

    setProfileData(result);
    if (result.success) login();
  };

  const uploadAvatarFile = async (file: File) => {
    setIsUploadingAvatar(true);
    try {
      const processed = await compressAvatar(file);

      const presignedResponse = await fetch('/api/user/avatar/presigned-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          fileName: processed.name,
          mimeType: processed.type,
          fileSize: processed.size,
        }),
      });

      const presignedData = await presignedResponse.json();
      if (!presignedData.success) {
        throw new Error(presignedData.error?.message || 'Failed to get upload URL');
      }

      const { uploadUrl, key } = presignedData.presignedUrl as { uploadUrl: string; key: string };

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': processed.type },
        body: processed,
      });

      if (!uploadRes.ok) {
        throw new Error(`Upload failed with status ${uploadRes.status}`);
      }

      await updateAvatar(key);
      toast.success(tToast('success.profileUpdated'));
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error(tToast('error.profileUpdateFailed'));
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {

    setIsUploadingAvatar(true);
    try {
      await updateAvatar(null);
      toast.success(tToast('success.profileUpdated'));
    } catch (error) {
      console.error('Avatar remove error:', error);
      toast.error(tToast('error.profileUpdateFailed'));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Dropzone for avatar
  const avatarDropzone = useDropzone({
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxSize: 5 * 1024 * 1024, // 5MB
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        await uploadAvatarFile(acceptedFiles[0]);
      }
    },
    disabled: isUploadingAvatar,
  });

  const onSubmitUser = async (data: { name: string; phone?: string | null }) => {
    setIsEditingProfile(true);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          name: data.name,
          phone: data.phone || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(tToast('success.profileUpdated'));
        setProfileData(result);
        if (result.success) {
          login();
        }
        setIsEditModalOpen(false);
      } else {
        toast.error(tToast('error.profileUpdateFailed'));
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(tToast('error.profileUpdateFailed'));
    } finally {
      setIsEditingProfile(false);
    }
  };

  const onSubmitCoach = async (data: { discipline: string; bio?: string; portfolio?: string; rateType?: string; rateAmount?: number; address?: string; city?: string; country?: string; experienceYears?: number; instagram?: string; facebook?: string; tiktok?: string; twitter?: string; youtube?: string }) => {
    setIsEditingProfile(true);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          discipline: data.discipline,
          bio: data.bio || null,
          portfolio: data.portfolio || null,
          rateType: data.rateType || 'HOUR',
          rateAmount: data.rateAmount || null,
          address: data.address || null,
          city: data.city || null,
          country: data.country || null,
          experienceYears: data.experienceYears || null,
          instagram: data.instagram || null,
          facebook: data.facebook || null,
          tiktok: data.tiktok || null,
          twitter: data.twitter || null,
          youtube: data.youtube || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(tToast('success.coachProfileUpdated'));
        setProfileData(result);
        login();
        setIsEditModalOpen(false);
      } else {
        toast.error(tToast('error.profileUpdateFailed'));
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(tToast('error.profileUpdateFailed'));
    } finally {
      setIsEditingProfile(false);
    }
  };

  const onSubmitClient = async (data: { ageRange?: string; heightCm?: number; weightKg?: number; goals?: string }) => {
    setIsEditingProfile(true);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ageRange: data.ageRange || null,
          heightCm: data.heightCm || null,
          weightKg: data.weightKg || null,
          goals: data.goals || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(tToast('success.profileUpdated'));
        setProfileData(result);
        login();
        setIsEditModalOpen(false);
      } else {
        toast.error(tToast('error.profileUpdateFailed'));
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(tToast('error.profileUpdateFailed'));
    } finally {
      setIsEditingProfile(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className={styles.container}>
          <div className={styles.loading}>
            <LoadingIndicator label={tCommon('loading')} unstyledLabel />
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!profileData) {
    return (
      <ProtectedRoute>
        <div className={styles.container}>
          <div className={styles.error}>
            <h2>{t('notFound.title')}</h2>
            <p>{t('notFound.message')}</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className={styles.container}>
        {/* Hero Section */}
        <div className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.heroAvatar}>
              {profileData.user.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profileData.user.avatar}
                  alt={profileData.user.name || 'User'}
                  className={styles.heroAvatarImage}
                />
              ) : (
                profileData.user.name?.[0]?.toUpperCase() || 'U'
              )}
            </div>
            <h1 className={styles.title}>{profileData.user.name || 'User'}</h1>
            <p className={styles.subtitle}>{profileData.user.email}</p>
            <span className={styles.roleBadge}>{profileData.user.role}</span>
          </div>
        </div>

        <div className={styles.content}>
          {/* User Information Card */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{t("labels.accountInfo")}</h2>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsEditModalOpen(true)}
              >
                {t("labels.editProfile")}
              </Button>
            </div>

            <div className={styles.infoCard}>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>{t("labels.name")}:</span>
                  <span className={styles.infoValue}>
                    {profileData.user.name || "Not set"}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>{t("labels.email")}:</span>
                  <span className={styles.infoValue}>{profileData.user.email}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>{t("labels.phone")}:</span>
                  <span className={styles.infoValue}>
                    {profileData.user.phone || t("notSet")}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>{t("labels.role")}:</span>
                  <span className={styles.infoValue}>{profileData.user.role}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>{t("labels.memberSince")}:</span>
                  <span className={styles.infoValue}>
                    {new Date(profileData.user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Role-Specific Profile Information */}
          {profileData.user.role === "COACH" && profileData.profile && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{t("labels.coachProfile")}</h2>
              <div className={styles.infoCard}>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>{t("labels.discipline")}:</span>
                    <span className={styles.infoValue}>
                      {getDisciplineName(profileData.profile.discipline) || "Not set"}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>{t("labels.status")}:</span>
                    <span className={styles.infoValue}>
                      {profileData.profile.status}
                    </span>
                  </div>
                  {profileData.profile.rateAmount && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>{t("rate")}:</span>
                      <span className={styles.infoValue}>
                        {new Intl.NumberFormat("fr-FR").format(
                          Number(profileData.profile.rateAmount)
                        )}{" "}
                        XAF {getRateLabel(profileData.profile.rateType)}
                      </span>
                    </div>
                  )}
                  {profileData.profile.experienceYears !== null &&
                    profileData.profile.experienceYears !== undefined && (
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>{t("experience")}:</span>
                        <span className={styles.infoValue}>
                          {profileData.profile.experienceYears} {t("years")}
                        </span>
                      </div>
                    )}
                  {(profileData.profile.city || profileData.profile.country) && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>{t("location")}:</span>
                      <span className={styles.infoValue}>
                        {[profileData.profile.city, profileData.profile.country]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </div>
                  )}
                  {profileData.profile.address && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>{t("address")}:</span>
                      <span className={styles.infoValue}>
                        {profileData.profile.address}
                      </span>
                    </div>
                  )}
                </div>
                {profileData.profile.bio && (
                  <div className={styles.bioSection}>
                    <h3 className={styles.bioTitle}>{t("labels.bio")}</h3>
                    <p className={styles.bioText}>{profileData.profile.bio}</p>
                  </div>
                )}
                {profileData.profile.portfolio && (
                  <div className={styles.portfolioSection}>
                    <h3 className={styles.bioTitle}>{t("labels.portfolio")}</h3>
                    <a
                      href={profileData.profile.portfolio}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.portfolioLink}
                    >
                      {profileData.profile.portfolio}
                    </a>
                  </div>
                )}
                {(profileData.profile.instagram ||
                  profileData.profile.facebook ||
                  profileData.profile.tiktok ||
                  profileData.profile.twitter ||
                  profileData.profile.youtube) && (
                    <div className={styles.bioSection}>
                      <h3 className={styles.bioTitle}>{t("socialMedia")}</h3>
                      <div className={styles.socialLinks}>
                        {profileData.profile.instagram && (
                          <a
                            href={profileData.profile.instagram}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.socialLink}
                          >
                            Instagram
                          </a>
                        )}
                        {profileData.profile.facebook && (
                          <a
                            href={profileData.profile.facebook}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.socialLink}
                          >
                            Facebook
                          </a>
                        )}
                        {profileData.profile.tiktok && (
                          <a
                            href={profileData.profile.tiktok}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.socialLink}
                          >
                            TikTok
                          </a>
                        )}
                        {profileData.profile.twitter && (
                          <a
                            href={profileData.profile.twitter}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.socialLink}
                          >
                            X (Twitter)
                          </a>
                        )}
                        {profileData.profile.youtube && (
                          <a
                            href={profileData.profile.youtube}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.socialLink}
                          >
                            YouTube
                          </a>
                        )}
                      </div>
                    </div>
                  )}
              </div>
            </section>
          )}

          {profileData.user.role === "PROSPECT" && profileData.profile && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{t("labels.sportProfile")}</h2>
              <div className={styles.infoCard}>
                <div className={styles.infoGrid}>
                  {profileData.profile.ageRange && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>{t("labels.ageRange")}:</span>
                      <span className={styles.infoValue}>
                        {profileData.profile.ageRange}
                      </span>
                    </div>
                  )}
                  {profileData.profile.heightCm && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>{t("labels.height")}:</span>
                      <span className={styles.infoValue}>
                        {profileData.profile.heightCm} cm
                      </span>
                    </div>
                  )}
                  {profileData.profile.weightKg && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>{t("labels.weight")}:</span>
                      <span className={styles.infoValue}>
                        {profileData.profile.weightKg} kg
                      </span>
                    </div>
                  )}
                </div>
                {profileData.profile.goals && (
                  <div className={styles.bioSection}>
                    <h3 className={styles.bioTitle}>{t("labels.sportGoals")}</h3>
                    <p className={styles.bioText}>{profileData.profile.goals}</p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Edit Profile Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={t('labels.editProfile')}
          size="lg"
        >
          {/* Tab Navigation */}
          <TabNavigation
            tabs={[
              { id: 'profile', label: t('tabs.profile'), icon: <User size={18} /> },
              ...(profileData?.user.role === 'COACH' ? [{ id: 'media', label: t('tabs.media'), icon: <ImageIcon size={18} /> }] : []),
              { id: 'account', label: t('tabs.account'), icon: <Settings size={18} /> },
            ]}
            activeTab={activeTab}
            onChange={(tabId) => setActiveTab(tabId as 'profile' | 'media' | 'account')}
          />

          <div className={styles.modalContent}>
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <>
                {/* Coach-specific Form */}
                {profileData.user.role === 'COACH' && (
                  <form onSubmit={handleSubmitCoach(onSubmitCoach)} className={styles.form}>
                    <h3 className={styles.formTitle}>{t('labels.coachProfile')}</h3>
                    <div className={styles.formGroup}>
                      <label htmlFor="discipline" className={styles.label}>
                        {t('labels.discipline')}
                      </label>
                      <select {...registerCoach('discipline')} id="discipline" className={styles.select} disabled={loadingDisciplines}>
                        <option value="">
                          {loadingDisciplines ? t('placeholders.loadingDisciplines') : t('placeholders.selectDiscipline')}
                        </option>
                        {disciplines.map((disc) => (
                          <option key={disc.id} value={disc.name}>
                            {disc.name}
                          </option>
                        ))}
                      </select>
                      {errorsCoach.discipline && (
                        <span className={styles.error}>{errorsCoach.discipline.message as string}</span>
                      )}
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="bio" className={styles.label}>
                        {t('labels.bio')}
                      </label>
                      <textarea
                        {...registerCoach('bio')}
                        id="bio"
                        className={styles.textarea}
                        rows={4}
                        placeholder={t('placeholders.bio')}
                      />
                      {errorsCoach.bio && (
                        <span className={styles.error}>{errorsCoach.bio.message as string}</span>
                      )}
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="portfolio" className={styles.label}>
                        {t('labels.portfolio')}
                      </label>
                      <input
                        {...registerCoach('portfolio')}
                        type="url"
                        id="portfolio"
                        className={styles.input}
                        placeholder={t('placeholders.portfolio')}
                      />
                      {errorsCoach.portfolio && (
                        <span className={styles.error}>{errorsCoach.portfolio.message as string}</span>
                      )}
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="rateType" className={styles.label}>
                        {t('editModal.rateTypeLabel')}
                      </label>
                      <select
                        {...registerCoach('rateType')}
                        id="rateType"
                        className={styles.select}
                      >
                        <option value="HOUR">{t('editModal.rateTypeHour')}</option>
                        <option value="WEEK">{t('editModal.rateTypeWeek')}</option>
                        <option value="MONTH">{t('editModal.rateTypeMonth')}</option>
                      </select>
                      {errorsCoach.rateType && (
                        <span className={styles.error}>{errorsCoach.rateType.message as string}</span>
                      )}
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="rateAmount" className={styles.label}>
                        {t('editModal.rateAmountLabel')}
                      </label>
                      <input
                        {...registerCoach('rateAmount', { valueAsNumber: true })}
                        type="number"
                        id="rateAmount"
                        className={styles.input}
                        placeholder={t('editModal.rateAmountPlaceholder')}
                        min="0"
                        step="500"
                      />
                      {errorsCoach.rateAmount && (
                        <span className={styles.error}>{errorsCoach.rateAmount.message as string}</span>
                      )}
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="experienceYears" className={styles.label}>
                        {t('editModal.experienceYearsLabel')}
                      </label>
                      <input
                        {...registerCoach('experienceYears', { valueAsNumber: true })}
                        type="number"
                        id="experienceYears"
                        className={styles.input}
                        placeholder={t('editModal.experienceYearsPlaceholder')}
                        min="0"
                        step="1"
                      />
                      {errorsCoach.experienceYears && (
                        <span className={styles.error}>{errorsCoach.experienceYears.message as string}</span>
                      )}
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="address" className={styles.label}>
                        {t('editModal.addressLabel')}
                      </label>
                      <input
                        {...registerCoach('address')}
                        type="text"
                        id="address"
                        className={styles.input}
                        placeholder={t('editModal.addressPlaceholder')}
                      />
                      {errorsCoach.address && (
                        <span className={styles.error}>{errorsCoach.address.message as string}</span>
                      )}
                    </div>

                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="city" className={styles.label}>
                          {t('editModal.cityLabel')}
                        </label>
                        <input
                          {...registerCoach('city')}
                          type="text"
                          id="city"
                          className={styles.input}
                          placeholder={t('editModal.cityPlaceholder')}
                        />
                        {errorsCoach.city && (
                          <span className={styles.error}>{errorsCoach.city.message as string}</span>
                        )}
                      </div>

                      <div className={styles.formGroup}>
                        <label htmlFor="country" className={styles.label}>
                          {t('editModal.countryLabel')}
                        </label>
                        <input
                          {...registerCoach('country')}
                          type="text"
                          id="country"
                          className={styles.input}
                          placeholder={t('editModal.countryPlaceholder')}
                        />
                        {errorsCoach.country && (
                          <span className={styles.error}>{errorsCoach.country.message as string}</span>
                        )}
                      </div>
                    </div>

                    <h4 className={styles.sectionSubtitle}>{t('editModal.socialMediaTitle')}</h4>

                    <div className={styles.formGroup}>
                      <label htmlFor="instagram" className={styles.label}>
                        {t('editModal.instagramLabel')}
                      </label>
                      <input
                        {...registerCoach('instagram')}
                        type="url"
                        id="instagram"
                        className={styles.input}
                        placeholder={t('editModal.instagramPlaceholder')}
                      />
                      {errorsCoach.instagram && (
                        <span className={styles.error}>{errorsCoach.instagram.message as string}</span>
                      )}
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="facebook" className={styles.label}>
                        {t('editModal.facebookLabel')}
                      </label>
                      <input
                        {...registerCoach('facebook')}
                        type="url"
                        id="facebook"
                        className={styles.input}
                        placeholder={t('editModal.facebookPlaceholder')}
                      />
                      {errorsCoach.facebook && (
                        <span className={styles.error}>{errorsCoach.facebook.message as string}</span>
                      )}
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="tiktok" className={styles.label}>
                        {t('editModal.tiktokLabel')}
                      </label>
                      <input
                        {...registerCoach('tiktok')}
                        type="url"
                        id="tiktok"
                        className={styles.input}
                        placeholder={t('editModal.tiktokPlaceholder')}
                      />
                      {errorsCoach.tiktok && (
                        <span className={styles.error}>{errorsCoach.tiktok.message as string}</span>
                      )}
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="twitter" className={styles.label}>
                        {t('editModal.twitterLabel')}
                      </label>
                      <input
                        {...registerCoach('twitter')}
                        type="url"
                        id="twitter"
                        className={styles.input}
                        placeholder={t('editModal.twitterPlaceholder')}
                      />
                      {errorsCoach.twitter && (
                        <span className={styles.error}>{errorsCoach.twitter.message as string}</span>
                      )}
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="youtube" className={styles.label}>
                        {t('editModal.youtubeLabel')}
                      </label>
                      <input
                        {...registerCoach('youtube')}
                        type="url"
                        id="youtube"
                        className={styles.input}
                        placeholder={t('editModal.youtubePlaceholder')}
                      />
                      {errorsCoach.youtube && (
                        <span className={styles.error}>{errorsCoach.youtube.message as string}</span>
                      )}
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      disabled={isEditingProfile}
                      className={styles.submitButton}
                    >
                      {isEditingProfile ? t('buttons.saving') : t('buttons.saveCoachProfile')}
                    </Button>
                  </form>
                )}

                {/* Client-specific Form */}
                {profileData.user.role === 'PROSPECT' && (
                  <form onSubmit={handleSubmitClient(onSubmitClient)} className={styles.form}>
                    <h3 className={styles.formTitle}>{t('labels.sportProfile')}</h3>

                    <div className={styles.formGroup}>
                      <label htmlFor="ageRange" className={styles.label}>
                        {t('labels.ageRange')}
                      </label>
                      <select {...registerClient('ageRange')} id="ageRange" className={styles.select}>
                        <option value="">{t('placeholders.selectAgeRange')}</option>
                        <option value="18-24">18-24</option>
                        <option value="25-34">25-34</option>
                        <option value="35-44">35-44</option>
                        <option value="45-54">45-54</option>
                        <option value="55+">55+</option>
                      </select>
                    </div>

                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label htmlFor="heightCm" className={styles.label}>
                          {t('labels.height')} (cm)
                        </label>
                        <input
                          {...registerClient('heightCm', { valueAsNumber: true })}
                          type="number"
                          id="heightCm"
                          className={styles.input}
                          placeholder="170"
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label htmlFor="weightKg" className={styles.label}>
                          {t('labels.weight')} (kg)
                        </label>
                        <input
                          {...registerClient('weightKg', { valueAsNumber: true })}
                          type="number"
                          id="weightKg"
                          className={styles.input}
                          placeholder="70"
                        />
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="goals" className={styles.label}>
                        {t('labels.sportGoals')}
                      </label>
                      <textarea
                        {...registerClient('goals')}
                        id="goals"
                        className={styles.textarea}
                        rows={4}
                        placeholder={t('placeholders.goals')}
                      />
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      disabled={isEditingProfile}
                      className={styles.submitButton}
                    >
                      {isEditingProfile ? t('buttons.saving') : t('buttons.saveSportProfile')}
                    </Button>
                  </form>
                )}
              </>
            )}

            {/* Media Tab */}
            {activeTab === 'media' && profileData?.user.role === 'COACH' && (
              <MediaUploadTab />
            )}

            {/* Account Tab */}
            {activeTab === 'account' && (
              <form onSubmit={handleSubmitUser(onSubmitUser)} className={styles.form}>
                <h3 className={styles.formTitle}>{t('labels.basicInfo')}</h3>

                {/* Avatar Upload Section */}
                <div className={styles.avatarUploadSection}>
                  <label className={styles.label}>{t('labels.avatar')}</label>
                  <p className={styles.avatarHint}>
                    {t('placeholders.avatarHint', { defaultValue: 'Upload a profile picture (max 5MB)' })}
                  </p>

                  {profileData.user.avatar ? (
                    <div className={styles.avatarPreviewContainer}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={profileData.user.avatar}
                        alt={profileData.user.name || 'Avatar'}
                        className={styles.avatarPreviewLarge}
                      />
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        disabled={isUploadingAvatar}
                        className={styles.avatarDeleteButton}
                        aria-label="Remove avatar"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  ) : (
                    <div
                      {...avatarDropzone.getRootProps()}
                      className={`${styles.avatarDropzone} ${avatarDropzone.isDragActive ? styles.avatarDropzoneActive : ''
                        } ${isUploadingAvatar ? styles.avatarDropzoneDisabled : ''}`}
                    >
                      <input {...avatarDropzone.getInputProps()} />
                      {isUploadingAvatar ? (
                        <LoadingIndicator size="sm" label={t('buttons.uploading')} />
                      ) : (
                        <>
                          <Upload size={32} />
                          <p>
                            {avatarDropzone.isDragActive
                              ? 'Drop here...'
                              : t('placeholders.avatarDropzone', {
                                defaultValue: 'Drag & drop or click to upload',
                              })}
                          </p>
                          <span className={styles.avatarDropzoneHint}>
                            {t('placeholders.avatarMaxSize', { defaultValue: 'Max 5MB • JPEG, PNG, WebP' })}
                          </span>
                        </>
                      )}
                    </div>
                  )}

                  {profileData.user.avatar && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isUploadingAvatar}
                      onClick={() => avatarDropzone.open()}
                      className={styles.changeAvatarButton}
                    >
                      {isUploadingAvatar ? t('buttons.uploading') : t('buttons.changeAvatar')}
                    </Button>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="name" className={styles.label}>
                    {t('labels.name')}
                  </label>
                  <input
                    {...registerUser('name')}
                    type="text"
                    id="name"
                    className={styles.input}
                    placeholder={t('placeholders.name')}
                  />
                  {errorsUser.name && (
                    <span className={styles.error}>{errorsUser.name.message as string}</span>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="phone" className={styles.label}>
                    {t('labels.phone')}
                  </label>
                  <input
                    {...registerUser('phone')}
                    type="tel"
                    id="phone"
                    className={styles.input}
                    placeholder="+2376XXXXXXXXX"
                  />
                  {errorsUser.phone && (
                    <span className={styles.error}>{errorsUser.phone.message as string}</span>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={isEditingProfile}
                  className={styles.submitButton}
                >
                  {isEditingProfile ? t('buttons.saving') : t('buttons.saveBasicInfo')}
                </Button>
              </form>
            )}
          </div>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}
