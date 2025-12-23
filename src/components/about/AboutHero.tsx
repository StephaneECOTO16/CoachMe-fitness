"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import styles from "./AboutHero.module.css";
import React from 'react';

export default function AboutHero() {
    const t = useTranslations("aboutPage.hero");

    const highlightText = (text: string) => {
        return text.replace(
            /<highlight>(.*?)<\/highlight>/g,
            `<span class="${styles.highlight}">$1</span>`
        );
    };

    return (
        <section className={styles.hero}>
            <video
                autoPlay
                loop
                muted
                playsInline
                className={styles.heroVideo}
            >
                <source src="/videos/about-hero.mp4" type="video/mp4" />
                {/* Fallback image if video fails to load or is not yet provided */}
                <Image
                    src="/about-hero-generated.png"
                    alt="CoachMe Community"
                    fill
                    className={styles.heroImage}
                    priority
                />
            </video>
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
