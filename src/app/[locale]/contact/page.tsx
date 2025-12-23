import ContactHero from '@/components/contact/ContactHero';
import ContactForm from '@/components/contact/ContactForm';
import ContactInfo from '@/components/contact/ContactInfo';
import ContactMap from '@/components/contact/ContactMap';
import FAQSection from '@/components/contact/FAQSection';
import React from 'react';
import { useTranslations } from 'next-intl';
import styles from './ContactPage.module.css';

export default function ContactPage() {
    return (
        <main>
            <ContactHero />
            <div className={styles.container}>
                <div className={styles.grid}>
                    {/* Mobile: Info first, then Map, then Form */}
                    {/* Desktop: Form left, Info/Map right */}

                    <div className={styles.formColumn}>
                        <ContactForm />
                    </div>

                    <div className={styles.infoColumn}>
                        <ContactInfo />
                        <ContactMap />
                    </div>
                </div>
            </div>
            <FAQSection />
        </main>
    );
}
