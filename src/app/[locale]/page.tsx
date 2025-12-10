import { useTranslations } from 'next-intl';

export default function HomePage() {
  const t = useTranslations('home.hero');

  return (
    <main>
      <section style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem', fontWeight: 'bold' }}>
          {t('title')}
        </h1>
        <p style={{ fontSize: '1.25rem', color: '#666', marginBottom: '2rem' }}>
          {t('subtitle')}
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            style={{
              padding: '1rem 2rem',
              fontSize: '1rem',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #3138ac 0%, #252d8c 100%)',
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
              background: 'linear-gradient(135deg, #be222a 0%, #9a1b22 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '0.75rem',
              cursor: 'pointer',
            }}
          >
            {t('ctaSecondary')}
          </button>
        </div>
      </section>
    </main>
  );
}
