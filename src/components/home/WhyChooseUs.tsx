"use client";

import { useTranslations } from "next-intl";
import { Award, MapPin, Calendar } from "lucide-react";
import styles from "./WhyChooseUs.module.css";
import React, { useRef, useState, useEffect } from 'react';

export default function WhyChooseUs() {
    const t = useTranslations("home.whyChooseUs");
    const scrollRef = useRef<HTMLDivElement>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    const highlightText = (text: string) => {
        return text.replace(
            /<highlight>(.*?)<\/highlight>/g,
            `<span class="${styles.highlight}">$1</span>`
        );
    };

    const features = [
        {
            icon: <Award size={32} />,
            title: t("features.certified.title"),
            description: t("features.certified.description"),
        },
        {
            icon: <MapPin size={32} />,
            title: t("features.community.title"),
            description: t("features.community.description"),
        },
        {
            icon: <Calendar size={32} />,
            title: t("features.flexible.title"),
            description: t("features.flexible.description"),
        },
    ];

    const handleScroll = () => {
        if (!scrollRef.current) return;
        const scrollPosition = scrollRef.current.scrollLeft;
        const cardWidth = scrollRef.current.offsetWidth;
        const newIndex = Math.round(scrollPosition / cardWidth);
        if (newIndex !== activeIndex) {
            setActiveIndex(newIndex);
        }
    };

    const scrollTo = (index: number) => {
        if (!scrollRef.current) return;
        const cardWidth = scrollRef.current.offsetWidth;
        scrollRef.current.scrollTo({
            left: index * cardWidth,
            behavior: 'smooth'
        });
    };

    return (
        <section className={styles.section}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h2
                        className={styles.title}
                        dangerouslySetInnerHTML={{ __html: highlightText(t.raw("title")) }}
                    />
                    <p className={styles.subtitle}>{t("subtitle")}</p>
                </div>

                <div
                    className={styles.grid}
                    ref={scrollRef}
                    onScroll={handleScroll}
                >
                    {features.map((feature, index) => (
                        <div key={index} className={styles.card}>
                            <div className={styles.iconWrapper}>
                                {feature.icon}
                            </div>
                            <h3 className={styles.cardTitle}>{feature.title}</h3>
                            <p className={styles.cardDescription}>{feature.description}</p>
                        </div>
                    ))}
                </div>

                <div className={styles.dots}>
                    {features.map((_, index) => (
                        <button
                            key={index}
                            className={`${styles.dot} ${index === activeIndex ? styles.activeDot : ""}`}
                            onClick={() => scrollTo(index)}
                            aria-label={`Go to slide ${index + 1}`}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
