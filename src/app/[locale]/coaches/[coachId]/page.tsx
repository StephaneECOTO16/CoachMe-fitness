"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";
import {
  MediaGallery,
  TabNavigation,
  StatusBadge,
  EmptyState,
} from "@/components";
import toast from "@/lib/toast";
import {
  Star,
  MapPin,
  Clock,
  Award,
  CheckCircle,
  Share2,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  Video as VideoIcon,
} from "lucide-react";
import styles from "./page.module.css";

interface Media {
  id: number;
  url: string;
  type: "IMAGE" | "VIDEO" | "CERTIFICATE";
  description: string | null;
}

interface CoachProfile {
  id: number;
  userId: number;
  bio: string | null;
  discipline: {
    id: number;
    name: string;
    imageUrl?: string;
  };
  portfolio: string | null;
  status: string;
  hourlyRate: number | null;
  experienceYears: number | null;
  address: string | null;
  city: string | null;
  country: string | null;
  minRating: number | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  twitter: string | null;
  youtube: string | null;
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
  const t = useTranslations("coachDetail");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const { isAuthenticated, user } = useAuth();
  const [coach, setCoach] = useState<CoachProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "reviews">(
    "overview"
  );

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
          setError(tErrors("coachNotFound"));
          toast.error(tErrors("coachNotFound"));
        }
      } catch (err) {
        console.error("Error fetching coach:", err);
        setError(tErrors("coachLoadFailed"));
        toast.error(tErrors("coachLoadFailed"));
      } finally {
        setLoading(false);
      }
    };

    fetchCoach();
  }, [coachId, tErrors]);

  const handleContactCoach = async () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (user?.role !== "PROSPECT") {
      toast.error(tErrors("onlyClientsCanContact"));
      return;
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          coachId: parseInt(coachId),
        }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/messages/${data.chat.id}`);
      } else {
        toast.error(tErrors("chatInitFailed"));
      }
    } catch (err) {
      console.error("Error initiating chat:", err);
      toast.error(tErrors("chatInitFailed"));
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${coach?.user.name || "Coach"} - ${coach?.discipline.name}`,
        text: coach?.bio || "",
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success(t("linkCopied"));
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>{tCommon("loading")}</p>
        </div>
      </div>
    );
  }

  if (error || !coach) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>{t("notFound")}</h2>
          <p>{error || t("notFoundMessage")}</p>
          <Link href="/coaches">
            <Button variant="primary">{t("browseAll")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const certificates = coach.media.filter((m) => m.type === "CERTIFICATE");
  const images = coach.media.filter((m) => m.type === "IMAGE");
  const videos = coach.media.filter((m) => m.type === "VIDEO");
  const mediaItems = [...videos, ...images]; // Combine videos and images for unified media section
  const location = [coach.city, coach.country].filter(Boolean).join(", ");

  return (
    <div className={styles.container}>
      <div className={styles.pageWrapper}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarCard}>
            {/* Coach Avatar */}
            <div className={styles.avatarWrapper}>
              <div className={styles.coachAvatar}>
                {coach.user.name?.[0]?.toUpperCase() || "C"}
              </div>
            </div>

            {/* Coach Name & Title */}
            <h1 className={styles.coachName}>{coach.user.name || "Coach"}</h1>
            <p className={styles.coachTitle}>{coach.discipline.name}</p>

            {/* Quick Info */}
            <div className={styles.quickInfo}>
              {location && (
                <div className={styles.infoItem}>
                  <MapPin size={18} />
                  <span>{location}</span>
                </div>
              )}
              {coach.experienceYears !== null && (
                <div className={styles.infoItem}>
                  <Clock size={18} />
                  <span>
                    {t("activeCount", { count: coach.experienceYears })}
                  </span>
                </div>
              )}
            </div>

            {/* Pricing */}
            {coach.hourlyRate && (
              <div className={styles.pricingSection}>
                <p className={styles.pricingLabel}>{t("startingAt")}</p>
                <p className={styles.pricingAmount}>
                  {new Intl.NumberFormat("fr-FR").format(coach.hourlyRate)} XAF
                  <span>/mo</span>
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className={styles.sidebarActions}>
              <Button
                variant="primary"
                size="lg"
                onClick={handleContactCoach}
                className={styles.messageButton}
              >
                {t("messageCoach")}
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className={styles.mainContent}>
          {/* Tab Navigation */}
          <TabNavigation
            tabs={[
              { id: "overview", label: t("overview") },
              { id: "reviews", label: t("reviewsTab") },
            ]}
            activeTab={activeTab}
            onChange={(tabId) => setActiveTab(tabId as "overview" | "reviews")}
          />

          {activeTab === "overview" && (
            <>
              {/* About Section */}
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  {t("aboutName", {
                    name: coach.user.name?.split(" ")[0] || "Coach",
                  })}
                </h2>
                <p className={styles.aboutText}>
                  {coach.bio || t("noBioAvailable")}
                </p>
              </section>

              {/* Specializations */}
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>{t("specializations")}</h2>
                <div className={styles.badgeList}>
                  <span className={styles.badge}>
                    <Award size={16} />
                    {coach.discipline.name}
                  </span>
                  {coach.experienceYears && coach.experienceYears >= 3 && (
                    <span className={styles.badge}>
                      <CheckCircle size={16} />
                      {t("experiencedProfessional")}
                    </span>
                  )}
                </div>
              </section>

              {/* Certifications */}
              {certificates.length > 0 && (
                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>{t("certifications")}</h2>
                  <p className={styles.sectionSubtitle}>
                    {t("verifiedExperience")}
                  </p>
                  <div className={styles.certificationList}>
                    {certificates.map((cert) => (
                      <div key={cert.id} className={styles.certificationItem}>
                        <div className={styles.certIcon}>
                          <CheckCircle size={20} />
                        </div>
                        <div className={styles.certInfo}>
                          <h3 className={styles.certTitle}>
                            {cert.description || t("professionalCertification")}
                          </h3>
                          <a
                            href={cert.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.certLink}
                          >
                            {t("verified")}
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Media Section - supports empty and populated states */}
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>{t("media")}</h2>
                <p className={styles.sectionSubtitle}>
                  {t("mediaDescription")}
                </p>
                {mediaItems.length > 0 ? (
                  <MediaGallery media={mediaItems} />
                ) : (
                  <EmptyState
                    icon="📁"
                    title="No media yet"
                    description="This coach hasn't uploaded any media yet."
                    size="sm"
                  />
                )}
              </section>

              {/* Social Media */}
              {(coach.instagram ||
                coach.facebook ||
                coach.twitter ||
                coach.youtube) && (
                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>{t("followMe")}</h2>
                  <div className={styles.socialLinks}>
                    {coach.instagram && (
                      <a
                        href={coach.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.socialLink}
                      >
                        <Instagram size={20} />
                        <span>Instagram</span>
                      </a>
                    )}
                    {coach.facebook && (
                      <a
                        href={coach.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.socialLink}
                      >
                        <Facebook size={20} />
                        <span>Facebook</span>
                      </a>
                    )}
                    {coach.twitter && (
                      <a
                        href={coach.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.socialLink}
                      >
                        <Twitter size={20} />
                        <span>Twitter</span>
                      </a>
                    )}
                    {coach.youtube && (
                      <a
                        href={coach.youtube}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.socialLink}
                      >
                        <Youtube size={20} />
                        <span>YouTube</span>
                      </a>
                    )}
                  </div>
                </section>
              )}
            </>
          )}

          {activeTab === "reviews" && (
            <section className={styles.section}>
              <div className={styles.reviewsPlaceholder}>
                <p>{t("reviewsComingSoon")}</p>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
