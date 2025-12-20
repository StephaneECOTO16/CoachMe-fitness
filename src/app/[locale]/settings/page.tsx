"use client";

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    updateCredentialsSchema,
    UpdateCredentialsInput,
    changePasswordSchema,
    ChangePasswordInput
} from '@/lib/schemas';
import Button from '@/components/ui/Button';
import SettingsSection from '@/components/ui/SettingsSection/SettingsSection';
import DeleteAccountZone from '@/components/ui/DeleteAccountZone/DeleteAccountZone';
import { toast } from 'sonner';
import { Key, Mail, User, ArrowRight, Loader2 } from 'lucide-react';
import styles from './page.module.css';

export default function SettingsPage() {
    const t = useTranslations('settings');
    const tCommon = useTranslations('common');
    const { user, isAuthenticated } = useAuth();
    const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    // Email form
    const {
        register: registerEmail,
        handleSubmit: handleSubmitEmail,
        formState: { errors: emailErrors },
        setValue: setValueEmail,
    } = useForm<UpdateCredentialsInput>({
        resolver: zodResolver(updateCredentialsSchema),
        defaultValues: { email: user?.email || '' }
    });

    // Update form when user data is available/changes
    useEffect(() => {
        if (user?.email) {
            setValueEmail('email', user.email);
        }
    }, [user?.email, setValueEmail]);

    // Password form
    const {
        register: registerPassword,
        handleSubmit: handleSubmitPassword,
        formState: { errors: passwordErrors },
        reset: resetPassword
    } = useForm<ChangePasswordInput>({
        resolver: zodResolver(changePasswordSchema)
    });

    const onUpdateEmail = async (data: UpdateCredentialsInput) => {
        setIsUpdatingEmail(true);
        try {
            const response = await fetch('/api/user/credentials', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (result.success) {
                toast.success(t('credentials.email.success'));
                // In a real app, you might want to refresh the user context here
            } else {
                if (result.error?.code === 'EMAIL_IN_USE') {
                    toast.error(t('errors.emailInUse'));
                } else {
                    toast.error(result.error?.message || tCommon('error'));
                }
            }
        } catch (error) {
            toast.error(tCommon('error'));
        } finally {
            setIsUpdatingEmail(false);
        }
    };

    const onChangePassword = async (data: ChangePasswordInput) => {
        setIsChangingPassword(true);
        try {
            const response = await fetch('/api/user/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (result.success) {
                toast.success(t('credentials.password.success'));
                resetPassword();
            } else {
                if (result.error?.code === 'INCORRECT_PASSWORD') {
                    toast.error(t('errors.incorrectPassword'));
                } else {
                    toast.error(result.error?.message || tCommon('error'));
                }
            }
        } catch (error) {
            toast.error(tCommon('error'));
        } finally {
            setIsChangingPassword(false);
        }
    };

    if (!isAuthenticated) return null;

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <header className={styles.header}>
                    <h1 className={styles.title}>{t('title')}</h1>
                    <p className={styles.subtitle}>{t('subtitle')}</p>
                </header>

                {/* Profile & Email Section */}
                <SettingsSection
                    title={t('sections.profile.title')}
                    description={t('sections.profile.description')}
                >
                    <div className={styles.formCard}>
                        <div className={styles.formHeader}>
                            <Mail size={18} className={styles.formIcon} />
                            <h3>{t('credentials.email.label')}</h3>
                        </div>

                        {/* <div className={styles.currentEmailInfo}>
                            <span className={styles.currentEmailLabel}>{t('credentials.email.currentLabel')}:</span>
                            <span className={styles.currentEmailValue}>{user?.email}</span>
                        </div> */}

                        <form onSubmit={handleSubmitEmail(onUpdateEmail)} className={styles.subForm}>
                            <div className={styles.inputWrapper}>
                                <input
                                    type="email"
                                    className={`${styles.input} ${emailErrors.email ? styles.inputError : ''}`}
                                    placeholder={t('credentials.email.placeholder')}
                                    {...registerEmail('email')}
                                />
                                {emailErrors.email && <span className={styles.errorText}>{emailErrors.email.message}</span>}
                            </div>
                            <Button
                                type="submit"
                                variant="primary"
                                size="sm"
                                disabled={isUpdatingEmail}
                                className={styles.submitSmall}
                            >
                                {isUpdatingEmail ? <Loader2 className={styles.spin} size={16} /> : t('credentials.email.updateButton')}
                            </Button>
                        </form>
                    </div>

                    <div className={styles.profileFooter}>
                        <Link href="/profile" className={styles.editProfileBtn}>
                            {t('sections.profile.link')}
                            <ArrowRight size={16} />
                        </Link>
                    </div>
                </SettingsSection>

                {/* Security Section (Password) */}
                <SettingsSection
                    title={t('sections.credentials.title')}
                    description={t('sections.credentials.description')}
                >
                    <div className={styles.formCard}>
                        <div className={styles.formHeader}>
                            <Key size={18} className={styles.formIcon} />
                            <h3>{t('credentials.password.updateButton')}</h3>
                        </div>
                        <form onSubmit={handleSubmitPassword(onChangePassword)} className={styles.passwordForm}>
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>{t('credentials.password.labelCurrent')}</label>
                                    <input
                                        type="password"
                                        className={`${styles.input} ${passwordErrors.currentPassword ? styles.inputError : ''}`}
                                        placeholder={t('credentials.password.placeholderCurrent')}
                                        {...registerPassword('currentPassword')}
                                    />
                                    {passwordErrors.currentPassword && <span className={styles.errorText}>{passwordErrors.currentPassword.message}</span>}
                                </div>

                                <div className={styles.formGridRow}>
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>{t('credentials.password.labelNew')}</label>
                                        <input
                                            type="password"
                                            className={`${styles.input} ${passwordErrors.newPassword ? styles.inputError : ''}`}
                                            placeholder={t('credentials.password.placeholderNew')}
                                            {...registerPassword('newPassword')}
                                        />
                                        {passwordErrors.newPassword && <span className={styles.errorText}>{passwordErrors.newPassword.message}</span>}
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>{t('credentials.password.labelConfirm')}</label>
                                        <input
                                            type="password"
                                            className={`${styles.input} ${passwordErrors.confirmPassword ? styles.inputError : ''}`}
                                            placeholder={t('credentials.password.placeholderNew')}
                                            {...registerPassword('confirmPassword')}
                                        />
                                        {passwordErrors.confirmPassword && <span className={styles.errorText}>{passwordErrors.confirmPassword.message}</span>}
                                    </div>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                variant="primary"
                                disabled={isChangingPassword}
                                className={styles.passwordSubmit}
                            >
                                {isChangingPassword ? <Loader2 className={styles.spin} size={18} /> : t('credentials.password.updateButton')}
                            </Button>
                        </form>
                    </div>
                </SettingsSection>

                {/* Danger Zone */}
                <SettingsSection
                    title={t('sections.danger.title')}
                    description={t('sections.danger.description')}
                    danger
                >
                    <DeleteAccountZone />
                </SettingsSection>
            </div>
        </div>
    );
}
