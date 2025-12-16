'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import Button from '@/components/ui/Button';
import styles from './CoachCard.module.css';

export interface CoachData {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  avatar?: string;
  discipline?: string;
  bio?: string;
  location?: string;
  experience?: number;
  hourlyRate?: number;
  socialMedia?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    twitter?: string;
    youtube?: string;
  };
  portfolio?: Array<{ type: string; url: string; caption?: string }>;
  certifications?: string[];
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt?: string;
  averageRating?: number;
  totalReviews?: number;
}

export interface CoachCardProps {
  coach: CoachData;
  variant?: 'list' | 'grid' | 'compact' | 'admin';
  onViewProfile?: () => void;
  showSocialLinks?: boolean;
  showBadges?: boolean;
  bioMaxLength?: number;
  locale?: string;
}

const CoachCard: React.FC<CoachCardProps> = ({
  coach,
  variant = 'grid',
  onViewProfile,
  showSocialLinks = true,
  showBadges = true,
  bioMaxLength,
  locale = 'en',
}) => {
  const t = useTranslations('coaches');

  const getAvatarUrl = () => {
    if (coach.avatar) {
      // Just return the avatar URL as-is, like the original implementation
      return coach.avatar;
    }
    return `https://ui-avatars.com/api/?name=${coach.firstName}+${coach.lastName}&background=random`;
  };

  const truncateBio = (bio: string, maxLength?: number) => {
    if (!maxLength) return bio;
    return bio.length > maxLength ? `${bio.substring(0, maxLength)}...` : bio;
  };

  const formatRate = (rate?: number) => {
    return rate ? `$${rate}/hr` : t('rateNotSet');
  };

  const getSocialIcon = (platform: string) => {
    const icons: Record<string, string> = {
      instagram: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z',
      facebook: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
      tiktok: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
      twitter: 'M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z',
      youtube: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
    };
    return icons[platform] || '';
  };

  const renderSocialLinks = () => {
    if (!showSocialLinks || !coach.socialMedia) return null;

    const platforms = Object.entries(coach.socialMedia).filter(([_, url]) => url);
    if (platforms.length === 0) return null;

    return (
      <div className={styles.socialLinks}>
        {platforms.map(([platform, url]) => (
          <a
            key={platform}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.socialLink}
            aria-label={platform}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d={getSocialIcon(platform)} />
            </svg>
          </a>
        ))}
      </div>
    );
  };

  const renderBadges = () => {
    if (!showBadges) return null;

    const badges = [];
    if (coach.certifications && coach.certifications.length > 0) {
      badges.push(
        <span key="certified" className={`${styles.badge} ${styles.badgeCertified}`}>
          {t('certified')}
        </span>
      );
    }
    if (coach.portfolio && coach.portfolio.length > 0) {
      badges.push(
        <span key="portfolio" className={`${styles.badge} ${styles.badgePortfolio}`}>
          {t('hasPortfolio')}
        </span>
      );
    }

    return badges.length > 0 ? <div className={styles.badges}>{badges}</div> : null;
  };

  const renderRating = () => {
    if (!coach.averageRating || !coach.totalReviews) return null;

    return (
      <div className={styles.rating}>
        <span className={styles.stars}>{'★'.repeat(Math.round(coach.averageRating))}</span>
        <span className={styles.ratingText}>
          {coach.averageRating.toFixed(1)} ({coach.totalReviews})
        </span>
      </div>
    );
  };

  // List variant (Browse Coaches page)
  if (variant === 'list') {
    return (
      <div className={`${styles.card} ${styles.cardList}`}>
        <div className={styles.cardHeader}>
          {coach.avatar ? (
            <Image
              src={getAvatarUrl()}
              alt={`${coach.firstName} ${coach.lastName}`}
              width={80}
              height={80}
              className={styles.avatar}
              unoptimized
            />
          ) : (
            <div className={styles.avatarPlaceholder}>
              {coach.firstName[0]?.toUpperCase() || 'C'}
            </div>
          )}
          <div className={styles.headerInfo}>
            <h3 className={styles.name}>
              {coach.firstName} {coach.lastName}
            </h3>
            {coach.discipline && <p className={styles.discipline}>{coach.discipline}</p>}
            {renderRating()}
            {renderBadges()}
          </div>
          <div className={styles.pricing}>
            <span className={styles.rate}>{formatRate(coach.hourlyRate)}</span>
          </div>
        </div>

        {coach.bio && (
          <p className={styles.bio}>{truncateBio(coach.bio, bioMaxLength || 150)}</p>
        )}

        <div className={styles.meta}>
          {coach.location && (
            <div className={styles.metaItem}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>{coach.location}</span>
            </div>
          )}
          {coach.experience && (
            <div className={styles.metaItem}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>
                {coach.experience} {t('yearsExperience')}
              </span>
            </div>
          )}
        </div>

        {renderSocialLinks()}

        <div className={styles.actions}>
          <Button
            variant="primary"
            onClick={onViewProfile}
            as={Link}
            href={`/${locale}/coaches/${coach._id}`}
          >
            {t('viewProfile')}
          </Button>
        </div>
      </div>
    );
  }

  // Grid variant (Dashboards)
  if (variant === 'grid') {
    return (
      <div className={`${styles.card} ${styles.cardGrid}`}>
        {coach.avatar ? (
          <Image
            src={getAvatarUrl()}
            alt={`${coach.firstName} ${coach.lastName}`}
            width={120}
            height={120}
            className={styles.avatar}
            unoptimized
          />
        ) : (
          <div className={styles.avatarPlaceholder}>
            {coach.firstName[0]?.toUpperCase() || 'C'}
          </div>
        )}
        <h3 className={styles.name}>
          {coach.firstName} {coach.lastName}
        </h3>
        {coach.discipline && <p className={styles.discipline}>{coach.discipline}</p>}
        {renderRating()}
        {coach.bio && (
          <p className={styles.bio}>{truncateBio(coach.bio, bioMaxLength || 80)}</p>
        )}
        {renderBadges()}
        <Button
          variant="primary"
          size="sm"
          onClick={onViewProfile}
          as={Link}
          href={`/${locale}/coaches/${coach._id}`}
          fullWidth
        >
          {t('viewProfile')}
        </Button>
      </div>
    );
  }

  // Compact variant (Chat previews)
  if (variant === 'compact') {
    return (
      <div className={`${styles.card} ${styles.cardCompact}`}>
        {coach.avatar ? (
          <Image
            src={getAvatarUrl()}
            alt={`${coach.firstName} ${coach.lastName}`}
            width={40}
            height={40}
            className={styles.avatar}
            unoptimized
          />
        ) : (
          <div className={styles.avatarPlaceholderSmall}>
            {coach.firstName[0]?.toUpperCase() || 'C'}
          </div>
        )}
        <div className={styles.compactInfo}>
          <h4 className={styles.name}>
            {coach.firstName} {coach.lastName}
          </h4>
          {coach.discipline && <p className={styles.discipline}>{coach.discipline}</p>}
        </div>
      </div>
    );
  }

  // Admin variant (Admin Review page)
  if (variant === 'admin') {
    return (
      <div className={`${styles.card} ${styles.cardAdmin}`}>
        <div className={styles.cardHeader}>
          {coach.avatar ? (
            <Image
              src={getAvatarUrl()}
              alt={`${coach.firstName} ${coach.lastName}`}
              width={60}
              height={60}
              className={styles.avatar}
              unoptimized
            />
          ) : (
            <div className={styles.avatarPlaceholder}>
              {coach.firstName[0]?.toUpperCase() || 'C'}
            </div>
          )}
          <div className={styles.headerInfo}>
            <h3 className={styles.name}>
              {coach.firstName} {coach.lastName}
            </h3>
            {coach.email && <p className={styles.email}>{coach.email}</p>}
            {coach.discipline && <p className={styles.discipline}>{coach.discipline}</p>}
          </div>
          {coach.status && (
            <span
              className={`${styles.status} ${styles[`status${coach.status}`]}`}
            >
              {coach.status}
            </span>
          )}
        </div>

        {coach.bio && <p className={styles.bio}>{coach.bio}</p>}

        <div className={styles.adminMeta}>
          {coach.location && (
            <div className={styles.metaItem}>
              <strong>{t('location')}:</strong> {coach.location}
            </div>
          )}
          {coach.experience && (
            <div className={styles.metaItem}>
              <strong>{t('experience')}:</strong> {coach.experience} {t('years')}
            </div>
          )}
          {coach.hourlyRate && (
            <div className={styles.metaItem}>
              <strong>{t('rate')}:</strong> {formatRate(coach.hourlyRate)}
            </div>
          )}
          {coach.createdAt && (
            <div className={styles.metaItem}>
              <strong>{t('appliedOn')}:</strong>{' '}
              {new Date(coach.createdAt).toLocaleDateString()}
            </div>
          )}
        </div>

        {coach.portfolio && coach.portfolio.length > 0 && (
          <div className={styles.portfolio}>
            <strong>{t('portfolio')}:</strong> {coach.portfolio.length} {t('items')}
          </div>
        )}

        {coach.certifications && coach.certifications.length > 0 && (
          <div className={styles.certifications}>
            <strong>{t('certifications')}:</strong>
            <ul>
              {coach.certifications.map((cert, index) => (
                <li key={index}>{cert}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default CoachCard;
