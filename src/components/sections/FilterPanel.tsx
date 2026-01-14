"use client";

import React, { ReactNode } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import styles from "./FilterPanel.module.css";

export interface FilterOption {
  value: string;
  label: string;
}

export interface Filter {
  name: string;
  label: string;
  type: "select" | "input" | "range" | "checkbox";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (value: any) => void;
  options?: FilterOption[];
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  icon?: ReactNode;
}

export interface FilterPanelProps {
  filters: Filter[];
  onApply?: () => void;
  onReset?: () => void;
  title?: string;
  className?: string;
  applyLabel?: string;
  resetLabel?: string;
  showButtons?: boolean;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onApply,
  onReset,
  title = "Filters",
  className = "",
  applyLabel = "Apply Filters",
  resetLabel = "Reset",
  showButtons = true,
}) => {
  const renderFilter = (filter: Filter) => {
    switch (filter.type) {
      case "select":
        return (
          <div key={filter.name} className={styles.filterGroup}>
            <label className={styles.label}>{filter.label}</label>
            <select
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              className={styles.select}
            >
              <option value="">All</option>
              {filter.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        );

      case "input":
        return (
          <div key={filter.name} className={styles.filterGroup}>
            <Input
              label={filter.label}
              type="text"
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              placeholder={filter.placeholder}
              leftIcon={filter.icon}
            />
          </div>
        );

      case "range":
        return (
          <div key={filter.name} className={styles.filterGroup}>
            <label className={styles.label}>
              {filter.label}
              {filter.value && (
                <span className={styles.rangeValue}> ({filter.value})</span>
              )}
            </label>
            <input
              type="range"
              min={filter.min || 0}
              max={filter.max || 100}
              step={filter.step || 1}
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              className={styles.range}
            />
            <div className={styles.rangeLabels}>
              <span>{filter.min || 0}</span>
              <span>{filter.max || 100}</span>
            </div>
          </div>
        );

      case "checkbox":
        return (
          <div key={filter.name} className={styles.filterGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={filter.value}
                onChange={(e) => filter.onChange(e.target.checked)}
                className={styles.checkbox}
              />
              <span>{filter.label}</span>
            </label>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`${styles.filterPanel} ${className}`}>
      {title && <h3 className={styles.title}>{title}</h3>}

      <div className={styles.filters}>
        {filters.map((filter) => renderFilter(filter))}
      </div>

      {showButtons && (onApply || onReset) && (
        <div className={styles.actions}>
          {onApply && (
            <Button variant="primary" onClick={onApply} fullWidth>
              {applyLabel}
            </Button>
          )}
          {onReset && (
            <Button variant="outline" onClick={onReset} fullWidth>
              {resetLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterPanel;
