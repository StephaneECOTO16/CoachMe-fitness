"use client";

import { useTranslations } from "next-intl";
import styles from "./AboutStory.module.css";
import React from 'react';

export default function AboutStory() {
    const t = useTranslations("aboutPage.story");

    const highlightText = (text: string) => {
        return text.replace(
            /<highlight>(.*?)<\/highlight>/g,
            `<span class="${styles.highlight}">$1</span>`
        );
    };

    const timelineKeys = ["2023", "2024", "today"];

    return (
        <section className={styles.section}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h2
                        className={styles.title}
                        dangerouslySetInnerHTML={{ __html: highlightText(t.raw("title")) }}
                    />
                    <p className={styles.intro}>{t("intro")}</p>
                </div>

                <div className={styles.timeline}>
                    {timelineKeys.map((key) => (
                        <div key={key} className={styles.milestone}>
                            <div className={styles.dot} />
                            <div className={styles.milestoneContent}>
                                <span className={styles.year}>{key === "today" ? "2025" : key}</span>
                                <h3 className={styles.milestoneTitle}>{t(`timeline.${key}.title`)}</h3>
                                <p className={styles.milestoneDescription}>
                                    {t(`timeline.${key}.description`)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
