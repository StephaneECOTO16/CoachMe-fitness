"use client";

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { deleteAccountSchema, DeleteAccountInput } from '@/lib/schemas';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';
import { ShieldAlert, Trash2, X } from 'lucide-react';
import styles from './DeleteAccountZone.module.css';

const DeleteAccountZone: React.FC = () => {
    const t = useTranslations('settings.deleteAccount');
    const tErr = useTranslations('settings.errors');
    const router = useRouter();
    const { logout } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset
    } = useForm<DeleteAccountInput>({
        resolver: zodResolver(deleteAccountSchema)
    });

    const onSubmit = async (data: DeleteAccountInput) => {
        setIsDeleting(true);
        try {
            const response = await fetch('/api/user/delete-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (result.success) {
                toast.success(t('success'));
                // Clear client-side auth state
                logout();
                // Redirect to home (logout already handles this, but being explicit)
                router.push('/');
            } else {
                if (result.error?.code === 'INCORRECT_PASSWORD') {
                    toast.error(tErr('incorrectPassword'));
                } else {
                    toast.error(tErr('deleteFailed'));
                }
            }
        } catch {
            toast.error(tErr('deleteFailed'));
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.warningBox}>
                <ShieldAlert className={styles.warningIcon} size={24} />
                <p className={styles.warningText}>{t('description')}</p>
            </div>

            <Button
                variant="outline"
                className={styles.deleteButton}
                onClick={() => setIsModalOpen(true)}
            >
                <Trash2 size={18} className={styles.btnIcon} />
                {t('button')}
            </Button>

            {isModalOpen && (
                <div className={styles.overlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>{t('modalTitle')}</h3>
                            <button className={styles.closeBtn} onClick={() => { setIsModalOpen(false); reset(); }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            <p className={styles.modalDescription}>{t('modalDescription')}</p>

                            <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
                                <div className={styles.formGroup}>
                                    <input
                                        type="password"
                                        placeholder={t('confirmPlaceholder')}
                                        className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                                        {...register('password')}
                                    />
                                    {errors.password && <span className={styles.errorText}>{errors.password.message}</span>}
                                </div>

                                <div className={styles.modalActions}>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => { setIsModalOpen(false); reset(); }}
                                        disabled={isDeleting}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        className={styles.confirmDeleteBtn}
                                        disabled={isDeleting}
                                    >
                                        {isDeleting ? 'Deleting...' : t('button')}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeleteAccountZone;
