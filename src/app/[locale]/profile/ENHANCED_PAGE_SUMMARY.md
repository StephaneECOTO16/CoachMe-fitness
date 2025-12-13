# Enhanced Profile Page - Implementation Summary

## ✅ Completed Features (Current)
1. Query parameter detection (`?openModal=true`)
2. URL cleanup after modal opens
3. Toast notifications (top-center position)
4. Profile editing for all user types

## 🚀 Features to Add

### 1. **Tabbed Modal Interface**
Add tabs to the existing modal:
- **Profile Tab** (existing functionality)
- **Media & Uploads Tab** (new)
- **Account Tab** (new - optional)

### 2. **Media Upload Tab Features**

#### A. **Drag-and-Drop Upload**
```typescript
import { useDropzone } from 'react-dropzone';

const { getRootProps, getInputProps, isDragActive } = useDropzone({
  accept: {
    'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
    'video/*': ['.mp4', '.webm'],
    'application/pdf': ['.pdf']
  },
  maxSize: 10 * 1024 * 1024, // 10MB
  onDrop: handleFileDrop
});
```

#### B. **Image Preview**
```typescript
const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

// Create preview URL
const preview = URL.createObjectURL(file);
setPreviewUrls(prev => ({ ...prev, [file.name]: preview }));

// Cleanup
useEffect(() => {
  return () => {
    Object.values(previewUrls).forEach(url => URL.revokeObjectURL(url));
  };
}, [previewUrls]);
```

#### C. **Upload Progress**
```typescript
const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

// Using XMLHttpRequest for progress tracking
const xhr = new XMLHttpRequest();
xhr.upload.addEventListener('progress', (e) => {
  if (e.lengthComputable) {
    const percentComplete = (e.loaded / e.total) * 100;
    setUploadProgress(prev => ({ ...prev, [fileName]: percentComplete }));
  }
});
```

#### D. **File Compression**
```typescript
import imageCompression from 'browser-image-compression';

const compressedFile = await imageCompression(file, {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true
});
```

#### E. **Bulk Upload**
```typescript
const handleBulkUpload = async (files: File[]) => {
  const uploadPromises = files.map(file => uploadFile(file));
  await Promise.all(uploadPromises);
};
```

### 3. **Media Types Support**
- **Certificates**: PDF, JPG, PNG
- **Images**: JPG, PNG, WebP
- **Videos**: MP4, WebM

### 4. **UI Components Needed**

#### Upload Zone Component
```tsx
<div className="upload-zone" {...getRootProps()}>
  <input {...getInputProps()} />
  {isDragActive ? (
    <p>Drop files here...</p>
  ) : (
    <p>Drag & drop files, or click to select</p>
  )}
</div>
```

#### Progress Bar Component
```tsx
<div className="progress-bar">
  <div
    className="progress-fill"
    style={{ width: `${progress}%` }}
  />
  <span>{progress}%</span>
</div>
```

#### Preview Grid Component
```tsx
<div className="preview-grid">
  {files.map(file => (
    <div key={file.name} className="preview-item">
      <img src={previewUrls[file.name]} alt={file.name} />
      <button onClick={() => removeFile(file.name)}>×</button>
    </div>
  ))}
</div>
```

## 📋 Implementation Steps

1. ✅ Install libraries
2. ⏳ Add tab navigation to modal
3. ⏳ Create MediaUploadTab component
4. ⏳ Implement drag-and-drop
5. ⏳ Add file preview
6. ⏳ Add progress tracking
7. ⏳ Add compression
8. ⏳ Test complete flow

## 🎨 Branding Colors
Use these CSS variables:
- Primary: `var(--primary)`
- Background: `var(--background)`
- Border: `var(--border)`
- Text: `var(--foreground)`

## 📝 API Integration
Already exists:
- `POST /api/coach/media/presigned-url` - Get upload URL
- `POST /api/coach/media` - Register uploaded file
- `GET /api/coach/media` - List media files
- `DELETE /api/coach/media/[mediaId]` - Delete file
