'use client';

import React, { ReactNode } from 'react';
import Button from './Button';
import styles from './EmptyState.module.css';

export interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  icon?: ReactNode;
}

export interface EmptyStateProps {
  icon?: string | ReactNode;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  children?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  children,
  size = 'md',
  className = '',
}) => {
  const renderIcon = () => {
    if (!icon) return null;

    if (typeof icon === 'string') {
      return <span className={styles.emoji}>{icon}</span>;
    }

    return <div className={styles.iconWrapper}>{icon}</div>;
  };

  const sizeClass = styles[`size${size.charAt(0).toUpperCase() + size.slice(1)}`];

  return (
    <div className={`${styles.emptyState} ${sizeClass} ${className}`}>
      {renderIcon()}

      <h3 className={styles.title}>{title}</h3>

      {description && <p className={styles.description}>{description}</p>}

      {action && (
        <div className={styles.action}>
          <Button
            variant={action.variant || 'primary'}
            onClick={action.onClick}
            href={action.href}
            leftIcon={action.icon}
          >
            {action.label}
          </Button>
        </div>
      )}

      {children && <div className={styles.content}>{children}</div>}
    </div>
  );
};

export default EmptyState;
