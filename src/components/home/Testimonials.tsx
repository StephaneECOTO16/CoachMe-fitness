"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import styles from "./Testimonials.module.css";

export default function Testimonials() {
    const t = useTranslations("home.testimonials");
    const items = t.raw("items") as Array<{
        content: string;
        author: string;
        role: string;
    }>;

    // Group items into pairs for 2-per-slide display
    const groupedItems = [];
    for (let i = 0; i < items.length; i += 2) {
        groupedItems.push(items.slice(i, i + 2));
    }

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    // Auto-slide every 5 seconds
    useEffect(() => {
        if (isHovered) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % groupedItems.length);
        }, 5000);

        return () => clearInterval(interval);
    }, [groupedItems.length, isHovered]);

    const goToSlide = (index: number) => {
        setCurrentIndex(index);
    };

    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev - 1 + groupedItems.length) % groupedItems.length);
    };

    const goToNext = () => {
        setCurrentIndex((prev) => (prev + 1) % groupedItems.length);
    };

    return (
        <section className={styles.section}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h2
                        className={styles.title}
                        dangerouslySetInnerHTML={{
                            __html: t.raw("title").replace(
                                "<highlight>",
                                `<span class="${styles.highlight}">`
                            ).replace("</highlight>", "</span>")
                        }}
                    />
                    <p
                        className={styles.subtitle}
                        dangerouslySetInnerHTML={{
                            __html: t.raw("subtitle").replace(
                                "<highlight>",
                                `<span class="${styles.highlight}">`
                            ).replace("</highlight>", "</span>")
                        }}
                    />
                </div>

                <div
                    className={styles.carouselWrapper}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    <button
                        className={`${styles.navButton} ${styles.navButtonLeft}`}
                        onClick={goToPrevious}
                        aria-label="Previous testimonials"
                    >
                        <ChevronLeft size={24} />
                    </button>

                    <div className={styles.carouselTrack}>
                        {groupedItems.map((group, slideIndex) => (
                            <div
                                key={slideIndex}
                                className={`${styles.slide} ${slideIndex === currentIndex ? styles.slideActive : ""
                                    }`}
                                style={{
                                    transform: `translateX(${(slideIndex - currentIndex) * 100}%)`,
                                }}
                            >
                                {group.map((item, itemIndex) => (
                                    <div key={itemIndex} className={styles.card}>
                                        <div className={styles.stars}>
                                            {[...Array(5)].map((_, i) => (
                                                <Star
                                                    key={i}
                                                    size={16}
                                                    className={styles.star}
                                                    fill="currentColor"
                                                />
                                            ))}
                                        </div>
                                        <p className={styles.content}>{item.content}</p>
                                        <div className={styles.author}>
                                            <div className={styles.avatarWrapper}>
                                                <Image
                                                    src="/descipline.jpg"
                                                    alt={item.author}
                                                    fill
                                                    className={styles.avatar}
                                                />
                                            </div>
                                            <div className={styles.authorInfo}>
                                                <p className={styles.authorName}>{item.author}</p>
                                                <p className={styles.authorRole}>{item.role}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>

                    <button
                        className={`${styles.navButton} ${styles.navButtonRight}`}
                        onClick={goToNext}
                        aria-label="Next testimonials"
                    >
                        <ChevronRight size={24} />
                    </button>

                    <div className={styles.dots}>
                        {groupedItems.map((_, index) => (
                            <button
                                key={index}
                                className={`${styles.dot} ${index === currentIndex ? styles.dotActive : ""
                                    }`}
                                onClick={() => goToSlide(index)}
                                aria-label={`Go to slide ${index + 1}`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
