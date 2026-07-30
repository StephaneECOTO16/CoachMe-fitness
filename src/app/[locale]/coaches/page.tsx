"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { LoadingIndicator, CoachCard, Pagination, type CoachData } from "@/components";
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
    id: string;
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

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
    // Reset to page 1 when filters change
    setCurrentPage(1);
  };

  const transformCoachData = (coach: Coach): CoachData => ({
    _id: coach.user.id,
    firstName: coach.user.name?.split(" ")[0] || "Coach",
    lastName: coach.user.name?.split(" ").slice(1).join(" ") || "",
    email: coach.user.email,
    avatar: coach.user.avatar || undefined,
    discipline: coach.discipline.name,
    bio: coach.bio || undefined,
    location: [coach.city, coach.country].filter(Boolean).join(", "),
    experience: coach.experienceYears || undefined,
    rateAmount: typeof coach.rateAmount === 'string' ? parseFloat(coach.rateAmount) : (coach.rateAmount || undefined), // Handle possible string from API
    rateType: coach.rateType,
    socialMedia: {
      instagram: coach.instagram || undefined,
      facebook: coach.facebook || undefined,
      tiktok: coach.tiktok || undefined,
      twitter: coach.twitter || undefined,
      youtube: coach.youtube || undefined,
    },
    // Map media to portfolio/certifications if needed, purely visual here
    portfolio: coach.media.filter(m => m.type === 'IMAGE').map(m => ({ type: 'image', url: m.url })),
    certifications: coach.media.filter(m => m.type === 'CERTIFICATE').map(() => 'Certified'), // simplified
  });

  // Pagination logic
  const totalPages = Math.ceil(coaches.length / itemsPerPage);
  const paginatedCoaches = coaches.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroBackground}>
          <video
            autoPlay
            loop
            muted
            playsInline
            className={styles.heroVideo}
          >
            <source src="/videos/find-coach.mp4" type="video/mp4" />
            <Image
              src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1740&auto=format&fit=crop"
              alt="Find Your Coach"
              fill
              className={styles.heroImage}
              priority
            />
          </video>
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
                {paginatedCoaches.map((coach) => (
                  <CoachCard
                    key={coach.id}
                    coach={transformCoachData(coach)}
                    variant="list"
                    locale="en" // Or dynamic locale
                    className={styles.coachCard} // Pass className for any margin overrides if needed, though CoachCard has its own styles
                  />
                ))}
              </div>

              {/* Pagination */}
              {coaches.length > itemsPerPage && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              )}
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
