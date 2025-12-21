"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import styles from "./HomeCTA.module.css";
import React from 'react';

export default function HomeCTA() {
    const t = useTranslations("home.cta");

    const highlightText = (text: string) => {
        return text.replace(
            /<highlight>(.*?)<\/highlight>/g,
            `<span class="${styles.highlight}">$1</span>`
        );
    };

    return (
        <section className={styles.section}>
            <div className={styles.container}>
                <h2
                    className={styles.title}
                    dangerouslySetInnerHTML={{ __html: highlightText(t.raw("title")) }}
                />
                <p className={styles.description}>
                    {t("description")}
                </p>
                <div className={styles.buttonWrapper}>
                    <Link href="/coaches" className={styles.button}>
                        <span>{t("button")}</span>
                        <ArrowRight size={20} className={styles.icon} />
                    </Link>
                </div>
            </div>
        </section>
    );
}
