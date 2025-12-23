"use client";

import { useTranslations } from "next-intl";
import styles from "./MissionVision.module.css";
import React from 'react';

export default function MissionVision() {
    const tMission = useTranslations("aboutPage.mission");
    const tVision = useTranslations("aboutPage.vision");

    const highlightText = (text: string) => {
        return text.replace(
            /<highlight>(.*?)<\/highlight>/g,
            `<span class="${styles.highlight}">$1</span>`
        );
    };

    return (
        <section className={styles.section}>
            <div className={styles.container}>
                <div className={styles.grid}>
                    <div className={styles.item}>
                        <h2
                            className={styles.title}
                            dangerouslySetInnerHTML={{ __html: highlightText(tMission.raw("title")) }}
                        />
                        <p className={styles.content}>
                            {tMission("content")}
                        </p>
                    </div>
                    <div className={styles.item}>
                        <h2
                            className={styles.title}
                            dangerouslySetInnerHTML={{ __html: highlightText(tVision.raw("title")) }}
                        />
                        <p className={styles.content}>
                            {tVision("content")}
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
