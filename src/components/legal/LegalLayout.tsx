import React from 'react';
import styles from './LegalLayout.module.css';

interface Section {
    title?: string;
    content: string;
    items?: string[];
}

interface LegalLayoutProps {
    title: string;
    lastUpdatedLabel: string;
    lastUpdated: string;
    sections: Section[];
}

export default function LegalLayout({ title, lastUpdatedLabel, lastUpdated, sections }: LegalLayoutProps) {
    return (
        <main className={styles.legalMain}>
            <div className={styles.container}>
                <header className={styles.header}>
                    <h1 className={styles.title}>{title}</h1>
                    <p className={styles.lastUpdated}>{lastUpdatedLabel} {lastUpdated}</p>
                </header>
                <div className={styles.content}>
                    {sections.map((section, index) => (
                        <section key={index} className={styles.section}>
                            {section.title && <h2>{section.title}</h2>}
                            <p>{section.content}</p>
                            {section.items && (
                                <ul>
                                    {section.items.map((item, i) => (
                                        <li key={i}>{item}</li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    ))}
                </div>
            </div>
        </main>
    );
}
