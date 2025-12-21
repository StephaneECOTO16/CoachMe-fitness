"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Users, ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./DisciplinesSection.module.css";
import React from 'react';

interface Discipline {
    id: number;
    name: string;
    imageUrl: string | null;
    coachCount: number;
}

export default function DisciplinesSection() {
    const t = useTranslations("home.disciplines");
    const [disciplines, setDisciplines] = useState<Discipline[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeIndex, setActiveIndex] = useState(0);
    const [pageCount, setPageCount] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchDisciplines = async () => {
            try {
                const res = await fetch("/api/disciplines");
                const data = await res.json();
                if (data.success) {
                    setDisciplines(data.disciplines);
                }
            } catch (error) {
                console.error("Error fetching disciplines:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDisciplines();
    }, []);

    useEffect(() => {
        const updatePageCount = () => {
            if (scrollRef.current) {
                const count = Math.ceil(
                    scrollRef.current.scrollWidth / scrollRef.current.offsetWidth
                );
                setPageCount(count || 0);
            }
        };

        updatePageCount();
        window.addEventListener('resize', updatePageCount);
        // Observe content changes as well
        const observer = new ResizeObserver(updatePageCount);
        if (scrollRef.current) observer.observe(scrollRef.current);

        return () => {
            window.removeEventListener('resize', updatePageCount);
            observer.disconnect();
        };
    }, [disciplines]);

    const handleScroll = () => {
        if (!scrollRef.current) return;
        const scrollPosition = scrollRef.current.scrollLeft;
        const viewportWidth = scrollRef.current.offsetWidth;
        const newIndex = Math.round(scrollPosition / viewportWidth);

        if (newIndex !== activeIndex) {
            setActiveIndex(newIndex);
        }
    };

    const scrollTo = (direction: 'next' | 'prev' | number) => {
        if (!scrollRef.current) return;
        const viewportWidth = scrollRef.current.offsetWidth;
        let targetLeft = 0;

        if (typeof direction === 'number') {
            targetLeft = direction * viewportWidth;
        } else if (direction === 'next') {
            targetLeft = scrollRef.current.scrollLeft + viewportWidth;
        } else {
            targetLeft = scrollRef.current.scrollLeft - viewportWidth;
        }

        scrollRef.current.scrollTo({
            left: targetLeft,
            behavior: 'smooth'
        });
    };

    const highlightText = (text: string) => {
        return text.replace(
            /<highlight>(.*?)<\/highlight>/g,
            `<span class="${styles.highlight}">$1</span>`
        );
    };

    if (loading || disciplines.length === 0) return null;

    return (
        <section className={styles.section}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div className={styles.headerText}>
                        <h2
                            className={styles.title}
                            dangerouslySetInnerHTML={{ __html: highlightText(t.raw("title")) }}
                        />
                        <p className={styles.subtitle}>{t("subtitle")}</p>
                    </div>

                    <div className={styles.controls}>
                        <button
                            className={styles.arrowBtn}
                            onClick={() => scrollTo('prev')}
                            disabled={activeIndex === 0}
                            aria-label="Previous disciplines"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <button
                            className={styles.arrowBtn}
                            onClick={() => scrollTo('next')}
                            disabled={activeIndex >= pageCount - 1}
                            aria-label="Next disciplines"
                        >
                            <ChevronRight size={24} />
                        </button>
                    </div>
                </div>

                <div
                    className={styles.grid}
                    ref={scrollRef}
                    onScroll={handleScroll}
                >
                    {disciplines.map((discipline) => (
                        <div key={discipline.id} className={styles.cardWrapper}>
                            <div className={styles.card}>
                                <Image
                                    src={discipline.imageUrl || "/descipline.PNG"}
                                    alt={discipline.name}
                                    fill
                                    className={styles.image}
                                    sizes="320px"
                                />
                                <div className={styles.overlay}>
                                    <h3 className={styles.disciplineName}>{discipline.name}</h3>
                                    <div className={styles.coachCount}>
                                        <Users size={14} className={styles.icon} />
                                        <span>{t("coachCount", { count: discipline.coachCount })}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className={styles.dots}>
                    {Array.from({ length: pageCount }).map((_, index) => (
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
