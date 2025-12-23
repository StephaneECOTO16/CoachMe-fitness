"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";
import styles from "./CoachCard.module.css";

// Shared interfaces (can be moved to a types file if preferred)
export interface CoachData {
    _id: string; // Use _id to match API/DB usually, but we handle string/number mapping
    firstName: string;
    lastName: string;
    email?: string;
    avatar?: string;
    discipline?: string;
    bio?: string;
    location?: string;
    experience?: number;
    rateAmount?: number;
    rateType?: "HOUR" | "WEEK" | "MONTH";
    hourlyRate?: number; // Legacy prop support
    socialMedia?: {
        instagram?: string;
        facebook?: string;
        tiktok?: string;
        twitter?: string;
        youtube?: string;
    };
    portfolio?: Array<{ type: string; url: string; caption?: string }>;
    certifications?: string[];
    status?: "PENDING" | "APPROVED" | "REJECTED";
    createdAt?: string;
    averageRating?: number;
    totalReviews?: number;
}

export interface CoachCardProps {
    coach: CoachData;
    variant?: "list" | "grid" | "compact" | "admin";
    onViewProfile?: () => void;
    showSocialLinks?: boolean;
    showBadges?: boolean;
    bioMaxLength?: number;
    locale?: string;
    className?: string;
}

