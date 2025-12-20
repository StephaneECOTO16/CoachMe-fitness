import React from 'react';
import styles from './SettingsSection.module.css';

interface SettingsSectionProps {
    title: string;
    description?: string;
    children: React.ReactNode;
    className?: string;
    danger?: boolean;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({
    title,
    description,
    children,
    className = '',
    danger = false
}) => {
    return (
        <section className={`${styles.section} ${danger ? styles.danger : ''} ${className}`}>
            <div className={styles.header}>
                <h2 className={styles.title}>{title}</h2>
                {description && <p className={styles.description}>{description}</p>}
            </div>
            <div className={styles.content}>
                {children}
            </div>
        </section>
    );
};

export default SettingsSection;
