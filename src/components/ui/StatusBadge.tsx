'use client';

import React, { ReactNode } from 'react';
import styles from './StatusBadge.module.css';

export type StatusType =
  | 'APPROVED'
  | 'PENDING'
  | 'REJECTED'
  | 'CERTIFIED'
  | 'VERIFIED'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'COMPLETED'
  | 'IN_PROGRESS'
  | 'CANCELLED';

export interface StatusBadgeProps {
  status: StatusType | string;
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  icon,
  className = '',
}) => {
  const getStatusClass = () => {
    const statusUpper = status.toUpperCase();
    switch (statusUpper) {
      case 'APPROVED':
      case 'VERIFIED':
      case 'CERTIFIED':
      case 'ACTIVE':
      case 'COMPLETED':
        return styles.success;
      case 'PENDING':
      case 'IN_PROGRESS':
        return styles.warning;
      case 'REJECTED':
      case 'CANCELLED':
      case 'INACTIVE':
        return styles.danger;
      default:
        return styles.default;
    }
  };

  const sizeClass = styles[`size${size.charAt(0).toUpperCase() + size.slice(1)}`];

  return (
    <span className={`${styles.badge} ${getStatusClass()} ${sizeClass} ${className}`}>
      {icon && <span className={styles.icon}>{icon}</span>}
      {status}
    </span>
  );
};

export default StatusBadge;
