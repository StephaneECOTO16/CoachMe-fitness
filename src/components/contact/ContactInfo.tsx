"use client";

import { useTranslations } from "next-intl";
import { Mail, Phone, MapPin } from "lucide-react";
import styles from "./ContactInfo.module.css";
import React from 'react';

export default function ContactInfo() {
    const t = useTranslations("contactPage.info");

    return (
        <div className={styles.grid}>
            <div className={styles.card}>
                <div className={styles.iconWrapper}>
                    <Mail size={24} />
                </div>
                <div className={styles.details}>
                    <span className={styles.label}>{t("email")}</span>
                    <a href="mailto:info@ecotofitness.com" className={styles.value + " " + styles.link}>
                        info@ecotofitness.com
                    </a>
                </div>
            </div>

            <div className={styles.card}>
                <div className={styles.iconWrapper}>
                    <Phone size={24} />
                </div>
                <div className={styles.details}>
                    <span className={styles.label}>{t("phone")}</span>
                    <a href="tel:+237659037423" className={styles.value + " " + styles.link}>
                        (+237) 659 037 423
                    </a>
                </div>
            </div>

            <div className={styles.card}>
                <div className={styles.iconWrapper}>
                    <MapPin size={24} />
                </div>
                <div className={styles.details}>
                    <span className={styles.label}>{t("location")}</span>
                    <span className={styles.value}>
                        DOUALA-BONAMOUSSADI.
                        CARREFOUR KM.
                    </span>
                </div>
            </div>
        </div>
    );
}
