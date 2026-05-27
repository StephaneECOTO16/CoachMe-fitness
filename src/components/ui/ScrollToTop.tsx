'use client';

import { useState, useEffect } from 'react';
import styles from './ScrollToTop.module.css';

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const radius = 20;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const toggleVisibility = () => {
      // Calculate scroll progress
      const scrollPx = document.documentElement.scrollTop;
      const winHeightPx = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (scrollPx / winHeightPx) * 100;
      
      setScrollProgress(scrolled);

      if (scrollPx > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    
    // Initial check
    toggleVisibility();

    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const strokeDashoffset = circumference - (scrollProgress / 100) * circumference;

  return (
    <div 
      className={`${styles.scrollToTop} ${isVisible ? styles.visible : ''}`} 
      onClick={scrollToTop}
      aria-label="Retour en haut"
      title="Retour en haut"
    >
      <svg className={styles.svgProgress} width="48" height="48" viewBox="0 0 48 48">
        <circle 
          className={styles.circleBackground}
          cx="24" 
          cy="24" 
          r={radius}
        />
        <circle 
          className={styles.circleProgress}
          cx="24" 
          cy="24" 
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={Number.isNaN(strokeDashoffset) ? circumference : strokeDashoffset}
        />
      </svg>
      <div className={styles.icon}>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M12 19V5M5 12l7-7 7 7"/>
        </svg>
      </div>
    </div>
  );
}
