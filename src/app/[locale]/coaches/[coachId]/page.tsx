'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import styles from './page.module.css';

interface Media {
  id: number;
  url: string;
  type: 'IMAGE' | 'VIDEO' | 'CERTIFICATE';
  description: string | null;
}

interface CoachProfile {
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
  media: Media[];
}

export default function CoachProfilePage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('coach.profile');
  const tErrors = useTranslations('errors');
  const { isAuthenticated, user } = useAuth();
  const [coach, setCoach] = useState<CoachProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const coachId = params?.coachId as string;

  useEffect(() => {
    if (!coachId) return;

    const fetchCoach = async () => {
      try {
        const response = await fetch(`/api/coaches/${coachId}`);
        const data = await response.json();

        if (data.success) {
          setCoach(data.coach);
        } else {
          setError(tErrors('coachNotFound'));
        }
      } catch (err) {
        console.error('Error fetching coach:', err);
        setError(tErrors('coachLoadFailed'));
      } finally {
        setLoading(false);
      }
    };

    fetchCoach();
  }, [coachId, tErrors]);

  const handleContactCoach = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user?.role !== 'PROSPECT') {
      alert(tErrors('onlyClientsCanContact'));
      return;
    }

    try {
      // Initiate a chat with the coach
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          coachId: parseInt(coachId),
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to messages with the chat
        router.push(`/messages/${data.chat.id}`);
      } else {
        alert(tErrors('chatInitFailed'));
      }
    } catch (err) {
      console.error('Error initiating chat:', err);
      alert(tErrors('chatInitFailed'));
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading coach profile...</p>
        </div>
      </div>
    );
  }

  if (error || !coach) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Coach Not Found</h2>
          <p>{error || 'This coach profile is not available.'}</p>
          <Link href="/coaches">
            <Button variant="primary">Browse All Coaches</Button>
          </Link>
        </div>
      </div>
    );
  }

  const certificates = coach.media.filter(m => m.type === 'CERTIFICATE');
  const images = coach.media.filter(m => m.type === 'IMAGE');
  const videos = coach.media.filter(m => m.type === 'VIDEO');

  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.coachAvatar}>
            {coach.user.name?.[0]?.toUpperCase() || 'C'}
          </div>
          <h1 className={styles.coachName}>{coach.user.name || 'Coach'}</h1>
          <p className={styles.coachDiscipline}>{coach.discipline}</p>

          <div className={styles.heroActions}>
            <Button variant="primary" size="lg" onClick={handleContactCoach}>
              Contact Coach
            </Button>
            {coach.portfolio && (
              <a href={coach.portfolio} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="lg">
                  View Portfolio
                </Button>
              </a>
            )}
          </div>
        </div>
      </section>

      <div className={styles.content}>
        {/* About Section */}
        {coach.bio && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>About</h2>
            <div className={styles.bioCard}>
              <p className={styles.bioText}>{coach.bio}</p>
            </div>
          </section>
        )}

        {/* Certifications Section */}
        {certificates.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Certifications & Credentials
            </h2>
            <div className={styles.certificateGrid}>
              {certificates.map((cert) => (
                <div key={cert.id} className={styles.certificateCard}>
                  <div className={styles.certificateIcon}>📜</div>
                  <div className={styles.certificateInfo}>
                    <h3 className={styles.certificateName}>
                      {cert.description || 'Certification'}
                    </h3>
                    <a
                      href={cert.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.certificateLink}
                    >
                      View Certificate
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Gallery Section */}
        {images.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Gallery</h2>
            <div className={styles.imageGrid}>
              {images.map((image) => (
                <div key={image.id} className={styles.imageCard}>
                  <Image
                    src={image.url}
                    alt={image.description || 'Coach demonstrating fitness techniques'}
                    width={400}
                    height={300}
                    className={styles.image}
                    style={{ objectFit: 'cover' }}
                  />
                  {image.description && (
                    <p className={styles.imageCaption}>{image.description}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Videos Section */}
        {videos.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Videos</h2>
            <div className={styles.videoGrid}>
              {videos.map((video) => (
                <div key={video.id} className={styles.videoCard}>
                  <video
                    src={video.url}
                    controls
                    className={styles.video}
                  />
                  {video.description && (
                    <p className={styles.videoCaption}>{video.description}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Contact CTA */}
        <section className={styles.ctaSection}>
          <div className={styles.ctaCard}>
            <h2 className={styles.ctaTitle}>Ready to Start Your Fitness Journey?</h2>
            <p className={styles.ctaText}>
              Contact {coach.user.name || 'this coach'} today to discuss your goals and get started.
            </p>
            <Button variant="primary" size="lg" onClick={handleContactCoach}>
              Contact {coach.user.name || 'Coach'}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
