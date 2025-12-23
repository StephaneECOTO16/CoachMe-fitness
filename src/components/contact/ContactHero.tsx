"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import styles from "./ContactHero.module.css";
import React from 'react';

export default function ContactHero() {
    const t = useTranslations("contactPage.hero");

    const highlightText = (text: string) => {
        return text.replace(
            /<highlight>(.*?)<\/highlight>/g,
            `<span class="${styles.highlight}">$1</span>`
        );
    };

    return (
        <section className={styles.hero}>
            <Image
                src="/about-hero-generated.png"
                alt="Contact CoachMe"
                fill
                className={styles.heroImage}
                priority
            />
            <div className={styles.overlay} />
            <div className={styles.content}>
                <h1
                    className={styles.title}
                    dangerouslySetInnerHTML={{ __html: highlightText(t.raw("title")) }}
                />
                <p className={styles.subtitle}>
                    {t("subtitle")}
                </p>
            </div>
        </section>
    );
}
