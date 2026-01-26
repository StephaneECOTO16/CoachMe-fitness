'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Eye, CheckCircle, XCircle, MoreVertical, Trash2 } from 'lucide-react';
import { DataTable, StatusBadge, ColumnConfig, Modal, Dropdown, CoachDetailsModal } from '@/components';
import UserAvatar from '@/components/ui/UserAvatar/UserAvatar';
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal';
import toast from '@/lib/toast';
import Button from '@/components/ui/Button';
import styles from './page.module.css';

interface UserData {
    id: number;
    name: string | null;
    email: string;
    role: 'PROSPECT' | 'COACH';
    avatar: string | null;
    specialty: string | null;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
    coachId: number | null;
    goals: string | null;
    createdAt: string;
    coachProfile?: { experienceYears?: number };
    clientProfile?: { goals?: string };
}

export default function AdminUsersPage() {
    const t = useTranslations('admin.dashboard');
    const tUsers = useTranslations('admin.dashboard.users');
    const tCoaches = useTranslations('admin.coaches');
    const tCommon = useTranslations('common');

    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchValue, setSearchValue] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Modal states
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [isActionLoading, setIsActionLoading] = useState(false);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const res = await fetch('/api/admin/users', {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            const data = await res.json();
            if (data.success) {
                setUsers(data.users);
            } else {
                toast.error(tUsers('loadError'));
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error(tUsers('internalError'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleApprove = async (coachId: number) => {
        if (!confirm(tCoaches('confirmApprove'))) return;

        try {
            setIsActionLoading(true);
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/coaches/${coachId}/approve`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await res.json();
            if (data.success) {
                toast.success(t('messages.approveSuccess'));
                fetchUsers();
                setIsViewModalOpen(false);
            } else {
                toast.error(data.error?.message || t('messages.approveError'));
            }
        } catch {
            toast.error(t('messages.errorOccurred'));
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!selectedUser?.coachId || !rejectionReason.trim()) {
            toast.error(t('messages.provideReason'));
            return;
        }

        if (rejectionReason.length < 5) {
            toast.error(t('messages.reasonTooShort'));
            return;
        }

        setIsActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/coaches/${selectedUser.coachId}/reject`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason: rejectionReason })
            });
            const data = await res.json();
            if (data.success) {
                toast.success(t('messages.rejectSuccess'));
                fetchUsers();
                setIsRejectModalOpen(false);
                setIsViewModalOpen(false);
            } else {
                toast.error(data.error?.message || t('messages.rejectError'));
            }
        } catch {
            toast.error(t('messages.errorOccurred'));
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedUser) return;

        setIsActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await res.json();
            if (data.success) {
                toast.success(tUsers('deleteSuccess'));
                fetchUsers();
                setIsDeleteModalOpen(false);
                setIsViewModalOpen(false);
            } else {
                toast.error(data.error?.message || tUsers('deleteError'));
            }
        } catch {
            toast.error(t('messages.errorOccurred'));
        } finally {
            setIsActionLoading(false);
        }
    };

    const columns: ColumnConfig<UserData>[] = [
        {
            header: tUsers('tableName'),
            key: 'name',
            render: (user) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <UserAvatar user={{ name: user.name, avatar: user.avatar }} size="md" />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{user.name || 'N/A'}</span>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{user.email}</span>
                    </div>
                </div>
            ),
        },
        {
            header: tUsers('tableRole'),
            key: 'role',
            render: (user) => (
                <span style={{
                    background: user.role === 'COACH' ? '#eff6ff' : '#f5f3ff',
                    color: user.role === 'COACH' ? '#1e40af' : '#5b21b6',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 600
                }}>
                    {user.role}
                </span>
            )
        },
        {
            header: tUsers('tableContext'),
            key: 'context',
            render: (user) => (
                <span style={{ color: '#4b5563' }}>
                    {user.role === 'COACH' ? (user.specialty || tUsers('noSpecialty')) : (user.goals || tUsers('noGoals'))}
                </span>
            ),
        },
        {
            header: tUsers('tableJoinedAt'),
            key: 'createdAt',
            render: (user) => new Date(user.createdAt).toLocaleDateString(),
        },
        {
            header: tUsers('tableStatus'),
            key: 'status',
            render: (user) => user.role === 'COACH' ? (
                <StatusBadge
                    status={user.status || 'PENDING'}
                    size="sm"
                />
            ) : <span style={{ color: '#9ca3af' }}>N/A</span>,
        },
    ];

    const filteredData = useMemo(() => {
        return users.filter(user =>
            (user.name?.toLowerCase().includes(searchValue.toLowerCase()) || '') ||
            user.email.toLowerCase().includes(searchValue.toLowerCase())
        );
    }, [users, searchValue]);

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    const handleOpenView = (user: UserData) => {
        setSelectedUser(user);
        setIsViewModalOpen(true);
    };

    const renderActions = (user: UserData) => {
        const dropdownItems: { label: string; icon: React.ReactNode; variant?: 'default' | 'danger'; onClick: () => void }[] = [];

        if (user.role === 'COACH' && user.coachId) {
            if (user.status !== 'APPROVED') {
                dropdownItems.push({
                    label: tUsers('approveCoach'),
                    icon: <CheckCircle size={16} />,
                    onClick: () => handleApprove(user.coachId!)
                });
            }
            if (user.status !== 'REJECTED') {
                dropdownItems.push({
                    label: tUsers('rejectCoach'),
                    icon: <XCircle size={16} />,
                    variant: 'danger',
                    onClick: () => {
                        setSelectedUser(user);
                        setRejectionReason('');
                        setIsRejectModalOpen(true);
                    }
                });
            }
            // Add delete action for coaches
            dropdownItems.push({
                label: tUsers('deleteUser'),
                icon: <Trash2 size={16} />,
                variant: 'danger',
                onClick: () => {
                    setSelectedUser(user);
                    setIsDeleteModalOpen(true);
                }
            });
        }

        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                    type="button"
                    className={styles.actionIconBtn}
                    onClick={() => handleOpenView(user)}
                    title={tUsers('viewDetails')}
                >
                    <Eye size={18} />
                </button>
                {user.role === 'PROSPECT' && (
                    <button
                        type="button"
                        className={styles.actionIconBtnDanger}
                        onClick={() => {
                            setSelectedUser(user);
                            setIsDeleteModalOpen(true);
                        }}
                        title={tUsers('deleteUser')}
                    >
                        <Trash2 size={18} />
                    </button>
                )}
                {dropdownItems.length > 0 && (
                    <Dropdown
                        trigger={
                            <button type="button" className={styles.actionIconBtn} title={tUsers('moreActions')}>
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
            <h1 className={styles.title}>{tUsers('title')}</h1>

            <DataTable
                data={filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)}
                columns={columns}
                isLoading={loading}
                searchPlaceholder={tUsers('searchPlaceholder')}
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                pagination={{
                    currentPage,
                    totalPages,
                    totalItems: filteredData.length,
                    itemsPerPage,
                    onPageChange: setCurrentPage,
                }}
                renderRowActions={renderActions}
            />

            {/* View User Modal */}
            {selectedUser?.role === 'COACH' ? (
                <CoachDetailsModal
                    isOpen={isViewModalOpen}
                    onClose={() => setIsViewModalOpen(false)}
                    coachId={selectedUser.coachId}
                    onApprove={async (id) => {
                        await handleApprove(id);
                    }}
                    onReject={(id) => {
                        // For simplicity on this page, we close and open the reject confirm
                        setIsViewModalOpen(false);
                        setIsRejectModalOpen(true);
                    }}
                />
            ) : (
                <Modal
                    isOpen={isViewModalOpen}
                    onClose={() => setIsViewModalOpen(false)}
                    title={tUsers('detailsTitle', { role: selectedUser?.role || '' })}
                    size="md"
                >
                    {selectedUser && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <UserAvatar user={{ name: selectedUser.name, avatar: selectedUser.avatar }} size="xl" />
                                <div>
                                    <h2 style={{ margin: 0 }}>{selectedUser.name}</h2>
                                    <p style={{ color: '#6b7280', margin: 0 }}>{selectedUser.email}</p>
                                    <div className="mt-2">
                                        <span style={{
                                            background: selectedUser.role === 'COACH' ? '#eff6ff' : '#f5f3ff',
                                            color: selectedUser.role === 'COACH' ? '#1e40af' : '#5b21b6',
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            fontSize: '0.75rem',
                                            fontWeight: 700
                                        }}>
                                            {selectedUser.role}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                <div>
                                    <h4 style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{tUsers('joinedDate')}</h4>
                                    <p style={{ margin: 0, fontWeight: 500 }}>{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                                </div>

                                {selectedUser.role === 'PROSPECT' && (
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <h4 style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{tUsers('sportGoals')}</h4>
                                        <p style={{ margin: 0, padding: '16px', background: '#f9fafb', borderRadius: '12px', lineHeight: 1.6 }}>
                                            {selectedUser.goals || tUsers('noGoalsDetailed')}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                                <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>{tCommon('close')}</Button>
                            </div>
                        </div>
                    )}
                </Modal>
            )}

            {/* Reject Reason Modal */}
            <Modal
                isOpen={isRejectModalOpen}
                onClose={() => setIsRejectModalOpen(false)}
                title={t('rejectModal.title')}
                size="md"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <p style={{ color: '#4b5563', margin: 0 }}>
                        {t('rejectModal.description')}
                    </p>
                    <textarea
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '0.875rem'
                        }}
                        rows={4}
                        placeholder={t('rejectModal.placeholder')}
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <Button
                            variant="outline"
                            onClick={() => setIsRejectModalOpen(false)}
                            disabled={isActionLoading}
                        >
                            {tCommon('cancel')}
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleReject}
                            disabled={isActionLoading}
                            loading={isActionLoading}
                        >
                            {t('rejectModal.confirm')}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <DeleteConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title={tUsers('deleteModal.title')}
                message={tUsers('deleteModal.message', { role: selectedUser?.role || '' })}
                itemName={selectedUser?.name || selectedUser?.email || ''}
                confirmText={tUsers('deleteModal.confirm')}
                cancelText={tCommon('cancel')}
                isLoading={isActionLoading}
            />
        </div>
    );
}
