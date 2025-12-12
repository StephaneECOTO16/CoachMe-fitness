"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import styles from "./LanguageToggle.module.css";

export default function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleLanguageChange = (newLocale: "en" | "fr") => {
    if (newLocale === locale) return;

    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
    });
  };

  return (
    <div
      className={cn(styles.languageToggle, isPending && "opacity-50")}
      role="radiogroup"
      aria-label="Language selection"
    >
      <div
        className={cn(styles.option, locale === "en" && styles.active)}
        onClick={() => handleLanguageChange("en")}
        role="radio"
        aria-checked={locale === "en"}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleLanguageChange("en");
          }
        }}
      >
        EN
      </div>
      <div
        className={cn(styles.option, locale === "fr" && styles.active)}
        onClick={() => handleLanguageChange("fr")}
        role="radio"
        aria-checked={locale === "fr"}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleLanguageChange("fr");
          }
        }}
      >
        FR
      </div>
      <div className={cn(styles.slider, locale === "fr" && styles.right)} />
    </div>
  );
}
