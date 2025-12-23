"use client";

import { useTranslations } from "next-intl";
import { Shield, Users, Target, Zap } from "lucide-react";
import styles from "./CoreValues.module.css";
import React from 'react';

export default function CoreValues() {
    const t = useTranslations("aboutPage.values");

    const highlightText = (text: string) => {
        return text.replace(
            /<highlight>(.*?)<\/highlight>/g,
            `<span class="${styles.highlight}">$1</span>`
        );
    };

    const values = [
        {
            key: "excellence",
            icon: <Shield size={28} />,
        },
        {
            key: "accessibility",
            icon: <Target size={28} />,
        },
        {
            key: "community",
            icon: <Users size={28} />,
        },
        {
            key: "transparency",
            icon: <Zap size={28} />,
        },
    ];

    return (
        <section className={styles.section}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h2
                        className={styles.title}
                        dangerouslySetInnerHTML={{ __html: highlightText(t.raw("title")) }}
                    />
                </div>
                <div className={styles.grid}>
                    {values.map((value) => (
                        <div key={value.key} className={styles.card}>
                            <div className={styles.iconWrapper}>
                                {value.icon}
                            </div>
                            <h3 className={styles.cardTitle}>{t(`${value.key}.title`)}</h3>
                            <p className={styles.description}>
                                {t(`${value.key}.description`)}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
