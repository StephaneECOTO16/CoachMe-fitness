'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText, Image as ImageIcon, Video, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
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
      toast.error('Failed to load media files');
    } finally {
      setLoading(false);
    }
  }, [token]);

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
  const compressImage = async (file: File): Promise<File> => {
    if (!file.type.startsWith('image/')) return file;

    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 2,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });
      toast.success(`Compressed ${file.name} to ${(compressed.size / 1024 / 1024).toFixed(2)}MB`);
      return compressed;
    } catch (error) {
      console.error('Compression failed:', error);
      return file;
    }
  };

  // Upload file with progress tracking
  const uploadFile = async (file: File, type: 'CERTIFICATE' | 'IMAGE' | 'VIDEO') => {
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
          fileType: processedFile.type,
          mediaType: type,
        }),
      });

      const presignedData = await presignedResponse.json();
      if (!presignedData.success) throw new Error('Failed to get upload URL');

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

        xhr.open('PUT', presignedData.uploadUrl);
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
          s3Key: presignedData.s3Key,
          mimeType: processedFile.type,
          sizeBytes: processedFile.size,
          type,
          description: processedFile.name,
        }),
      });

      const registerData = await registerResponse.json();
      if (!registerData.success) throw new Error('Failed to register file');

      toast.success(`${processedFile.name} uploaded successfully!`);
      fetchMediaFiles(); // Refresh list
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Failed to upload ${file.name}`);
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
  };

  // Handle file drop
  const handleDrop = useCallback((acceptedFiles: File[], type: 'CERTIFICATE' | 'IMAGE' | 'VIDEO') => {
    acceptedFiles.forEach(file => uploadFile(file, type));
  }, [token]);

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
        toast.success('File deleted');
        setMediaFiles(prev => prev.filter(m => m.id !== mediaId));
      } else {
        toast.error('Failed to delete file');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete file');
    }
  };

  // Dropzone for certificates
  const certificateDropzone = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    onDrop: (files) => handleDrop(files, 'CERTIFICATE'),
  });

  // Dropzone for images
  const imageDropzone = useDropzone({
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxSize: 10 * 1024 * 1024,
    multiple: true,
    onDrop: (files) => handleDrop(files, 'IMAGE'),
  });

  // Dropzone for videos
  const videoDropzone = useDropzone({
    accept: { 'video/*': ['.mp4', '.webm', '.mov'] },
    maxSize: 50 * 1024 * 1024, // 50MB
    onDrop: (files) => handleDrop(files, 'VIDEO'),
  });

  if (loading) {
    return (
      <div className={styles.loading}>
        <Loader2 className={styles.spinner} />
        <p>Loading media...</p>
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
          Professional Certificates
        </h3>
        <p className={styles.sectionDescription}>
          Upload your coaching certifications (PDF, JPG, PNG)
        </p>

        <div
          {...certificateDropzone.getRootProps()}
          className={`${styles.dropzone} ${certificateDropzone.isDragActive ? styles.dropzoneActive : ''}`}
        >
          <input {...certificateDropzone.getInputProps()} />
          <Upload size={32} />
          <p>{certificateDropzone.isDragActive ? 'Drop here...' : 'Drag & drop or click to upload'}</p>
          <span className={styles.dropzoneHint}>Max 10MB • PDF, JPG, PNG</span>
        </div>

        <FileList files={certificates} onDelete={handleDelete} />
      </div>

      {/* Images Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <ImageIcon size={20} />
          Profile Gallery
        </h3>
        <p className={styles.sectionDescription}>
          Showcase your training environment and client transformations
        </p>

        <div
          {...imageDropzone.getRootProps()}
          className={`${styles.dropzone} ${imageDropzone.isDragActive ? styles.dropzoneActive : ''}`}
        >
          <input {...imageDropzone.getInputProps()} />
          <Upload size={32} />
          <p>{imageDropzone.isDragActive ? 'Drop here...' : 'Drag & drop or click to upload'}</p>
          <span className={styles.dropzoneHint}>Max 10MB • Multiple files supported</span>
        </div>

        <FileList files={images} onDelete={handleDelete} showPreview />
      </div>

      {/* Videos Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Video size={20} />
          Training Videos
        </h3>
        <p className={styles.sectionDescription}>
          Share short clips of your coaching sessions
        </p>

        <div
          {...videoDropzone.getRootProps()}
          className={`${styles.dropzone} ${videoDropzone.isDragActive ? styles.dropzoneActive : ''}`}
        >
          <input {...videoDropzone.getInputProps()} />
          <Upload size={32} />
          <p>{videoDropzone.isDragActive ? 'Drop here...' : 'Drag & drop or click to upload'}</p>
          <span className={styles.dropzoneHint}>Max 50MB • MP4, WebM, MOV</span>
        </div>

        <FileList files={videos} onDelete={handleDelete} />
      </div>

      {/* Uploading Files */}
      {Object.entries(uploadingFiles).length > 0 && (
        <div className={styles.uploadingSection}>
          <h4 className={styles.uploadingTitle}>Uploading...</h4>
          {Object.entries(uploadingFiles).map(([key, { file, preview, progress }]) => (
            <div key={key} className={styles.uploadingItem}>
              {preview && <img src={preview} alt={file.name} className={styles.uploadingPreview} />}
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
}: {
  files: MediaFile[];
  onDelete: (id: number, name: string) => void;
  showPreview?: boolean;
}) {
  if (files.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No files uploaded yet</p>
      </div>
    );
  }

  return (
    <div className={showPreview ? styles.gridList : styles.list}>
      {files.map(file => (
        <div key={file.id} className={showPreview ? styles.gridItem : styles.listItem}>
          {showPreview && file.type === 'IMAGE' && (
            <div className={styles.previewImage}>
              <img src={`${process.env.NEXT_PUBLIC_R2_URL}/${file.url}`} alt={file.description || 'Image'} />
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
