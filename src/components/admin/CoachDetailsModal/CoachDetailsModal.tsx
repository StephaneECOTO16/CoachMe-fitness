'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { 
    X, 
    CheckCircle, 
    XCircle, 
    FileText, 
    Award, 
    Dumbbell,
    Briefcase,
    Layout,
    Phone
} from 'lucide-react';
import UserAvatar from '@/components/ui/UserAvatar/UserAvatar';
import StatusBadge from '@/components/ui/StatusBadge';
import Portal from '@/components/ui/Portal';
import { MediaGallery, EmptyState } from '@/components';
import styles from './CoachDetailsModal.module.css';

interface Media {
    id: number;
    url: string;
    type: 'CERTIFICATE' | 'IMAGE' | 'VIDEO' | 'OTHER';
    mimeType: string;
    sizeBytes: number | null;
    description: string | null;
    createdAt: string;
}

interface CoachDetails {
    id: number;
    userId: string;
    bio: string | null;
    discipline: string;
    portfolio: string | null;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    experienceYears: number | null;
    address: string | null;
    city: string | null;
    country: string | null;
    createdAt: string;
    user: {
        id: string;
        name: string | null;
        email: string;
        phone: string | null;
        avatar: string | null;
        createdAt: string;
    };
    media: Media[];
}

interface CoachDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string | null;
    onApprove: (id: string) => Promise<void>;
    onReject: (id: string) => void;
}

