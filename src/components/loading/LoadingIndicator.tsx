"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import styles from "./LoadingIndicator.module.css";

export type LoadingIndicatorVariant = "ring" | "icon";

export interface LoadingIndicatorProps {
  label?: React.ReactNode;
  className?: string;
  size?: number;
  thickness?: number;
  variant?: LoadingIndicatorVariant;
  unstyledLabel?: boolean;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  label,
  className = "",
  size,
  thickness,
  variant = "ring",
  unstyledLabel = false,
}) => {
  const styleVars: React.CSSProperties = {
    ...(size ? { ["--loading-size" as string]: `${size}px` } : {}),
    ...(thickness
      ? { ["--loading-thickness" as string]: `${thickness}px` }
      : {}),
  };

  return (
    <div
      className={`${styles.container} ${className}`}
      style={styleVars}
      aria-busy="true"
    >
      {variant === "icon" ? (
        <Loader2 className={styles.icon} />
      ) : (
        <div className={styles.spinner} />
      )}
      {label !== undefined && label !== null ? (
        <p className={unstyledLabel ? undefined : styles.label}>{label}</p>
      ) : null}
    </div>
  );
};

export default LoadingIndicator;
