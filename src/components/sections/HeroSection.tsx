"use client";

import React, { ReactNode } from "react";
// import AnimatedName from '@/components/ui/animated-name';
import styles from "./HeroSection.module.css";
import { AnimatedName } from "../ui/animated-name";

export interface HeroButton {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "secondary" | "outline";
}

export interface HeroSectionProps {
  title: string | ReactNode;
  subtitle?: string;
  backgroundImage?: string;
  overlayOpacity?: number;
  buttons?: HeroButton[];
  useAnimatedName?: boolean;
  userName?: string;
  height?: "small" | "medium" | "large" | "full";
  align?: "left" | "center" | "right";
  className?: string;
}

const HeroSection: React.FC<HeroSectionProps> = ({
  title,
  subtitle,
  backgroundImage,
  overlayOpacity = 0.5,
  buttons = [],
  useAnimatedName = false,
  userName,
  height = "medium",
  align = "center",
  className = "",
}) => {
  const renderTitle = () => {
    if (useAnimatedName && userName) {
      return (
        <h1 className={styles.title}>
          <AnimatedName name={userName} />
        </h1>
      );
    }

    if (typeof title === "string") {
      return <h1 className={styles.title}>{title}</h1>;
    }

    return title;
  };

  const getButtonClass = (variant?: string) => {
    switch (variant) {
      case "secondary":
        return styles.buttonSecondary;
      case "outline":
        return styles.buttonOutline;
      default:
        return styles.buttonPrimary;
    }
  };

  return (
    <section
      className={`${styles.hero} ${
        styles[`hero${height.charAt(0).toUpperCase() + height.slice(1)}`]
      } ${
        styles[`align${align.charAt(0).toUpperCase() + align.slice(1)}`]
      } ${className}`}
      style={{
        backgroundImage: backgroundImage
          ? `url(${backgroundImage})`
          : undefined,
      }}
    >
      {backgroundImage && (
        <div className={styles.overlay} style={{ opacity: overlayOpacity }} />
      )}

      <div className={styles.content}>
        {renderTitle()}

        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}

        {buttons.length > 0 && (
          <div className={styles.buttons}>
            {buttons.map((button, index) =>
              button.href ? (
                <a
                  key={index}
                  href={button.href}
                  className={`${styles.button} ${getButtonClass(
                    button.variant
                  )}`}
                >
                  {button.label}
                </a>
              ) : (
                <button
                  key={index}
                  onClick={button.onClick}
                  className={`${styles.button} ${getButtonClass(
                    button.variant
                  )}`}
                >
                  {button.label}
                </button>
              )
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default HeroSection;
