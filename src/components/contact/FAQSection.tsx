"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import styles from "./FAQSection.module.css";
import React from 'react';

export default function FAQSection() {
    const t = useTranslations("contactPage.faq");
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const highlightText = (text: string) => {
        return text.replace(
            /<highlight>(.*?)<\/highlight>/g,
            `<span class="${styles.highlight}">$1</span>`
        );
    };

    const toggleAccordion = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    const keys = ["q1", "q2", "q3"];

    return (
        <section className={styles.section}>
            <div className={styles.container}>
                <h2
                    className={styles.title}
                    dangerouslySetInnerHTML={{ __html: highlightText(t.raw("title")) }}
                />
                <div className={styles.accordion}>
                    {keys.map((key, index) => (
                        <div key={key} className={styles.item}>
                            <button
                                className={styles.question}
                                onClick={() => toggleAccordion(index)}
                            >
                                {t(`items.${key}.question`)}
                                {openIndex === index ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                            {openIndex === index && (
                                <div className={styles.answer}>
                                    {t(`items.${key}.answer`)}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
