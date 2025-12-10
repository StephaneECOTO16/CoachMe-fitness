'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import LanguageToggle from '../ui/LanguageToggle';
import styles from './Header.module.css';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = useTranslations('nav');
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { href: '/', label: t('home') },
    { href: '/coaches', label: t('coaches') },
    { href: '/about', label: t('about') },
    { href: '/contact', label: t('contact') },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <header className={cn(styles.header, scrolled && styles.scrolled)}>
      <div className={styles.container}>
        <nav className={styles.nav}>
          {/* Logo */}
          <Link href="/" className={styles.logo}>
            <span className={styles.logoText}>Mandara Fitness</span>
          </Link>

          {/* Desktop Nav Links */}
          <div className={styles.navLinks}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  styles.navLink,
                  isActive(item.href) && styles.active
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <LanguageToggle />

            {/* Mobile Menu Button */}
            <button
              className={cn(styles.menuButton, mobileMenuOpen && styles.open)}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              <span className={styles.menuBar} />
              <span className={styles.menuBar} />
              <span className={styles.menuBar} />
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile Menu */}
      <div className={cn(styles.mobileMenu, mobileMenuOpen && styles.open)}>
        <div className={styles.mobileNavLinks}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                styles.mobileNavLink,
                isActive(item.href) && styles.active
              )}
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
