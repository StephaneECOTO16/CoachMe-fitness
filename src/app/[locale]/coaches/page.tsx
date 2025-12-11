'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import Button from '@/components/ui/Button';
import styles from './page.module.css';

interface Coach {
  id: number;
  userId: number;
  bio: string | null;
  discipline: string;
  portfolio: string | null;
  status: string;
  user: {
    id: number;
    name: string | null;
    email: string;
  };
  media: Array<{
    id: number;
    url: string;
    type: string;
  }>;
}

export default function CoachesPage() {
  const t = useTranslations('coach.browse');
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('');
  const [disciplines, setDisciplines] = useState<string[]>([]);

  useEffect(() => {
    fetchCoaches();
  }, [selectedDiscipline]);

  const fetchCoaches = async () => {
    setLoading(true);
    try {
      const url = selectedDiscipline
        ? `/api/coaches?discipline=${encodeURIComponent(selectedDiscipline)}&limit=50`
        : '/api/coaches?limit=50';

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setCoaches(data.coaches);

        // Extract unique disciplines
        const uniqueDisciplines = Array.from(
          new Set(data.coaches.map((coach: Coach) => coach.discipline))
        ) as string[];
        setDisciplines(uniqueDisciplines);
      }
    } catch (error) {
      console.error('Error fetching coaches:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>{t('title')}</h1>
          <p className={styles.subtitle}>{t('subtitle')}</p>
        </div>
      </section>

      {/* Filters Section */}
      <section className={styles.filters}>
        <div className={styles.filterContainer}>
          <label htmlFor="discipline" className={styles.filterLabel}>
            {t('filterByDiscipline')}
          </label>
          <select
            id="discipline"
            value={selectedDiscipline}
            onChange={(e) => setSelectedDiscipline(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">{t('allDisciplines')}</option>
            {disciplines.map((discipline) => (
              <option key={discipline} value={discipline}>
                {discipline}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Coaches Grid */}
      <section className={styles.coachesSection}>
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading coaches...</p>
          </div>
        ) : coaches.length > 0 ? (
          <>
            <div className={styles.resultsCount}>
              {coaches.length} {coaches.length === 1 ? 'coach' : 'coaches'} found
            </div>
            <div className={styles.coachGrid}>
              {coaches.map((coach) => (
                <div key={coach.id} className={styles.coachCard}>
                  <div className={styles.coachAvatar}>
                    {coach.user.name?.[0]?.toUpperCase() || 'C'}
                  </div>

                  <div className={styles.coachInfo}>
                    <h3 className={styles.coachName}>
                      {coach.user.name || 'Coach'}
                    </h3>
                    <p className={styles.coachDiscipline}>
                      {coach.discipline}
                    </p>

                    {coach.bio && (
                      <p className={styles.coachBio}>
                        {coach.bio.length > 120
                          ? `${coach.bio.substring(0, 120)}...`
                          : coach.bio}
                      </p>
                    )}

                    {coach.media.length > 0 && (
                      <div className={styles.coachBadges}>
                        {coach.media.filter(m => m.type === 'CERTIFICATE').length > 0 && (
                          <span className={styles.badge}>
                            ✓ Certified
                          </span>
                        )}
                        {coach.media.filter(m => m.type === 'IMAGE').length > 0 && (
                          <span className={styles.badge}>
                            📸 Portfolio
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className={styles.coachActions}>
                    <Link href={`/coaches/${coach.id}`}>
                      <Button variant="primary" size="md" fullWidth>
                        View Profile
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🔍</div>
            <h3 className={styles.emptyTitle}>{t('noCoaches')}</h3>
            <p className={styles.emptyText}>
              Try adjusting your filters or check back later for new coaches.
            </p>
            <Button variant="outline" onClick={() => setSelectedDiscipline('')}>
              Clear Filters
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
