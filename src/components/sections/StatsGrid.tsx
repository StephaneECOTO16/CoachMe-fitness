'use client';

import React, { ReactNode } from 'react';
import styles from './StatsGrid.module.css';

export interface StatItem {
  icon: string | ReactNode;
  value: number | string;
  label: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  color?: string;
}

export interface StatsGridProps {
  stats: StatItem[];
  columns?: 2 | 3 | 4;
  className?: string;
}

const StatsGrid: React.FC<StatsGridProps> = ({
  stats,
  columns = 3,
  className = '',
}) => {
  const renderIcon = (icon: string | ReactNode) => {
    if (typeof icon === 'string') {
      return <span className={styles.emoji}>{icon}</span>;
    }
    return <div className={styles.iconWrapper}>{icon}</div>;
  };

  const renderTrend = (trend?: { value: number; direction: 'up' | 'down' }) => {
    if (!trend) return null;

    const isPositive = trend.direction === 'up';
    return (
      <span className={`${styles.trend} ${isPositive ? styles.trendUp : styles.trendDown}`}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          {isPositive ? (
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          ) : (
            <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
          )}
        </svg>
        {trend.value}%
      </span>
    );
  };

  return (
    <div
      className={`${styles.statsGrid} ${styles[`columns${columns}`]} ${className}`}
    >
      {stats.map((stat, index) => (
        <div
          key={index}
          className={styles.statCard}
          style={stat.color ? { borderTopColor: stat.color } : undefined}
        >
          <div className={styles.cardHeader}>
            {renderIcon(stat.icon)}
            {renderTrend(stat.trend)}
          </div>
          <div className={styles.statValue}>{stat.value}</div>
          <div className={styles.statLabel}>{stat.label}</div>
        </div>
      ))}
    </div>
  );
};

export default StatsGrid;
