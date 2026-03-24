'use client';

import React from 'react';
import { Link } from '@/i18n/routing';
import UserAvatar from '@/components/ui/UserAvatar/UserAvatar';
import { Eye, MoreVertical, CheckCircle, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import styles from './PendingApprovalsList.module.css';
import { DataTable, StatusBadge, Dropdown } from '@/components';
import { ColumnConfig } from '@/components/ui/DataTable/DataTable';

interface PendingCoach {
    id: number;
    userId: string;
    bio: string | null;
    discipline: string;
    portfolio: string | null;
    status: string;
    createdAt: string;
    user: {
        id: string;
        name: string | null;
        email: string;
        avatar: string | null;
        createdAt: string;
    };
}

interface PendingApprovalsListProps {
    coaches: PendingCoach[];
    onApprove?: (id: string) => void;
    onReject?: (id: string) => void;
    onView?: (coach: PendingCoach) => void;
}

const PendingApprovalsList: React.FC<PendingApprovalsListProps> = ({
    coaches,
    onApprove,
    onReject,
    onView
}) => {
    const t = useTranslations('admin.dashboard');

    const columns: ColumnConfig<PendingCoach>[] = [
        {
            header: t('table.coach'),
            key: 'user',
            render: (coach) => (
                <div className={styles.coachCell}>
                    <UserAvatar user={coach.user} size="md" />
                    <div className={styles.coachInfo}>
                        <span className={styles.coachName}>{coach.user.name || 'Unknown'}</span>
                        <span className={styles.coachEmail}>{coach.user.email}</span>
                    </div>
                </div>
            )
        },
        {
            header: t('table.specialty'),
            key: 'discipline',
            render: (coach) => <span className={styles.specialty}>{coach.discipline}</span>
        },
        {
            header: t('table.status'),
            key: 'status',
            render: () => (
                <StatusBadge status="PENDING" size="sm" />
            )
        }
    ];

    const renderActions = (coach: PendingCoach) => {
        const dropdownItems: { label: string; icon: React.ReactNode; variant?: 'default' | 'danger'; onClick: () => void }[] = [];

        if (onApprove) {
            dropdownItems.push({
                label: t('actions.approve'),
                icon: <CheckCircle size={16} />,
                onClick: () => onApprove(coach.user.id)
            });
        }

        if (onReject) {
            dropdownItems.push({
                label: t('actions.reject'),
                icon: <XCircle size={16} />,
                variant: 'danger',
                onClick: () => onReject(coach.user.id)
            });
        }

        return (
            <div className={styles.actions}>
                <button
                    className={styles.iconBtn}
                    onClick={() => onView ? onView(coach) : null}
                    title={t('actions.viewDetails')}
                >
                    <Eye size={18} />
                </button>
                {dropdownItems.length > 0 && (
                    <Dropdown
                        trigger={
                            <button className={styles.iconBtn} title={t('users.moreActions')}>
                                <MoreVertical size={18} />
                            </button>
                        }
                        items={dropdownItems}
                    />
                )}
            </div>
        );
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>{t('pendingApprovals')}</h2>
                <Link href="/admin/users" className={styles.viewAll}>
                    {t('viewAll')}
                </Link>
            </div>

            <DataTable
                data={coaches}
                columns={columns}
                renderRowActions={renderActions}
                showHeader={false}
                showFooter={false}
                emptyMessage={t('noPendingApprovals')}
            />
        </div>
    );
};

export default PendingApprovalsList;