const CoachCard: React.FC<CoachCardProps> = ({
    coach,
    variant = "grid",
    onViewProfile,
    showSocialLinks = true,
    showBadges = true,
    bioMaxLength,
    locale = "en",
    className = "",
}) => {
    const t = useTranslations("coaches");
    // Some fallback translations/logic since 'coaches' namespace might differ from 'browse.coaches'
    // Ideally we unify namespaces.

    const getAvatarUrl = () => {
        if (coach.avatar) return coach.avatar;
        // Fallback if no avatar but media exists? (Handled by parent usually, but here we stick to avatar field or placeholder)
        return undefined;
    };

    const truncateBio = (bio: string, maxLength?: number) => {
        if (!maxLength) return bio;
        return bio.length > maxLength ? `${bio.substring(0, maxLength)}...` : bio;
    };

    const formatRate = (amount?: number, type?: "HOUR" | "WEEK" | "MONTH") => {
        if (!amount) return null;
        // Map rate types to short labels
        const suffix = type === "WEEK" ? "wk" : type === "MONTH" ? "mo" : "hr";
        // Check if we have currency context, assuming USD or XAF based on app context. 
        // The reference used XAF explicit formatting.
        // "new Intl.NumberFormat("fr-FR").format(Number(coach.rateAmount))} XAF"

        // For now, keep generic or attempt XAF if consistent
        // Since this is a shared card, let's try to be consistent with what was seen in the page.
        return `${new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US').format(amount)} XAF`;
    };

    const getRateLabel = (rateType?: "HOUR" | "WEEK" | "MONTH") => {
        if (!rateType) return t('perHour');
        if (rateType === "WEEK") return t('perWeek');
        if (rateType === "MONTH") return t('perMonth');
        return t('perHour');
    };

    const getSocialIcon = (platform: string) => {
        const icons: Record<string, string> = {
            instagram: "M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4c0 3.2-2.6 5.8-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8C2 4.6 4.6 2 7.8 2m-.2 2C5.6 4 4 5.6 4 7.6v8.8C4 18.4 5.6 20 7.6 20h8.8c2 0 3.6-1.6 3.6-3.6V7.6C20 5.6 18.4 4 16.4 4H7.6m9.65 1.5c.69 0 1.25.56 1.25 1.25s-.56 1.25-1.25 1.25-1.25-.56-1.25-1.25.56-1.25 1.25-1.25M12 7c2.76 0 5 2.24 5 5s-2.24 5-5 5-5-2.24-5-5 2.24-5 5-5m0 2c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z",
            facebook: "M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02z",
            tiktok: "M16.6 5.82s.51.5 0 0A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z",
            twitter: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
            youtube: "M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z",
        };
        return icons[platform] || "";
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
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d={getSocialIcon(platform)} />
                        </svg>
                    </a>
                ))}
            </div>
        );
    };

    const renderBadges = () => {
        if (!showBadges) return null;

        return (
            <div className={styles.badges}>
                {coach.certifications && coach.certifications.length > 0 && (
                    <span className={`${styles.badge} ${styles.badgeCertified}`}>
                        {t('certified')}
                    </span>
                )}
                {coach.portfolio && coach.portfolio.length > 0 && (
                    <span className={`${styles.badge} ${styles.badgePortfolio}`}>
                        {t('hasPortfolio')}
                    </span>
                )}
            </div>
        );
    };

    // --- Render Variants ---

    // 1. List Variant (Coaches Page)
    if (variant === "list") {
        // Determine rate to show
        const rate = coach.rateAmount ?? coach.hourlyRate;
        const rateString = formatRate(rate, coach.rateType);

        return (
            <div className={`${styles.card} ${styles.cardList} ${className}`}>
                <div className={styles.avatarWrapper}>
                    <Image
                        src={coach.avatar || "/descipline.jpg"}
                        alt={`${coach.firstName} ${coach.lastName}`}
                        fill
                        className={styles.avatarImage}
                        unoptimized
                    />
                </div>

                <div className={styles.content}>
                    <div className={styles.header}>
                        <div>
                            <h3 className={styles.name}>
                                {coach.firstName} {coach.lastName}
                            </h3>
                            {coach.discipline && (
                                <p className={styles.discipline}>{coach.discipline}</p>
                            )}
                        </div>
                        {rateString && (
                            <div className={styles.rateContainer}>
                                <span className={styles.rateAmount}>{rateString}</span>
                                <span className={styles.rateLabel}>
                                    {getRateLabel(coach.rateType)}
                                </span>
                            </div>
                        )}
                    </div>

                    {coach.bio && (
                        <p className={styles.bio}>
                            {truncateBio(coach.bio, bioMaxLength || 150)}
                        </p>
                    )}

                    <div className={styles.meta}>
                        {coach.location && (
                            <div className={styles.metaItem}>
                                <svg className={styles.metaIcon} viewBox="0 0 24 24" fill="none">
                                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor" />
                                </svg>
                                <span>{coach.location}</span>
                            </div>
                        )}
                        {coach.experience && coach.experience > 0 && (
                            <div className={styles.metaItem}>
                                <svg className={styles.metaIcon} viewBox="0 0 24 24" fill="none">
                                    <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z" fill="currentColor" />
                                </svg>
                                <span>{coach.experience} {t('yearsExperienceSuffix')}</span>
                            </div>
                        )}
                        {renderBadges()}
                    </div>

                    <div className={styles.footer}>
                        {renderSocialLinks()}
                        <Button
                            variant="primary"
                            size="md"
                            onClick={onViewProfile}
                            as={Link}
                            href={`/${locale}/coaches/${coach._id}`}
                        >
                            {t('viewProfile')}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // 2. Grid Variant (Dashboard)
    if (variant === "grid") {
        return (
            <div className={`${styles.card} ${styles.cardGrid} ${className}`}>
                <div className={styles.avatarWrapper}>
                    <Image
                        src={coach.avatar || "/descipline.jpg"}
                        alt={`${coach.firstName} ${coach.lastName}`}
                        width={120}
                        height={120}
                        className={styles.avatarImage}
                        unoptimized
                    />
                </div>
                <h3 className={styles.name}>
                    {coach.firstName} {coach.lastName}
                </h3>
                {coach.discipline && (
                    <p className={styles.discipline}>{coach.discipline}</p>
                )}

                {coach.bio && (
                    <p className={styles.bio}>
                        {truncateBio(coach.bio, bioMaxLength || 80)}
                    </p>
                )}

                {/* Badges often skipped in compact grid, or minimal */}

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

    // 3. Compact Variant
    if (variant === "compact") {
        return (
            <div className={`${styles.cardCompact} ${className}`}>
                <div className={styles.avatarWrapper}>
                    <Image
                        src={coach.avatar || "/descipline.jpg"}
                        alt={`${coach.firstName} ${coach.lastName}`}
                        width={40}
                        height={40}
                        className={styles.avatarImage}
                        unoptimized
                    />
                </div>
                <div className={styles.info}>
                    <h4 className={styles.name}>{coach.firstName} {coach.lastName}</h4>
                    {coach.discipline && <p className={styles.discipline}>{coach.discipline}</p>}
                </div>
            </div>
        );
    }

    return null;
};

export default CoachCard;
