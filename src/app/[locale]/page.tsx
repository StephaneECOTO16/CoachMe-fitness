import { useTranslations } from 'next-intl';
import { HeroSection } from '@/components';

export default function HomePage() {
  const t = useTranslations('home.hero');

  return (
    <main>
      <HeroSection
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
              style={{
                padding: '1rem 2rem',
                fontSize: '1rem',
                fontWeight: '600',
                background: 'linear-gradient(135deg, #00a650 0%, #008a43 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '0.75rem',
                cursor: 'pointer',
              }}
            >
              {t('ctaPrimary')}
            </button>
            <button
              style={{
                padding: '1rem 2rem',
                fontSize: '1rem',
                fontWeight: '600',
                background: 'linear-gradient(135deg, #00a650 0%, #008a43 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '0.75rem',
                cursor: 'pointer',
              }}
            >
              {t('ctaSecondary')}
            </button>
          </div>
        }
      />
    </main>
  );
}
