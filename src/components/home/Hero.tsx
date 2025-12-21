"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, MessageSquare, Globe, Star, Users, Share2, Play } from "lucide-react";
import styles from "./Hero.module.css";
import React from 'react';

export default function HomeHero() {
    const t = useTranslations("home.hero");

    return (
        <section className={styles.hero}>
            <div className={styles.container}>
                {/* Left Content Column */}
                <div className={styles.contentLeft}>
                    <span className={styles.label}>{t("smallLabel")}</span>

                    <h1 className={styles.title}
                        dangerouslySetInnerHTML={{
                            __html: t.raw("title").replace(
                                "<highlight>",
                                `<span class="${styles.highlight}">`
                            ).replace("</highlight>", "</span>")
                        }}
                    />

                    <p className={styles.subtitle}>{t("subtitle")}</p>

                    <div className={styles.tags}>
                        <div className={styles.tag}>
                            <CheckCircle2 className={styles.tagIcon} />
                            <span>{t("tags.verified")}</span>
                        </div>
                        <div className={styles.tag}>
                            <MessageSquare className={styles.tagIcon} />
                            <span>{t("tags.messaging")}</span>
                        </div>
                        <div className={styles.tag}>
                            <Globe className={styles.tagIcon} />
                            <span>{t("tags.global")}</span>
                        </div>
                    </div>

                    <div className={styles.actions}>
                        <Link href="/coaches" className={styles.btnPrimary}>
                            <Users size={20} />
                            {t("ctafind")}
                        </Link>
                        <Link href="/register" className={styles.btnSecondary}>
                            {t("ctaMember")}
                        </Link>
                    </div>

                    {/* <p className={styles.footerText}>{t("noAlgorithms")}</p> */}
                </div>

                {/* Right Image Column */}
                <div className={styles.contentRight}>
                    <div className={styles.imageWrapper}>
                        <Image
                            src="/hero-coach.jpg"
                            alt="Professional Coach"
                            fill
                            priority
                            className={styles.heroImage}
                            sizes="(max-width: 768px) 100vw, 50vw"
                        />
                    </div>

                    {/* Stats Overlay Card */}
                    <div className={styles.statsCard}>
                        <div className={styles.statItem}>
                            <span className={styles.statValue}>4.9/5</span>
                            <span className={styles.statLabel}>{t("stats.rating")}</span>
                        </div>
                        <div className={styles.statDivider} />
                        <div className={styles.statItem}>
                            <span className={styles.statValue}>1.2k+</span>
                            <span className={styles.statLabel}>{t("stats.agreements")}</span>
                        </div>
                    </div>

                    {/* Floating Actions */}
                    <div className={styles.floatingActions}>
                        <button className={styles.floatBtn} aria-label="Share">
                            <Share2 size={20} />
                        </button>
                        <button className={styles.floatBtn} aria-label="Watch Video">
                            <Play size={20} fill="currentColor" />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
