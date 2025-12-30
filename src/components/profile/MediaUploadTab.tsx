'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText, Image as ImageIcon, Video } from 'lucide-react';
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import LoadingIndicator from '@/components/loading/LoadingIndicator';
import Image from 'next/image';
import styles from './MediaUploadTab.module.css';

interface MediaFile {
  id: number;
  url: string;
  type: 'CERTIFICATE' | 'IMAGE' | 'VIDEO' | 'OTHER';
  mimeType: string;
  sizeBytes: number;
  description: string | null;
  createdAt: string;
}

interface UploadingFile {
  file: File;
  preview?: string;
  progress: number;
  type: 'CERTIFICATE' | 'IMAGE' | 'VIDEO';
}

export default function MediaUploadTab() {
  const t = useTranslations('toast');
  const tCommon = useTranslations('common');
  const tMedia = useTranslations('coachDashboard.settingsModal.media');
  const tVal = useTranslations('validation');
  const { token } = useAuth();
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, UploadingFile>>({});
  const [loading, setLoading] = useState(true);

  // Fetch existing media files
  const fetchMediaFiles = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch('/api/coach/media', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (data.success) {
        setMediaFiles(data.media);
      }
    } catch (error) {
      console.error('Error fetching media:', error);
      toast.error(t('error.mediaLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => {
    fetchMediaFiles();
  }, [fetchMediaFiles]);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(uploadingFiles).forEach(({ preview }) => {
        if (preview) URL.revokeObjectURL(preview);
      });
    };
  }, [uploadingFiles]);

  // Compress image if needed
  const compressImage = useCallback(async (file: File): Promise<File> => {
    if (!file.type.startsWith('image/')) return file;

    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 2,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });
      const sizeMB = (compressed.size / 1024 / 1024).toFixed(2);
      toast.success(t('success.fileCompressed', { fileName: file.name, sizeMB }));
      return compressed;
    } catch (error) {
      console.error('Compression failed:', error);
      return file;
    }
  }, [t]);

  // Upload file with progress tracking
  const uploadFile = useCallback(async (file: File, type: 'CERTIFICATE' | 'IMAGE' | 'VIDEO') => {
    const fileKey = `${file.name}-${Date.now()}`;

    try {
      // Compress if image
      const processedFile = await compressImage(file);

      // Create preview
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;

      // Add to uploading state
      setUploadingFiles(prev => ({
        ...prev,
        [fileKey]: { file: processedFile, preview, progress: 0, type },
      }));

      // Step 1: Get presigned URL
      const presignedResponse = await fetch('/api/coach/media/presigned-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fileName: processedFile.name,
          mimeType: processedFile.type,
          fileSize: processedFile.size,
        }),
      });

      const presignedData = await presignedResponse.json();
      if (!presignedData.success) throw new Error('Failed to get upload URL');

      const { url: uploadUrl, key } = presignedData.presignedUrl;

      // Step 2: Upload to R2 with progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            setUploadingFiles(prev => ({
              ...prev,
              [fileKey]: { ...prev[fileKey], progress: percentComplete },
            }));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Upload failed')));

        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', processedFile.type);
        xhr.send(processedFile);
      });

      // Step 3: Register media in database
      const registerResponse = await fetch('/api/coach/media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          s3Key: key,
          mimeType: processedFile.type,
          sizeBytes: processedFile.size,
          type,
          description: processedFile.name,
        }),
      });

      const registerData = await registerResponse.json();
      if (!registerData.success) throw new Error('Failed to register file');

      toast.success(t('success.fileUploaded', { fileName: processedFile.name }));
      fetchMediaFiles(); // Refresh list
    } catch (error) {
      toast.error(t('error.fileUploadFailed', { fileName: file.name }));
    } finally {
      // Remove from uploading state
      setUploadingFiles(prev => {
        const updated = { ...prev };
        if (updated[fileKey]?.preview) {
          URL.revokeObjectURL(updated[fileKey].preview!);
        }
        delete updated[fileKey];
        return updated;
      });
    }
  }, [token, t, compressImage, fetchMediaFiles]);

  // Handle file drop
  const handleDrop = useCallback((acceptedFiles: File[], type: 'CERTIFICATE' | 'IMAGE' | 'VIDEO') => {
    acceptedFiles.forEach(file => uploadFile(file, type));
  }, [uploadFile]);

  // Delete file
  const handleDelete = async (mediaId: number, fileName: string) => {
    if (!confirm(`Delete ${fileName}?`)) return;

    try {
      const response = await fetch(`/api/coach/media/${mediaId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        toast.success(t('success.fileDeleted'));
        setMediaFiles(prev => prev.filter(m => m.id !== mediaId));
      } else {
        toast.error(t('error.fileDeleteFailed'));
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(t('toast.error.fileDeleteFailed'));
    }
  };

  // Dropzone for certificates
  const certificateDropzone = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png'],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    onDrop: (files) => handleDrop(files, 'CERTIFICATE'),
    onDropRejected: () => toast.error(tVal('fileTooLarge', { size: 5 })),
  });

  // Dropzone for images
  const imageDropzone = useDropzone({
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxSize: 5 * 1024 * 1024,
    multiple: true,
    onDrop: (files) => handleDrop(files, 'IMAGE'),
    onDropRejected: () => toast.error(tVal('fileTooLarge', { size: 5 })),
  });

  // Dropzone for videos
  const videoDropzone = useDropzone({
    accept: { 'video/*': ['.mp4', '.webm', '.mov'] },
    maxSize: 10 * 1024 * 1024, // 10MB
    onDrop: (files) => handleDrop(files, 'VIDEO'),
    onDropRejected: () => toast.error(tVal('fileTooLarge', { size: 10 })),
  });

  if (loading) {
    return (
      <div className={styles.loading}>
        <LoadingIndicator size="md" label={tCommon('loading')} unstyledLabel />
      </div>
    );
  }

  const certificates = mediaFiles.filter(f => f.type === 'CERTIFICATE');
  const images = mediaFiles.filter(f => f.type === 'IMAGE');
  const videos = mediaFiles.filter(f => f.type === 'VIDEO');

  return (
    <div className={styles.container}>
      {/* Certificates Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <FileText size={20} />
          {tMedia('certificates.title')}
        </h3>
        <p className={styles.sectionDescription}>
          {tMedia('certificates.description')}
        </p>

        <div
          {...certificateDropzone.getRootProps()}
          className={`${styles.dropzone} ${certificateDropzone.isDragActive ? styles.dropzoneActive : ''}`}
        >
          <input {...certificateDropzone.getInputProps()} />
          <Upload size={32} />
          <p>{certificateDropzone.isDragActive ? 'Drop here...' : tMedia('certificates.dropzone')}</p>
          <span className={styles.dropzoneHint}>{tMedia('maxFileSize', { size: '5' })} • PDF, JPG, PNG</span>
        </div>

        <FileList files={certificates} onDelete={handleDelete} tMedia={tMedia} />
      </div>

      {/* Images Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <ImageIcon size={20} />
          {tMedia('images.title')}
        </h3>
        <p className={styles.sectionDescription}>
          {tMedia('images.description')}
        </p>

        <div
          {...imageDropzone.getRootProps()}
          className={`${styles.dropzone} ${imageDropzone.isDragActive ? styles.dropzoneActive : ''}`}
        >
          <input {...imageDropzone.getInputProps()} />
          <Upload size={32} />
          <p>{imageDropzone.isDragActive ? 'Drop here...' : tMedia('images.dropzone')}</p>
          <span className={styles.dropzoneHint}>{tMedia('maxFileSize', { size: '5' })} • Multiple files supported</span>
        </div>

        <FileList files={images} onDelete={handleDelete} showPreview tMedia={tMedia} />
      </div>

      {/* Videos Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Video size={20} />
          {tMedia('videos.title')}
        </h3>
        <p className={styles.sectionDescription}>
          {tMedia('videos.description')}
        </p>

        <div
          {...videoDropzone.getRootProps()}
          className={`${styles.dropzone} ${videoDropzone.isDragActive ? styles.dropzoneActive : ''}`}
        >
          <input {...videoDropzone.getInputProps()} />
          <Upload size={32} />
          <p>{videoDropzone.isDragActive ? 'Drop here...' : tMedia('videos.dropzone')}</p>
          <span className={styles.dropzoneHint}>{tMedia('maxFileSize', { size: '10' })} • MP4, WebM, MOV</span>
        </div>

        <FileList files={videos} onDelete={handleDelete} showPreview tMedia={tMedia} />
      </div>

      {/* Uploading Files */}
      {Object.entries(uploadingFiles).length > 0 && (
        <div className={styles.uploadingSection}>
          <h4 className={styles.uploadingTitle}>{tMedia('uploading')}</h4>
          {Object.entries(uploadingFiles).map(([key, { file, preview, progress }]) => (
            <div key={key} className={styles.uploadingItem}>
              {preview && (
                <div className={styles.uploadingPreviewWrapper}>
                  <Image
                    src={preview}
                    alt={file.name}
                    fill
                    className={styles.uploadingPreview}
                    unoptimized
                  />
                </div>
              )}
              <div className={styles.uploadingInfo}>
                <p className={styles.uploadingName}>{file.name}</p>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                </div>
                <span className={styles.progressText}>{progress}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// File List Component
function FileList({
  files,
  onDelete,
  showPreview = false,
  tMedia,
}: {
  files: MediaFile[];
  onDelete: (id: number, name: string) => void;
  showPreview?: boolean;
  tMedia: (key: string, values?: any) => string;
}) {
  if (files.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>{tMedia('noFiles')}</p>
      </div>
    );
  }

  return (
    <div className={showPreview ? styles.gridList : styles.list}>
      {files.map(file => (
        <div key={file.id} className={showPreview ? styles.gridItem : styles.listItem}>
          {showPreview && file.type === 'IMAGE' && (
            <div className={styles.previewImage}>
              <Image
                src={file.url}
                alt={file.description || 'Image'}
                fill
                style={{ objectFit: 'cover' }}
                unoptimized
              />
            </div>
          )}
          {showPreview && file.type === 'VIDEO' && (
            <div className={styles.previewVideo}>
              <video src={file.url} controls preload="metadata">
                Your browser does not support the video tag.
              </video>
            </div>
          )}
          <div className={styles.fileInfo}>
            <p className={styles.fileName}>{file.description || 'Untitled'}</p>
            <p className={styles.fileSize}>{(file.sizeBytes / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <button
            onClick={() => onDelete(file.id, file.description || 'file')}
            className={styles.deleteButton}
            aria-label="Delete"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
