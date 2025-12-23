'use client';

import React from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import styles from './DisciplinesList.module.css';

export interface DisciplineStat {
    id: number;
    name: string;
    coachCount: number;
    imageUrl: string | null;
}

interface DisciplinesListProps {
    disciplines: DisciplineStat[];
    onAddNew?: () => void;
}

const DisciplinesList: React.FC<DisciplinesListProps> = ({
    disciplines,
    onAddNew
}) => {
    const t = useTranslations('admin.dashboard');

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>{t('disciplines')}</h2>
                <button className={styles.addNewBtn} onClick={onAddNew}>
                    <Plus size={16} />
                    {t('addNew')}
                </button>
            </div>

            <div className={styles.list}>
                {disciplines.map((discipline) => (
                    <Link
                        key={discipline.id}
                        href={`/admin/disciplines?highlight=${discipline.id}`}
                        className={styles.item}
                    >
                        <div className={styles.itemLeft}>
                            <div style={{ position: 'relative', width: 48, height: 36, background: '#f3f4f6', borderRadius: '4px' }}>
                                <Image
                                    src={discipline.imageUrl || "/descipline.jpg"}
                                    alt={discipline.name}
                                    fill
                                    style={{ objectFit: 'cover', borderRadius: '4px' }}
                                    sizes="48px"
                                    unoptimized={discipline.imageUrl?.startsWith('http')}
                                />
                            </div>

                            <div className={styles.itemInfo}>
                                <span className={styles.itemTitle}>{discipline.name}</span>
                                <span className={styles.itemSubtitle}>
                                    {t('coachesCount', { count: discipline.coachCount })}
                                </span>
                            </div>
                        </div>
                    </Link>
                ))}
                {disciplines.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>
                        {t('noDisciplinesFound')}
                    </div>
                )}
            </div>

            <div className={styles.footer}>
                <Link href="/admin/disciplines" className={styles.viewAllLink}>
                    {t('viewAllDisciplines')}
                </Link>
            </div>
        </div>
    );
};

export default DisciplinesList;

