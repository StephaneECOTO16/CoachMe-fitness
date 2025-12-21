"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { Users, ShieldCheck, TrendingUp } from "lucide-react";
import styles from "./AboutSection.module.css";
import React from 'react';

export default function AboutSection() {
    const t = useTranslations("home.about");

    const highlightText = (text: string) => {
        return text.replace(
            /<highlight>(.*?)<\/highlight>/g,
            `<span class="${styles.highlight}">$1</span>`
        );
    };

    return (
        <section className={styles.section}>
            <div className={styles.container}>
                {/* Content Column */}
                <div className={styles.content}>
                    <span className={styles.eyebrow}>{t("eyebrow")}</span>

                    <h2
                        className={styles.title}
                        dangerouslySetInnerHTML={{ __html: highlightText(t.raw("title")) }}
                    />

                    <p
                        className={styles.description}
                        dangerouslySetInnerHTML={{ __html: highlightText(t.raw("description")) }}
                    />

                    <div className={styles.features}>
                        <div className={styles.featureItem}>
                            <div className={styles.iconWrapper}>
                                <Users size={24} />
                            </div>
                            <div className={styles.featureText}>
                                <h3 className={styles.featureTitle}>{t("features.access.title")}</h3>
                                <p className={styles.featureDesc}>{t("features.access.description")}</p>
                            </div>
                        </div>

                        <div className={styles.featureItem}>
                            <div className={styles.iconWrapper}>
                                <ShieldCheck size={24} />
                            </div>
                            <div className={styles.featureText}>
                                <h3 className={styles.featureTitle}>{t("features.expertise.title")}</h3>
                                <p
                                    className={styles.featureDesc}
                                    dangerouslySetInnerHTML={{ __html: highlightText(t.raw("features.expertise.description")) }}
                                />
                            </div>
                        </div>

                        <div className={styles.featureItem}>
                            <div className={styles.iconWrapper}>
                                <TrendingUp size={24} />
                            </div>
                            <div className={styles.featureText}>
                                <h3 className={styles.featureTitle}>{t("features.growth.title")}</h3>
                                <p className={styles.featureDesc}>{t("features.growth.description")}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Visual Column */}
                <div className={styles.visuals}>
                    <div className={styles.decoration} />
                    <div className={styles.imageWrapper}>
                        <Image
                            src="/about-community.png"
                            alt="CoachMe Community"
                            fill
                            className={styles.image}
                            sizes="(max-width: 768px) 100vw, 50vw"
                        />
                    </div>
                    <div className={styles.floatingCard}>
                        <span className={styles.statValue}>{t("stats.trust")}</span>
                        <span className={styles.statLabel}>{t("stats.standard")}</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
