'use client';

import React, { ReactNode } from 'react';
import styles from './TabNavigation.module.css';

export interface Tab {
  id: string;
  label: string;
  count?: number;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'default' | 'pills' | 'underline';
  fullWidth?: boolean;
  className?: string;
}

const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'default',
  fullWidth = false,
  className = '',
}) => {
  return (
    <div
      className={`${styles.tabNavigation} ${styles[variant]} ${fullWidth ? styles.fullWidth : ''} ${className}`}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => !tab.disabled && onChange(tab.id)}
          className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''} ${tab.disabled ? styles.disabled : ''}`}
          disabled={tab.disabled}
          aria-selected={activeTab === tab.id}
          role="tab"
        >
          {tab.icon && <span className={styles.icon}>{tab.icon}</span>}
          <span className={styles.label}>{tab.label}</span>
          {tab.count !== undefined && (
            <span className={styles.count}>{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
};

export default TabNavigation;
