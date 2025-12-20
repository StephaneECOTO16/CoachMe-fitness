"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import styles from "./LoadingIndicator.module.css";

export type LoadingIndicatorVariant = "ring" | "icon";
export type LoadingIndicatorSize = "sm" | "md" | "lg" | "xl" | number;

export interface LoadingIndicatorProps {
  label?: React.ReactNode;
  className?: string;
  size?: LoadingIndicatorSize;
  thickness?: number;
  variant?: LoadingIndicatorVariant;
  unstyledLabel?: boolean;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  label,
  className = "",
  size = "lg",
  thickness,
  variant = "ring",
  unstyledLabel = false,
}) => {
  // Helper to determine dimensions based on size prop
  const getDimensions = (s: LoadingIndicatorSize) => {
    if (typeof s === "number") {
      return { size: s, thickness: thickness || 6 }; // Default thickness for custom numbers
    }

    switch (s) {
      case "sm": return { size: 24, thickness: thickness || 2 };
      case "md": return { size: 40, thickness: thickness || 4 };
      case "xl": return { size: 80, thickness: thickness || 8 };
      case "lg":
      default: return { size: 64, thickness: thickness || 6 };
    }
  };

  const dims = getDimensions(size);

  const styleVars: React.CSSProperties = {
    ["--loading-size" as string]: `${dims.size}px`,
    ["--loading-thickness" as string]: `${dims.thickness}px`,
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
