"use client";

import LegalLayout from '@/components/legal/LegalLayout';
import { useTranslations } from 'next-intl';
import React from 'react';

export default function TermsPage() {
    const t = useTranslations('legal');
    const p = useTranslations('legal.terms');

    return (
        <LegalLayout
            title={p('title')}
            lastUpdatedLabel={t('lastUpdated')}
            lastUpdated={p('date')}
            sections={p.raw('sections')}
        />
    );
}
