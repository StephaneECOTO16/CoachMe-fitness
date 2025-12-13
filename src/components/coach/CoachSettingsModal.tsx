"use client";

import { useState, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { X, Upload, Trash2, FileText, Image as ImageIcon, Video, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { DISCIPLINES } from "@/lib/schemas";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";
import styles from "./CoachSettingsModal.module.css";

// Validation schemas
const ProfileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  discipline: z.string().min(1, "Discipline is required"),
  bio: z.string().optional(),
  portfolio: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
});

type ProfileFormData = z.infer<typeof ProfileFormSchema>;

interface CoachSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileData: {
    user: {
      id: number;
      name: string | null;
      email: string;
      role: string;
      createdAt: string;
    };
    profile?: {
      id: number;
      discipline: string;
      bio: string | null;
      portfolio: string | null;
      status: string;
    };
  } | null;
  onProfileUpdate: () => void;
}

type TabType = "profile" | "media" | "account";

interface MediaFile {
  id: number;
  url: string;
  type: "CERTIFICATE" | "IMAGE" | "VIDEO" | "OTHER";
  mimeType: string;
  sizeBytes: number;
  description: string | null;
  createdAt: string;
}

export default function CoachSettingsModal({
  isOpen,
  onClose,
  profileData,
  onProfileUpdate,
}: CoachSettingsModalProps) {
  const t = useTranslations("coachDashboard.settingsModal");
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});

  const certificateInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(ProfileFormSchema),
    defaultValues: {
      name: profileData?.user.name || "",
      discipline: profileData?.profile?.discipline || "",
      bio: profileData?.profile?.bio || "",
      portfolio: profileData?.profile?.portfolio || "",
    },
  });

  // Fetch media files when media tab is opened
  const fetchMediaFiles = useCallback(async () => {
    if (!token) return;

    setLoadingMedia(true);
    try {
      const response = await fetch("/api/coach/media", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (data.success) {
        setMediaFiles(data.media);
      }
    } catch (error) {
      console.error("Error fetching media:", error);
      toast.error(t("notifications.uploadError"));
    } finally {
      setLoadingMedia(false);
    }
  }, [token, t]);

  // Handle tab change
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === "media" && mediaFiles.length === 0) {
      fetchMediaFiles();
    }
  };

  // Handle profile form submission
  const onSubmit = async (data: ProfileFormData) => {
    if (!token) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: data.name,
          discipline: data.discipline,
          bio: data.bio || null,
          portfolio: data.portfolio || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(t("notifications.saveSuccess"));
        onProfileUpdate();
        onClose();
      } else {
        toast.error(t("notifications.saveError"));
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(t("notifications.saveError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (
    files: FileList | null,
    type: "CERTIFICATE" | "IMAGE" | "VIDEO"
  ) => {
    if (!files || !token) return;

    const file = files[0];
    const uploadKey = `${type}-${Date.now()}`;
    setUploadingFiles((prev) => ({ ...prev, [uploadKey]: true }));

    try {
      // Step 1: Get presigned URL
      const presignedResponse = await fetch("/api/coach/media/presigned-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          mediaType: type,
        }),
      });

      const presignedData = await presignedResponse.json();

      if (!presignedData.success) {
        throw new Error("Failed to get upload URL");
      }

      // Step 2: Upload to S3
      const uploadResponse = await fetch(presignedData.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }

      // Step 3: Register media in database
      const registerResponse = await fetch("/api/coach/media", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          s3Key: presignedData.s3Key,
          mimeType: file.type,
          sizeBytes: file.size,
          type: type,
          description: file.name,
        }),
      });

      const registerData = await registerResponse.json();

      if (registerData.success) {
        toast.success(t("notifications.uploadSuccess"));
        fetchMediaFiles(); // Refresh media list
      } else {
        throw new Error("Failed to register file");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error(t("notifications.uploadError"));
    } finally {
      setUploadingFiles((prev) => {
        const updated = { ...prev };
        delete updated[uploadKey];
        return updated;
      });
    }
  };

  // Handle file delete
  const handleFileDelete = async (mediaId: number) => {
    if (!token || !confirm("Are you sure you want to delete this file?")) return;

    try {
      const response = await fetch(`/api/coach/media/${mediaId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t("notifications.deleteSuccess"));
        setMediaFiles((prev) => prev.filter((m) => m.id !== mediaId));
      } else {
        toast.error(t("notifications.deleteError"));
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error(t("notifications.deleteError"));
    }
  };

  const isUploading = Object.keys(uploadingFiles).length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.backdrop}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            {/* Header */}
            <div className={styles.header}>
              <div>
                <h2 id="modal-title" className={styles.title}>
                  {t("title")}
                </h2>
                <p className={styles.subtitle}>{t("subtitle")}</p>
              </div>
              <button
                onClick={onClose}
                className={styles.closeButton}
                aria-label="Close"
              >
                <X size={24} />
              </button>
            </div>

            {/* Tabs */}
            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${activeTab === "profile" ? styles.tabActive : ""}`}
                onClick={() => handleTabChange("profile")}
              >
                {t("tabs.profile")}
              </button>
              <button
                className={`${styles.tab} ${activeTab === "media" ? styles.tabActive : ""}`}
                onClick={() => handleTabChange("media")}
              >
                {t("tabs.media")}
              </button>
              <button
                className={`${styles.tab} ${activeTab === "account" ? styles.tabActive : ""}`}
                onClick={() => handleTabChange("account")}
              >
                {t("tabs.account")}
              </button>
            </div>

            {/* Content */}
            <div className={styles.content}>
              {/* Profile Tab */}
              {activeTab === "profile" && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={styles.tabContent}
                >
                  <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionTitle}>{t("profile.title")}</h3>
                    <p className={styles.sectionDescription}>
                      {t("profile.description")}
                    </p>
                  </div>

                  <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
                    {/* Name */}
                    <div className={styles.formGroup}>
                      <label htmlFor="name" className={styles.label}>
                        {t("profile.nameLabel")}
                      </label>
                      <input
                        {...register("name")}
                        type="text"
                        id="name"
                        className={styles.input}
                        placeholder={t("profile.namePlaceholder")}
                      />
                      {errors.name && (
                        <span className={styles.error}>{errors.name.message}</span>
                      )}
                    </div>

                    {/* Email (read-only) */}
                    <div className={styles.formGroup}>
                      <label htmlFor="email" className={styles.label}>
                        {t("profile.emailLabel")}
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={profileData?.user.email}
                        className={styles.inputDisabled}
                        disabled
                      />
                    </div>

                    {/* Discipline */}
                    <div className={styles.formGroup}>
                      <label htmlFor="discipline" className={styles.label}>
                        {t("profile.disciplineLabel")}
                      </label>
                      <select
                        {...register("discipline")}
                        id="discipline"
                        className={styles.select}
                      >
                        <option value="">{t("profile.disciplinePlaceholder")}</option>
                        {DISCIPLINES.map((disc) => (
                          <option key={disc} value={disc}>
                            {disc}
                          </option>
                        ))}
                      </select>
                      {errors.discipline && (
                        <span className={styles.error}>
                          {errors.discipline.message}
                        </span>
                      )}
                    </div>

                    {/* Bio */}
                    <div className={styles.formGroup}>
                      <label htmlFor="bio" className={styles.label}>
                        {t("profile.bioLabel")}
                      </label>
                      <textarea
                        {...register("bio")}
                        id="bio"
                        className={styles.textarea}
                        rows={6}
                        placeholder={t("profile.bioPlaceholder")}
                      />
                      <p className={styles.helper}>{t("profile.bioHelper")}</p>
                    </div>

                    {/* Portfolio */}
                    <div className={styles.formGroup}>
                      <label htmlFor="portfolio" className={styles.label}>
                        {t("profile.portfolioLabel")}
                      </label>
                      <input
                        {...register("portfolio")}
                        type="url"
                        id="portfolio"
                        className={styles.input}
                        placeholder={t("profile.portfolioPlaceholder")}
                      />
                      <p className={styles.helper}>{t("profile.portfolioHelper")}</p>
                      {errors.portfolio && (
                        <span className={styles.error}>
                          {errors.portfolio.message}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className={styles.formActions}>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={isSubmitting}
                      >
                        {t("actions.cancel")}
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={isSubmitting}
                        loading={isSubmitting}
                      >
                        {isSubmitting ? t("actions.saving") : t("actions.save")}
                      </Button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Media Tab */}
              {activeTab === "media" && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={styles.tabContent}
                >
                  <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionTitle}>{t("media.title")}</h3>
                    <p className={styles.sectionDescription}>
                      {t("media.description")}
                    </p>
                  </div>

                  {loadingMedia ? (
                    <div className={styles.loading}>
                      <Loader2 className={styles.spinner} />
                      <p>Loading media...</p>
                    </div>
                  ) : (
                    <div className={styles.mediaSection}>
                      {/* Certificates */}
                      <div className={styles.mediaGroup}>
                        <h4 className={styles.mediaTitle}>
                          <FileText size={20} />
                          {t("media.certificates.title")}
                        </h4>
                        <p className={styles.mediaDescription}>
                          {t("media.certificates.description")}
                        </p>

                        <input
                          ref={certificateInputRef}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileUpload(e.target.files, "CERTIFICATE")}
                          className={styles.fileInput}
                        />

                        <button
                          type="button"
                          onClick={() => certificateInputRef.current?.click()}
                          className={styles.uploadButton}
                          disabled={isUploading}
                        >
                          <Upload size={20} />
                          {t("media.certificates.uploadButton")}
                        </button>

                        <MediaFilesList
                          files={mediaFiles.filter((f) => f.type === "CERTIFICATE")}
                          onDelete={handleFileDelete}
                        />
                      </div>

                      {/* Images */}
                      <div className={styles.mediaGroup}>
                        <h4 className={styles.mediaTitle}>
                          <ImageIcon size={20} />
                          {t("media.images.title")}
                        </h4>
                        <p className={styles.mediaDescription}>
                          {t("media.images.description")}
                        </p>

                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e.target.files, "IMAGE")}
                          className={styles.fileInput}
                        />

                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          className={styles.uploadButton}
                          disabled={isUploading}
                        >
                          <Upload size={20} />
                          {t("media.images.uploadButton")}
                        </button>

                        <MediaFilesList
                          files={mediaFiles.filter((f) => f.type === "IMAGE")}
                          onDelete={handleFileDelete}
                        />
                      </div>

                      {/* Videos */}
                      <div className={styles.mediaGroup}>
                        <h4 className={styles.mediaTitle}>
                          <Video size={20} />
                          {t("media.videos.title")}
                        </h4>
                        <p className={styles.mediaDescription}>
                          {t("media.videos.description")}
                        </p>

                        <input
                          ref={videoInputRef}
                          type="file"
                          accept="video/*"
                          onChange={(e) => handleFileUpload(e.target.files, "VIDEO")}
                          className={styles.fileInput}
                        />

                        <button
                          type="button"
                          onClick={() => videoInputRef.current?.click()}
                          className={styles.uploadButton}
                          disabled={isUploading}
                        >
                          <Upload size={20} />
                          {t("media.videos.uploadButton")}
                        </button>

                        <MediaFilesList
                          files={mediaFiles.filter((f) => f.type === "VIDEO")}
                          onDelete={handleFileDelete}
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Account Tab */}
              {activeTab === "account" && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={styles.tabContent}
                >
                  <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionTitle}>{t("account.title")}</h3>
                    <p className={styles.sectionDescription}>
                      {t("account.description")}
                    </p>
                  </div>

                  <div className={styles.accountInfo}>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>
                        {t("account.currentStatus")}
                      </span>
                      <span className={styles.infoBadge}>
                        {profileData?.profile?.status}
                      </span>
                    </div>

                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>
                        {t("account.memberSince")}
                      </span>
                      <span className={styles.infoValue}>
                        {profileData?.user.createdAt &&
                          new Date(profileData.user.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Media Files List Component
function MediaFilesList({
  files,
  onDelete,
}: {
  files: MediaFile[];
  onDelete: (id: number) => void;
}) {
  if (files.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No files uploaded yet</p>
      </div>
    );
  }

  return (
    <div className={styles.filesList}>
      {files.map((file) => (
        <div key={file.id} className={styles.fileItem}>
          <div className={styles.fileInfo}>
            <p className={styles.fileName}>{file.description || "Untitled"}</p>
            <p className={styles.fileSize}>
              {(file.sizeBytes / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <button
            onClick={() => onDelete(file.id)}
            className={styles.deleteButton}
            aria-label="Delete file"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
