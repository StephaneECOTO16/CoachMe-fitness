"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { LoadingIndicator } from "@/components";
import Button from "@/components/ui/Button";
import styles from "./page.module.css";

interface Coach {
  id: number;
  userId: number;
  bio: string | null;
  discipline: {
    id: number;
    name: string;
    imageUrl?: string;
  };
  portfolio: string | null;
  rateAmount: number | string | null;
  rateType: "HOUR" | "WEEK" | "MONTH";
  address: string | null;
  city: string | null;
  country: string | null;
  minRating: number | null;
  experienceYears: number | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  twitter: string | null;
  youtube: string | null;
  status: string;
  user: {
    id: number;
    name: string | null;
    email: string;
    avatar: string | null;
  };
  media: Array<{
    id: number;
    url: string;
    type: string;
  }>;
}

export default function CoachesPage() {
  const t = useTranslations("coach.browse");
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);

  // Applied filters (used for fetching)
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("");
  const [minRating, setMinRating] = useState<string>("");
  const [selectedRateType, setSelectedRateType] = useState<string>("");
  const [maxRate, setMaxRate] = useState<string>("");

  // Temporary filters (UI state before applying)
  const [tempDiscipline, setTempDiscipline] = useState<string>("");
  const [tempMinRating, setTempMinRating] = useState<string>("");
  const [tempRateType, setTempRateType] = useState<string>("");
  const [tempMaxRate, setTempMaxRate] = useState<string>("");

  const [disciplines, setDisciplines] = useState<{ id: number; name: string; imageUrl?: string }[]>([]);
  const [loadingDisciplines, setLoadingDisciplines] = useState(true);

  const fetchCoaches = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });

      if (selectedDiscipline) {
        params.append("discipline", selectedDiscipline);
      }
      if (minRating) {
        params.append("minRating", minRating);
      }
      if (selectedRateType) {
        params.append("rateType", selectedRateType);
      }
      if (maxRate) {
        params.append("maxRate", maxRate);
      }

      const url = `/api/coaches?${params.toString()}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setCoaches(data.coaches);
      }
    } catch (error) {
      console.error("Error fetching coaches:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch disciplines on component mount
  useEffect(() => {
    const fetchDisciplines = async () => {
      try {
        const response = await fetch("/api/disciplines");
        const result = await response.json();
        if (result.success) {
          setDisciplines(result.disciplines);
        }
      } catch (error) {
        console.error("Error fetching disciplines:", error);
      } finally {
        setLoadingDisciplines(false);
      }
    };

    fetchDisciplines();
  }, []);

  // Only fetch coaches on initial load
  useEffect(() => {
    fetchCoaches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplyFilters = () => {
    setSelectedDiscipline(tempDiscipline);
    setMinRating(tempMinRating);
    setSelectedRateType(tempRateType);
    setMaxRate(tempMaxRate);
    // Trigger fetch after state update
    setTimeout(() => {
      fetchCoaches();
    }, 0);
  };

  const handleResetFilters = () => {
    setTempDiscipline("");
    setTempMinRating("");
    setTempRateType("");
    setTempMaxRate("");
    setSelectedDiscipline("");
    setMinRating("");
    setSelectedRateType("");
    setMaxRate("");
    // Trigger fetch after state update
    setTimeout(() => {
      fetchCoaches();
    }, 0);
  };

  const getRateLabel = (rateType: Coach["rateType"]) => {
    if (rateType === "WEEK") return t("perWeek");
    if (rateType === "MONTH") return t("perMonth");
    return t("perHour");
  };

  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroBackground}>
          <Image
            src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1740&auto=format&fit=crop"
            alt="Find Your Coach"
            fill
            className={styles.heroImage}
            priority
          />
          <div className={styles.heroOverlay} />
        </div>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>{t("title")}</h1>
          <p className={styles.subtitle}>{t("subtitle")}</p>
        </div>
      </section>

      {/* Main Content with Sidebar */}
      <div className={styles.mainContent}>
        {/* Filter Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h2 className={styles.sidebarTitle}>{t("filterCoaches")}</h2>
          </div>

          {/* Discipline Filter */}
          <div className={styles.filterGroup}>
            <label htmlFor="discipline-filter" className={styles.filterLabel}>
              {t("discipline")}
            </label>
            <select
              id="discipline-filter"
              value={tempDiscipline}
              onChange={(e) => setTempDiscipline(e.target.value)}
              className={styles.filterSelect}
              aria-label={t("discipline")}
              disabled={loadingDisciplines}
            >
              <option value="">
                {loadingDisciplines ? "Loading disciplines..." : t("allDisciplines")}
              </option>
              {disciplines.map((discipline) => (
                <option key={discipline.id} value={discipline.name}>
                  {discipline.name}
                </option>
              ))}
            </select>
          </div>

          {/* Rating Filter */}
          <div className={styles.filterGroup}>
            <label htmlFor="rating-filter" className={styles.filterLabel}>
              {t("minimumRating")}
            </label>
            <select
              id="rating-filter"
              value={tempMinRating}
              onChange={(e) => setTempMinRating(e.target.value)}
              className={styles.filterSelect}
              aria-label={t("minimumRating")}
            >
              <option value="">{t("any")}</option>
              <option value="4.5">4.5+</option>
              <option value="4.0">4.0+</option>
              <option value="3.5">3.5+</option>
              <option value="3.0">3.0+</option>
            </select>
          </div>

          {/* Rate Type Filter */}
          <div className={styles.filterGroup}>
            <label htmlFor="rate-type-filter" className={styles.filterLabel}>
              {t("rateType")}
            </label>
            <select
              id="rate-type-filter"
              value={tempRateType}
              onChange={(e) => setTempRateType(e.target.value)}
              className={styles.filterSelect}
              aria-label={t("rateType")}
            >
              <option value="">{t("rateTypeAll")}</option>
              <option value="HOUR">{t("rateTypeHour")}</option>
              <option value="WEEK">{t("rateTypeWeek")}</option>
              <option value="MONTH">{t("rateTypeMonth")}</option>
            </select>
          </div>

          {/* Max Rate Filter */}
          <div className={styles.filterGroup}>
            <label htmlFor="rate-filter" className={styles.filterLabel}>
              {t("maxRate")}
            </label>
            <input
              id="rate-filter"
              type="number"
              value={tempMaxRate}
              onChange={(e) => setTempMaxRate(e.target.value)}
              placeholder="10000"
              className={styles.filterInput}
              aria-label={t("maxRate")}
            />
          </div>

          {/* Filter Actions - Apply and Reset at Bottom */}
          <div className={styles.filterActions}>
            <button
              type="button"
              onClick={handleResetFilters}
              className={styles.resetButton}
              aria-label={t("reset")}
            >
              {t("reset")}
            </button>
            <button
              type="button"
              onClick={handleApplyFilters}
              className={styles.applyButton}
              aria-label={t("applyFilters")}
            >
              {t("applyFilters")}
            </button>
          </div>
        </aside>

        {/* Coaches List */}
        <section className={styles.coachesSection}>
          {loading ? (
            <div className={styles.loading}>
              <LoadingIndicator
                label={t("loadingCoaches")}
                size={48}
                thickness={4}
                unstyledLabel
              />
            </div>
          ) : coaches.length > 0 ? (
            <>
              <div className={styles.resultsCount}>
                {t("coachesFound", { count: coaches.length })}
              </div>
              <div className={styles.coachList}>
                {coaches.map((coach) => (
                  <div key={coach.id} className={styles.coachCard}>
                    <div className={styles.coachAvatar}>
                      {coach.user.avatar ? (
                        <Image
                          src={coach.user.avatar}
                          alt={coach.user.name || "Coach"}
                          fill
                          className={styles.coachAvatarImage}
                          unoptimized
                        />
                      ) : coach.media.find((m) => m.type === "IMAGE") ? (
                        <Image
                          src={
                            coach.media.find((m) => m.type === "IMAGE")!.url.startsWith('http')
                              ? coach.media.find((m) => m.type === "IMAGE")!.url
                              : `/${coach.media.find((m) => m.type === "IMAGE")!.url}`
                          }
                          alt={coach.user.name || "Coach"}
                          fill
                          className={styles.coachAvatarImage}
                          unoptimized
                        />
                      ) : (
                        <div className={styles.coachAvatarPlaceholder}>
                          {coach.user.name?.[0]?.toUpperCase() || "C"}
                        </div>
                      )}
                    </div>

                    <div className={styles.coachDetails}>
                      <div className={styles.coachHeader}>
                        <div>
                          <h3 className={styles.coachName}>
                            {coach.user.name || "Coach"}
                          </h3>
                          <p className={styles.coachDiscipline}>
                            {coach.discipline.name}
                          </p>
                        </div>
                        {coach.rateAmount && (
                          <div className={styles.coachRate}>
                            <span className={styles.rateAmount}>
                              {new Intl.NumberFormat("fr-FR").format(
                                Number(coach.rateAmount)
                              )}{" "}
                              XAF
                            </span>
                            <span className={styles.rateLabel}>
                              {getRateLabel(coach.rateType)}
                            </span>
                          </div>
                        )}
                      </div>

                      {coach.bio && (
                        <p className={styles.coachBio}>
                          {coach.bio.length > 150
                            ? `${coach.bio.substring(0, 150)}...`
                            : coach.bio}
                        </p>
                      )}

                      <div className={styles.coachMeta}>
                        {(coach.city || coach.country) && (
                          <div className={styles.metaItem}>
                            <svg
                              className={styles.metaIcon}
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <path
                                d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                                fill="currentColor"
                              />
                            </svg>
                            <span>
                              {[coach.city, coach.country]
                                .filter(Boolean)
                                .join(", ")}
                            </span>
                          </div>
                        )}
                        {coach.experienceYears && coach.experienceYears > 0 && (
                          <div className={styles.metaItem}>
                            <svg
                              className={styles.metaIcon}
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <path
                                d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"
                                fill="currentColor"
                              />
                            </svg>
                            <span>
                              {coach.experienceYears} {t("yearsExperience")}
                            </span>
                          </div>
                        )}
                        {coach.media.length > 0 && (
                          <div className={styles.coachBadges}>
                            {coach.media.filter((m) => m.type === "CERTIFICATE")
                              .length > 0 && (
                              <span className={styles.badge}>
                                {t("badgeCertified")}
                              </span>
                            )}
                            {coach.media.filter((m) => m.type === "IMAGE")
                              .length > 0 && (
                              <span className={styles.badge}>
                                {t("badgePortfolio")}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className={styles.coachFooter}>
                        {(coach.instagram ||
                          coach.facebook ||
                          coach.tiktok ||
                          coach.twitter ||
                          coach.youtube) && (
                          <div className={styles.socialLinks}>
                            {coach.instagram && (
                              <a
                                href={coach.instagram}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.socialLink}
                                aria-label="Instagram"
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                  aria-hidden="true"
                                >
                                  <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4c0 3.2-2.6 5.8-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8C2 4.6 4.6 2 7.8 2m-.2 2C5.6 4 4 5.6 4 7.6v8.8C4 18.4 5.6 20 7.6 20h8.8c2 0 3.6-1.6 3.6-3.6V7.6C20 5.6 18.4 4 16.4 4H7.6m9.65 1.5c.69 0 1.25.56 1.25 1.25s-.56 1.25-1.25 1.25-1.25-.56-1.25-1.25.56-1.25 1.25-1.25M12 7c2.76 0 5 2.24 5 5s-2.24 5-5 5-5-2.24-5-5 2.24-5 5-5m0 2c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                                </svg>
                              </a>
                            )}
                            {coach.facebook && (
                              <a
                                href={coach.facebook}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.socialLink}
                                aria-label="Facebook"
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                  aria-hidden="true"
                                >
                                  <path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02z" />
                                </svg>
                              </a>
                            )}
                            {coach.tiktok && (
                              <a
                                href={coach.tiktok}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.socialLink}
                                aria-label="TikTok"
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                  aria-hidden="true"
                                >
                                  <path d="M16.6 5.82s.51.5 0 0A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z" />
                                </svg>
                              </a>
                            )}
                            {coach.twitter && (
                              <a
                                href={coach.twitter}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.socialLink}
                                aria-label="X (Twitter)"
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                  aria-hidden="true"
                                >
                                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                              </a>
                            )}
                            {coach.youtube && (
                              <a
                                href={coach.youtube}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.socialLink}
                                aria-label="YouTube"
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                  aria-hidden="true"
                                >
                                  <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z" />
                                </svg>
                              </a>
                            )}
                          </div>
                        )}
                        <Link href={`/coaches/${coach.id}`}>
                          <Button variant="primary" size="md">
                            {t("viewProfile")}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🔍</div>
              <h3 className={styles.emptyTitle}>{t("noCoaches")}</h3>
              <p className={styles.emptyText}>{t("tryAdjustFilters")}</p>
              <Button
                variant="outline"
                onClick={handleResetFilters}
              >
                {t("clearFilters")}
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
