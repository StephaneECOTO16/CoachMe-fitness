"use client";

import React from "react";
import { Link } from "@/i18n/routing";
import styles from "./QuickActionsSection.module.css";

type IconComponent = React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

export type QuickActionItem = {
  href: string;
  title: string;
  description: string;
  icon: IconComponent;
};

export default function QuickActionsSection({
  title,
  actions,
  className,
  titleClassName,
}: {
  title: string;
  actions: QuickActionItem[];
  className?: string;
  titleClassName?: string;
}) {
  return (
    <section className={className}>
      <h2 className={titleClassName}>{title}</h2>
      <div className={styles.quickActions}>
        {actions.map((action) => (
          <Link key={action.href} href={action.href} className={styles.actionCard}>
            <div className={styles.actionIconWrapper}>
              <action.icon className={styles.actionIcon} aria-hidden />
            </div>
            <h3 className={styles.actionTitle}>{action.title}</h3>
            <p className={styles.actionDescription}>{action.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
