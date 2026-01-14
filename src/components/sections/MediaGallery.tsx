'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './MediaGallery.module.css';

export interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  caption?: string;
  thumbnail?: string;
}

export interface MediaGalleryProps {
  media: MediaItem[];
  onMediaClick?: (media: MediaItem) => void;
  showCaptions?: boolean;
  className?: string;
}

const MediaGallery: React.FC<MediaGalleryProps> = ({
  media,
  onMediaClick,
  showCaptions = true,
  className = '',
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const selectedMedia = selectedIndex !== null ? media[selectedIndex] : null;

  const handleMediaClick = (item: MediaItem, index: number) => {
    if (onMediaClick) {
      onMediaClick(item);
    } else {
      setSelectedIndex(index);
    }
  };

  const closeLightbox = () => {
    setSelectedIndex(null);
  };

  const goToPrevious = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const goToNext = () => {
    if (selectedIndex !== null && selectedIndex < media.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (selectedIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex]);

  const getMediaUrl = (url: string) => {
    return url;
  };

  const renderMediaItem = (item: MediaItem, index: number) => {
    if (item.type === 'video') {
      return (
        <div key={item.id} className={styles.mediaCard} onClick={() => handleMediaClick(item, index)}>
          <div className={styles.mediaWrapper}>
            {item.thumbnail ? (
              <Image
                src={getMediaUrl(item.thumbnail)}
                alt={item.caption || 'Video thumbnail'}
                width={400}
                height={500}
                className={styles.media}
                unoptimized
              />
            ) : (
              <video
                src={getMediaUrl(item.url)}
                className={styles.media}
                preload="metadata"
                muted
                playsInline
              />
            )}
            <div className={styles.playButton}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
                <circle cx="12" cy="12" r="12" fill="rgba(0, 0, 0, 0.6)" />
                <polygon points="9,6 9,18 18,12" fill="white" />
              </svg>
            </div>
            {showCaptions && item.caption && (
              <div className={styles.caption}>{item.caption}</div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div key={item.id} className={styles.mediaCard} onClick={() => handleMediaClick(item, index)}>
        <div className={styles.mediaWrapper}>
          <Image
            src={getMediaUrl(item.url)}
            alt={item.caption || 'Gallery image'}
            width={400}
            height={500}
            className={styles.media}
            unoptimized
          />
          {showCaptions && item.caption && (
            <div className={styles.caption}>{item.caption}</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className={`${styles.gallery} ${className}`}>
        {media.map((item, index) => renderMediaItem(item, index))}
      </div>

      {selectedMedia && (
        <div className={styles.lightbox} onClick={closeLightbox}>
          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.lightboxClose} onClick={closeLightbox} aria-label="Close">
              ×
            </button>

            {selectedIndex !== null && selectedIndex > 0 && (
              <button className={`${styles.lightboxNav} ${styles.lightboxPrev}`} onClick={goToPrevious} aria-label="Previous">
                ‹
              </button>
            )}

            {selectedIndex !== null && selectedIndex < media.length - 1 && (
              <button className={`${styles.lightboxNav} ${styles.lightboxNext}`} onClick={goToNext} aria-label="Next">
                ›
              </button>
            )}

            {selectedMedia.type === 'video' ? (
              <video
                src={getMediaUrl(selectedMedia.url)}
                controls
                autoPlay
                playsInline
                className={styles.lightboxMedia}
              />
            ) : (
              <Image
                src={getMediaUrl(selectedMedia.url)}
                alt={selectedMedia.caption || 'Gallery image'}
                width={1200}
                height={800}
                className={styles.lightboxMedia}
                style={{ objectFit: 'contain' }}
                unoptimized
              />
            )}

            {selectedMedia.caption && (
              <p className={styles.lightboxCaption}>{selectedMedia.caption}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default MediaGallery;
