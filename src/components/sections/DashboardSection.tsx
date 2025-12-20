'use client';

import React, { ReactNode } from 'react';
import Link from 'next/link';
import styles from './DashboardSection.module.css';

export interface DashboardSectionAction {
  label: string;
  onClick?: () => void;
  href?: string;
  icon?: ReactNode;
}

export interface DashboardSectionProps {
  title: string;
  headerAction?: DashboardSectionAction;
  action?: ReactNode; // Added to support custom action nodes
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  noPadding?: boolean;
}

const DashboardSection: React.FC<DashboardSectionProps> = ({
  title,
  headerAction,
  action,
  children,
  className = '',
  contentClassName = '',
  noPadding = false,
}) => {
  return (
    <section className={`${styles.section} ${className}`}>
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        {action ? (
          action
        ) : headerAction && (
          <>
            {headerAction.href ? (
              <Link href={headerAction.href} className={styles.action}>
                {headerAction.icon && (
                  <span className={styles.actionIcon}>{headerAction.icon}</span>
                )}
                {headerAction.label}
              </Link>
            ) : (
              <button onClick={headerAction.onClick} className={styles.action}>
                {headerAction.icon && (
                  <span className={styles.actionIcon}>{headerAction.icon}</span>
                )}
                {headerAction.label}
              </button>
            )}
          </>
        )}
      </div>
      <div className={`${styles.content} ${noPadding ? styles.noPadding : ''} ${contentClassName}`}>
        {children}
      </div>
    </section>
  );
};

export default DashboardSection;
