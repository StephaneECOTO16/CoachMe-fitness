'use client';

import React from 'react';
import { Link } from '@/i18n/routing';
import UserAvatar from '@/components/ui/UserAvatar/UserAvatar';
import { Check, X, Eye } from 'lucide-react';
import { useTranslations } from 'next-intl';
import styles from './PendingApprovalsList.module.css';

interface PendingCoach {
    id: number;
    userId: number;
    discipline: string;
    status: string;
    createdAt: string;
    user: {
        name: string | null;
        email: string;
        avatar: string | null;
    };
}

interface PendingApprovalsListProps {
    coaches: PendingCoach[];
    onApprove?: (id: number) => void;
    onReject?: (id: number) => void;
}

const PendingApprovalsList: React.FC<PendingApprovalsListProps> = ({
    coaches,
    onApprove,
    onReject
}) => {
    const t = useTranslations('admin.dashboard');

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>{t('pendingApprovals')}</h2>
                <Link href="/admin/coaches" className={styles.viewAll}>
                    {t('viewAll')}
                </Link>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={styles.th}>{t('table.coach')}</th>
                            <th className={styles.th}>{t('table.specialty')}</th>
                            <th className={styles.th}>{t('table.status')}</th>
                            <th className={styles.th}>{t('table.action')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {coaches.map((coach) => (
                            <tr key={coach.id} className={styles.row}>
                                <td className={styles.td}>
                                    <div className={styles.coachCell}>
                                        <UserAvatar user={coach.user} size="md" />
                                        <div className={styles.coachInfo}>
                                            <span className={styles.coachName}>{coach.user.name || 'Unknown'}</span>
                                            <span className={styles.coachEmail}>{coach.user.email}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className={styles.td}>
                                    <span className={styles.specialty}>{coach.discipline}</span>
                                </td>
                                <td className={styles.td}>
                                    <span className={styles.pendingBadge}>
                                        {t('pendingReview')}
                                    </span>
                                </td>
                                <td className={styles.td}>
                                    <div className={styles.actions}>
                                        {onApprove && (
                                            <button
                                                className={`${styles.iconBtn} ${styles.approveIcon}`}
                                                onClick={() => onApprove(coach.id)}
                                                title={t('actions.approve')}
                                            >
                                                <Check size={18} />
                                            </button>
                                        )}
                                        {onReject && (
                                            <button
                                                className={`${styles.iconBtn} ${styles.rejectIcon}`}
                                                onClick={() => onReject(coach.id)}
                                                title={t('actions.reject')}
                                            >
                                                <X size={18} />
                                            </button>
                                        )}
                                        <Link
                                            href={`/admin/coaches/${coach.id}`}
                                            className={`${styles.iconBtn} ${styles.viewIcon}`}
                                            title={t('actions.viewDetails')}
                                        >
                                            <Eye size={18} />
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {coaches.length === 0 && (
                            <tr>
                                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                    {t('noPendingApprovals')}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PendingApprovalsList;