const CoachDetailsModal: React.FC<CoachDetailsModalProps> = ({
    isOpen,
    onClose,
    userId,
    onApprove,
    onReject
}) => {
    const tCommon = useTranslations('common');
    const [coach, setCoach] = useState<CoachDetails | null>(null);
    const [loading, setLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const fetchCoachDetails = React.useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/coaches/${userId}`, {
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setCoach(data.coach);
            }
        } catch (error) {
            console.error('Error fetching coach details:', error);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        if (isOpen && userId) {
            fetchCoachDetails();
        } else {
            setCoach(null);
        }
    }, [isOpen, userId, fetchCoachDetails]);

    const handleApprove = async () => {
        if (!coach) return;
        setIsProcessing(true);
        try {
            await onApprove(coach.user.id);
            onClose();
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    const certificates = coach?.media.filter(m => m.type === 'CERTIFICATE') || [];
    const portfolioMedia = coach?.media.filter(m => m.type === 'IMAGE' || m.type === 'VIDEO') || [];

    // Convert portfolio media to MediaGallery items for Lightbox support
    const galleryItems = portfolioMedia.map(m => ({
        id: String(m.id),
        type: (m.type === 'VIDEO' ? 'video' : 'image') as 'video' | 'image',
        url: m.url,
        caption: m.description || undefined
    }));

    const formatFileSize = (bytes: number | null) => {
        if (!bytes) return '';
        const mb = bytes / (1024 * 1024);
        return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`;
    };

    const getFileIcon = (mimeType: string) => {
        if (mimeType.includes('pdf')) return <FileText size={20} />;
        if (mimeType.includes('image')) return <Award size={20} />;
        return <FileText size={20} />;
    };

    return (
        <Portal>
            <div className={styles.overlay} onClick={onClose}>
                <div className={styles.modal} onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div className={styles.header}>
                        <div className={styles.coachInfoMain}>
                            {coach ? (
                                <>
                                    <UserAvatar user={coach.user} size="xl" className={styles.avatar} />
                                    <div className={styles.coachMeta}>
                                        <h1 className={styles.coachName}>{coach.user.name || 'Unknown'}</h1>
                                        <a href={`mailto:${coach.user.email}`} className={styles.coachEmail}>
                                            {coach.user.email}
                                        </a>
                                        {coach.user.phone && (
                                            <div className={styles.coachContactItem}>
                                                <Phone size={14} className={styles.contactIcon} />
                                                <span className={styles.coachPhone}>{coach.user.phone}</span>
                                            </div>
                                        )}
                                        <span className={styles.appliedDate}>
                                            Applied: {new Date(coach.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <div className={styles.loadingInfo} />
                            )}
                        </div>
                        <div className={styles.headerActions}>
                            <button className={styles.closeButton} onClick={onClose}>
                                <X size={24} />
                            </button>
                            {coach && (
                                <StatusBadge status={coach.status} />
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className={styles.content}>
                        {loading ? (
                            <div className={styles.loadingOverlay}>
                                <div className={styles.spinner} />
                                <p>{tCommon('loading')}</p>
                            </div>
                        ) : coach && (
                            <>
                                {/* Expertise Section */}
                                <section className={styles.section}>
                                    <div className={styles.sectionHeader}>
                                        <Dumbbell className={styles.sectionIcon} size={20} />
                                        <span>Expertise & Disciplines</span>
                                    </div>
                                    <div className={styles.tags}>
                                        <span className={styles.tag}>{coach.discipline}</span>
                                    </div>
                                </section>

                                {/* Bio Section */}
                                <section className={styles.section}>
                                    <div className={styles.sectionHeader}>
                                        <Briefcase className={styles.sectionIcon} size={20} />
                                        <span>About Coach</span>
                                    </div>
                                    {coach.bio ? (
                                        <p className={styles.bioText}>{coach.bio}</p>
                                    ) : (
                                        <p className={styles.emptyText}>No bio provided.</p>
                                    )}
                                </section>

                                {/* Certifications Section */}
                                <section className={styles.section}>
                                    <div className={styles.sectionHeader}>
                                        <FileText className={styles.sectionIcon} size={20} />
                                        <span>Certifications & Resume</span>
                                    </div>
                                    <div className={styles.mediaList}>
                                        {certificates.length > 0 ? certificates.map((cert) => (
                                            <div key={cert.id} className={styles.mediaItem}>
                                                <div className={styles.mediaInfo}>
                                                    <div className={styles.mediaIconContainer}>
                                                        {getFileIcon(cert.mimeType)}
                                                    </div>
                                                    <div className={styles.mediaText}>
                                                        <span className={styles.mediaTitle}>{cert.description || cert.url.split('/').pop()}</span>
                                                        <span className={styles.mediaSubtitle}>
                                                            Uploaded {new Date(cert.createdAt).toLocaleDateString()} • {formatFileSize(cert.sizeBytes)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <a href={cert.url} target="_blank" rel="noopener noreferrer" className={styles.mediaAction}>
                                                    {cert.mimeType.includes('pdf') ? 'Download' : 'View'}
                                                </a>
                                            </div>
                                        )) : (
                                            <p className={styles.emptyText}>No certifications uploaded.</p>
                                        )}
                                    </div>
                                </section>

                                {/* Portfolio Section */}
                                <section className={styles.section}>
                                    <div className={styles.sectionHeader}>
                                        <Layout className={styles.sectionIcon} size={20} />
                                        <span>Portfolio Media</span>
                                    </div>
                                    {galleryItems.length > 0 ? (
                                        <MediaGallery media={galleryItems} className={styles.portfolioGallery} />
                                    ) : (
                                        <EmptyState
                                            icon="📁"
                                            title="No media yet"
                                            description="This coach hasn't uploaded any media yet."
                                            size="sm"
                                        />
                                    )}
                                </section>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    {coach && (
                        <div className={styles.footer}>
                            <button 
                                className={styles.rejectBtn} 
                                onClick={() => {
                                    onReject(coach.user.id);
                                    // Optionally don't close here so the reason modal can handle it
                                }}
                                disabled={isProcessing}
                            >
                                <XCircle size={20} />
                                Reject Application
                            </button>
                            <button 
                                className={styles.approveBtn} 
                                onClick={handleApprove}
                                disabled={isProcessing}
                            >
                                <CheckCircle size={20} />
                                {isProcessing ? 'Processing...' : 'Approve Coach'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </Portal>
    );
};

export default CoachDetailsModal;
