'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { DISCIPLINES } from '@/lib/schemas';
import styles from './page.module.css';

// Schema for editing user profile
const EditProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

// Schema for editing coach-specific fields
const EditCoachSchema = z.object({
  discipline: z.string().min(1, 'Discipline is required'),
  bio: z.string().optional(),
  portfolio: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
});

// Schema for editing client-specific fields
const EditClientSchema = z.object({
  ageRange: z.string().optional(),
  heightCm: z.number().positive().optional().or(z.nan()),
  weightKg: z.number().positive().optional().or(z.nan()),
  goals: z.string().optional(),
});

interface ProfileData {
  user: {
    id: number;
    name: string | null;
    email: string;
    role: string;
    createdAt: string;
  };
  profile?: {
    id: number;
    discipline?: string;
    bio?: string | null;
    portfolio?: string | null;
    status?: string;
    ageRange?: string | null;
    heightCm?: number | null;
    weightKg?: number | null;
    goals?: string | null;
  };
}

export default function ProfilePage() {
  const t = useTranslations('profile');
  const { user, token } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const {
    register: registerUser,
    handleSubmit: handleSubmitUser,
    formState: { errors: errorsUser },
    reset: resetUser,
  } = useForm({
    resolver: zodResolver(EditProfileSchema),
  });

  const {
    register: registerCoach,
    handleSubmit: handleSubmitCoach,
    formState: { errors: errorsCoach },
    reset: resetCoach,
  } = useForm({
    resolver: zodResolver(EditCoachSchema),
  });

  const {
    register: registerClient,
    handleSubmit: handleSubmitClient,
    formState: { errors: errorsClient },
    reset: resetClient,
  } = useForm({
    resolver: zodResolver(EditClientSchema),
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) return;

      try {
        const response = await fetch('/api/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await response.json();

        if (data.success) {
          setProfileData(data);
          // Reset forms with current data
          resetUser({ name: data.user.name || '' });
          if (data.user.role === 'COACH' && data.profile) {
            resetCoach({
              discipline: data.profile.discipline || '',
              bio: data.profile.bio || '',
              portfolio: data.profile.portfolio || '',
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
  }, [token, resetUser, resetCoach, resetClient]);

  const onSubmitUser = async (data: any) => {
    setIsEditingProfile(true);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: data.name }),
      });

      const result = await response.json();

      if (result.success) {
        alert('Profile updated successfully!');
        setProfileData(result);
        setIsEditModalOpen(false);
      } else {
        alert('Failed to update profile. Please try again.');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsEditingProfile(false);
    }
  };

  const onSubmitCoach = async (data: any) => {
    setIsEditingProfile(true);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          discipline: data.discipline,
          bio: data.bio || null,
          portfolio: data.portfolio || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert('Coach profile updated successfully!');
        setProfileData(result);
        setIsEditModalOpen(false);
      } else {
        alert('Failed to update profile. Please try again.');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsEditingProfile(false);
    }
  };

  const onSubmitClient = async (data: any) => {
    setIsEditingProfile(true);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ageRange: data.ageRange || null,
          heightCm: data.heightCm || null,
          weightKg: data.weightKg || null,
          goals: data.goals || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert('Profile updated successfully!');
        setProfileData(result);
        setIsEditModalOpen(false);
      } else {
        alert('Failed to update profile. Please try again.');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsEditingProfile(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className={styles.container}>
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading profile...</p>
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
            <h2>Profile Not Found</h2>
            <p>Unable to load your profile data.</p>
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
              {profileData.user.name?.[0]?.toUpperCase() || 'U'}
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
              <h2 className={styles.sectionTitle}>Account Information</h2>
              <Button variant="primary" size="sm" onClick={() => setIsEditModalOpen(true)}>
                Edit Profile
              </Button>
            </div>

            <div className={styles.infoCard}>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Name:</span>
                  <span className={styles.infoValue}>{profileData.user.name || 'Not set'}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Email:</span>
                  <span className={styles.infoValue}>{profileData.user.email}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Role:</span>
                  <span className={styles.infoValue}>{profileData.user.role}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Member Since:</span>
                  <span className={styles.infoValue}>
                    {new Date(profileData.user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Role-Specific Profile Information */}
          {profileData.user.role === 'COACH' && profileData.profile && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Coach Profile</h2>
              <div className={styles.infoCard}>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Discipline:</span>
                    <span className={styles.infoValue}>{profileData.profile.discipline}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Status:</span>
                    <span className={styles.infoValue}>{profileData.profile.status}</span>
                  </div>
                </div>
                {profileData.profile.bio && (
                  <div className={styles.bioSection}>
                    <h3 className={styles.bioTitle}>Bio</h3>
                    <p className={styles.bioText}>{profileData.profile.bio}</p>
                  </div>
                )}
                {profileData.profile.portfolio && (
                  <div className={styles.portfolioSection}>
                    <h3 className={styles.bioTitle}>Portfolio</h3>
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
              </div>
            </section>
          )}

          {profileData.user.role === 'PROSPECT' && profileData.profile && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Fitness Profile</h2>
              <div className={styles.infoCard}>
                <div className={styles.infoGrid}>
                  {profileData.profile.ageRange && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Age Range:</span>
                      <span className={styles.infoValue}>{profileData.profile.ageRange}</span>
                    </div>
                  )}
                  {profileData.profile.heightCm && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Height:</span>
                      <span className={styles.infoValue}>{profileData.profile.heightCm} cm</span>
                    </div>
                  )}
                  {profileData.profile.weightKg && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Weight:</span>
                      <span className={styles.infoValue}>{profileData.profile.weightKg} kg</span>
                    </div>
                  )}
                </div>
                {profileData.profile.goals && (
                  <div className={styles.bioSection}>
                    <h3 className={styles.bioTitle}>Fitness Goals</h3>
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
          title="Edit Profile"
          size="md"
        >
          <div className={styles.modalContent}>
            {/* User Info Form */}
            <form onSubmit={handleSubmitUser(onSubmitUser)} className={styles.form}>
              <h3 className={styles.formTitle}>Basic Information</h3>

              <div className={styles.formGroup}>
                <label htmlFor="name" className={styles.label}>
                  Name
                </label>
                <input
                  {...registerUser('name')}
                  type="text"
                  id="name"
                  className={styles.input}
                  placeholder="Your name"
                />
                {errorsUser.name && (
                  <span className={styles.error}>{errorsUser.name.message as string}</span>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isEditingProfile}
                className={styles.submitButton}
              >
                {isEditingProfile ? 'Saving...' : 'Save Basic Info'}
              </Button>
            </form>

            {/* Coach-specific Form */}
            {profileData.user.role === 'COACH' && (
              <form onSubmit={handleSubmitCoach(onSubmitCoach)} className={styles.form}>
                <h3 className={styles.formTitle}>Coach Profile</h3>

                <div className={styles.formGroup}>
                  <label htmlFor="discipline" className={styles.label}>
                    Discipline
                  </label>
                  <select {...registerCoach('discipline')} id="discipline" className={styles.select}>
                    <option value="">Select discipline</option>
                    {DISCIPLINES.map((disc) => (
                      <option key={disc} value={disc}>
                        {disc}
                      </option>
                    ))}
                  </select>
                  {errorsCoach.discipline && (
                    <span className={styles.error}>{errorsCoach.discipline.message as string}</span>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="bio" className={styles.label}>
                    Bio
                  </label>
                  <textarea
                    {...registerCoach('bio')}
                    id="bio"
                    className={styles.textarea}
                    rows={4}
                    placeholder="Tell clients about yourself..."
                  />
                  {errorsCoach.bio && (
                    <span className={styles.error}>{errorsCoach.bio.message as string}</span>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="portfolio" className={styles.label}>
                    Portfolio URL
                  </label>
                  <input
                    {...registerCoach('portfolio')}
                    type="url"
                    id="portfolio"
                    className={styles.input}
                    placeholder="https://your-portfolio.com"
                  />
                  {errorsCoach.portfolio && (
                    <span className={styles.error}>{errorsCoach.portfolio.message as string}</span>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={isEditingProfile}
                  className={styles.submitButton}
                >
                  {isEditingProfile ? 'Saving...' : 'Save Coach Profile'}
                </Button>
              </form>
            )}

            {/* Client-specific Form */}
            {profileData.user.role === 'PROSPECT' && (
              <form onSubmit={handleSubmitClient(onSubmitClient)} className={styles.form}>
                <h3 className={styles.formTitle}>Fitness Profile</h3>

                <div className={styles.formGroup}>
                  <label htmlFor="ageRange" className={styles.label}>
                    Age Range
                  </label>
                  <select {...registerClient('ageRange')} id="ageRange" className={styles.select}>
                    <option value="">Select age range</option>
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
                      Height (cm)
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
                      Weight (kg)
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
                    Fitness Goals
                  </label>
                  <textarea
                    {...registerClient('goals')}
                    id="goals"
                    className={styles.textarea}
                    rows={4}
                    placeholder="What are your fitness goals?"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={isEditingProfile}
                  className={styles.submitButton}
                >
                  {isEditingProfile ? 'Saving...' : 'Save Fitness Profile'}
                </Button>
              </form>
            )}
          </div>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}
