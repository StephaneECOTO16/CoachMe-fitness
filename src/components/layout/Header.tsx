"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import LanguageToggle from "../ui/LanguageToggle";
import Button from "../ui/Button";
import styles from "./Header.module.css";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Dynamic navigation based on authentication
  const getNavItems = () => {
    const baseItems = [
      { href: "/", label: t("home") },
      { href: "/coaches", label: t("coaches") },
    ];

    if (isAuthenticated) {
      // When logged in: Home, Coaches, Dashboard, Messages, Contact
      return [
        ...baseItems,
        {
          href:
            user?.role === "ADMIN"
              ? "/admin/dashboard"
              : user?.role === "COACH"
              ? "/coach/dashboard"
              : "/dashboard",
          label: t("dashboard"),
        },
        { href: "/messages", label: t("messages") },
        { href: "/contact", label: t("contact") },
      ];
    } else {
      // When logged out: Home, Coaches, About, Contact
      return [
        ...baseItems,
        { href: "/about", label: t("about") },
        { href: "/contact", label: t("contact") },
      ];
    }
  };

  const navItems = getNavItems();
  const isActive = (href: string) => pathname === href;

  return (
    <header className={cn(styles.header, scrolled && styles.scrolled)}>
      <div className={styles.container}>
        <nav className={styles.nav}>
          {/* Logo */}
          <Link href="/" className={styles.logo}>
            <Image
              src="/coachMe-logo.png"
              alt="CoachMe by Ecotofitness"
              width={200}
              height={100}
              priority
              className={styles.logoImage}
            />
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
            {isAuthenticated ? (
              <>
                {/* User Avatar with Dropdown */}
                <div className={styles.userMenu}>
                  <button className={styles.avatarButton} type="button">
                    <div className={styles.avatar}>
                      {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                    </div>
                  </button>
                  {/* Dropdown menu */}
                  <div className={styles.dropdown}>
                    <Link href="/profile" className={styles.dropdownItem}>
                      {t("profile")}
                    </Link>
                    <Link href="/settings" className={styles.dropdownItem}>
                      {t("settings")}
                    </Link>
                    <button
                      onClick={logout}
                      className={styles.dropdownItem}
                      type="button"
                    >
                      {t("logout")}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <Link href="/login">
                <Button variant="outline" size="sm">
                  {t("login")}
                </Button>
              </Link>
            )}

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
