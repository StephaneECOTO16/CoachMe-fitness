'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Plus, Pencil, Trash2, X, Image as ImageIcon, Users, Dumbbell } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import imageCompression from 'browser-image-compression';
import Image from 'next/image';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Button from '@/components/ui/Button';
import { Modal, LoadingIndicator, Pagination } from '@/components';
import toast from '@/lib/toast';
import styles from './page.module.css';

interface Discipline {
    id: number;
    name: string;
    imageUrl: string | null;
    coachCount: number;
}

export default function AdminDisciplinesPage() {
    const t = useTranslations('admin.disciplines');
    const tDash = useTranslations('admin.dashboard');
    const tCommon = useTranslations('common');
    const searchParams = useSearchParams();
    const router = useRouter();

    const [disciplines, setDisciplines] = useState<Discipline[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedId, setHighlightedId] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingDiscipline, setEditingDiscipline] = useState<Discipline | null>(null);
    const [disciplineToDelete, setDisciplineToDelete] = useState<Discipline | null>(null);

    // Form States
    const [name, setName] = useState('');
    const [image, setImage] = useState<{ file: File | null, preview: string | null }>({ file: null, preview: null });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Refs for scrolling to disciplines
    const disciplineRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

    const fetchDisciplines = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/disciplines', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setDisciplines(data.disciplines);
            } else {
                toast.error(tDash('messages.loadDashboardError'));
            }
        } catch (error) {
            console.error('Error fetching disciplines:', error);
            toast.error(tDash('messages.loadDashboardError'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDisciplines();
    }, []);

    // Handle highlight query parameter
    useEffect(() => {
        const highlightParam = searchParams.get('highlight');
        if (highlightParam && disciplines.length > 0) {
            const disciplineId = parseInt(highlightParam);
            setHighlightedId(disciplineId);

            // Scroll to the discipline after a short delay to ensure rendering
            setTimeout(() => {
                const element = disciplineRefs.current[disciplineId];
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }

                // Remove highlight after 3 seconds
                setTimeout(() => setHighlightedId(null), 3000);
            }, 300);
        }
    }, [searchParams, disciplines]);

    const filteredDisciplines = useMemo(() => {
        return disciplines.filter(d =>
            d.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [disciplines, searchQuery]);

    // Pagination logic
    const totalPages = Math.ceil(filteredDisciplines.length / itemsPerPage);
    const paginatedDisciplines = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredDisciplines.slice(startIndex, endIndex);
    }, [filteredDisciplines, currentPage]);

    // Reset to page 1 when search query changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const handleOpenModal = (discipline?: Discipline) => {
        if (discipline) {
            setEditingDiscipline(discipline);
            setName(discipline.name);
            setImage({ file: null, preview: discipline.imageUrl });
        } else {
            setEditingDiscipline(null);
            setName('');
            setImage({ file: null, preview: null });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingDiscipline(null);
        setName('');
        if (image.preview && image.file) {
            URL.revokeObjectURL(image.preview);
        }
        setImage({ file: null, preview: null });
    };

    const onDrop = async (acceptedFiles: File[]) => {
        if (acceptedFiles?.length > 0) {
            const file = acceptedFiles[0];
            try {
                const compressed = await imageCompression(file, {
                    maxSizeMB: 1,
                    maxWidthOrHeight: 1200,
                    useWebWorker: true,
                });
                setImage({
                    file: compressed,
                    preview: URL.createObjectURL(compressed)
                });
            } catch (error) {
                console.error('Compression failed', error);
                setImage({
                    file,
                    preview: URL.createObjectURL(file)
                });
            }
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
        maxFiles: 1,
        onDrop,
    });

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error(tDash('createDiscipline.nameLabel') + ' is required');
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            let imageKey = editingDiscipline?.imageUrl ? (editingDiscipline.imageUrl.split('/').pop() || '') : '';

            // 1. Upload new image if provided
            if (image.file) {
                const presignedRes = await fetch('/api/admin/media/presigned-url', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        fileName: image.file.name,
                        mimeType: image.file.type,
                        fileSize: image.file.size
                    })
                });
                const presignedData = await presignedRes.json();
                if (!presignedData.success) throw new Error('Failed to get upload URL');

                await fetch(presignedData.presignedUrl.url, {
                    method: 'PUT',
                    body: image.file,
                    headers: { 'Content-Type': image.file.type }
                });
                imageKey = presignedData.presignedUrl.key;
            }

            // 2. Save Discipline (Create or Update)
            const url = editingDiscipline
                ? `/api/admin/disciplines/${editingDiscipline.id}`
                : '/api/disciplines/create';

            const method = editingDiscipline ? 'PATCH' : 'POST';
            const body: any = { name };
            if (imageKey) body.imageKey = imageKey;

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });
            const data = await res.json();

            if (data.success) {
                toast.success(editingDiscipline ? tDash('updateDiscipline.success') : tDash('createDiscipline.success'));
                handleCloseModal();
                fetchDisciplines();
            } else {
                toast.error(data.error?.message || tDash('createDiscipline.error'));
            }
        } catch (error) {
            console.error('Error saving discipline:', error);
            toast.error(tDash('createDiscipline.error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmDelete = (discipline: Discipline) => {
        setDisciplineToDelete(discipline);
        setIsDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (!disciplineToDelete) return;

        setIsDeleting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/disciplines/${disciplineToDelete.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success) {
                // Optimistically update UI by removing the discipline from state immediately
                setDisciplines(prev => prev.filter(d => d.id !== disciplineToDelete.id));
                toast.success(tDash('deleteDiscipline.success'));
                setIsDeleteModalOpen(false);
                setDisciplineToDelete(null);
            } else {
                toast.error(data.error?.message || tDash('deleteDiscipline.error'));
            }
        } catch (error) {
            console.error('Error deleting discipline:', error);
            toast.error(tDash('deleteDiscipline.error'));
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <ProtectedRoute allowedRoles={['ADMIN']}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <div className={styles.searchWrapper}>
                            <Search className={styles.searchIcon} size={18} />
                            <input
                                type="text"
                                placeholder={t('searchPlaceholder')}
                                className={styles.searchInput}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className={styles.headerRight}>
                        <Button onClick={() => handleOpenModal()} icon={<Plus size={20} />}>
                            {t('addDiscipline')}
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                        <LoadingIndicator label={tCommon('loading')} />
                    </div>
                ) : (
                    <>
                        <div className={styles.grid}>
                            {paginatedDisciplines.length > 0 ? (
                                paginatedDisciplines.map((discipline) => (
                                    <div
                                        key={discipline.id}
                                        ref={(el) => disciplineRefs.current[discipline.id] = el}
                                        className={`${styles.disciplineCard} ${highlightedId === discipline.id ? styles.highlighted : ''}`}
                                    >
                                        <div className={styles.imageWrapper}>
                                            {discipline.imageUrl ? (
                                                <Image
                                                    src={discipline.imageUrl}
                                                    alt={discipline.name}
                                                    fill
                                                    style={{ objectFit: 'cover' }}
                                                    sizes="(max-width: 768px) 100vw, 300px"
                                                />
                                            ) : (
                                                <div className={styles.placeholderImage}>
                                                    <ImageIcon size={48} />
                                                </div>
                                            )}
                                        </div>
                                        <div className={styles.cardContent}>
                                            <div className={styles.cardHeader}>
                                                <h3 className={styles.cardTitle}>{discipline.name}</h3>
                                            </div>
                                            <div className={styles.statsRow}>
                                                <div className={styles.statItem}>
                                                    <Users size={16} />
                                                    <span>{discipline.coachCount} {t('coaches')}</span>
                                                </div>
                                                <div className={styles.statItem}>
                                                    <button
                                                        className={`${styles.actionBtn} ${styles.editBtn}`}
                                                        onClick={() => handleOpenModal(discipline)}
                                                        title={t('actions.edit')}
                                                    >
                                                        <Pencil size={18} />
                                                    </button>
                                                    <button
                                                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                                        onClick={() => confirmDelete(discipline)}
                                                        title={t('actions.delete')}
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className={styles.noResults}>
                                    <ImageIcon size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                                    <p>{t('noDisciplines')}</p>
                                </div>
                            )}
                        </div>

                        {/* Pagination */}
                        {filteredDisciplines.length > itemsPerPage && (
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                            />
                        )}
                    </>
                )}

                {/* Create/Edit Modal */}
                <Modal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    title={editingDiscipline ? tDash('updateDiscipline.title') : tDash('createDiscipline.title')}
                    size="md"
                >
                    <div className={styles.modalForm}>
                        <div className={styles.inputGroup}>
                            <label className={styles.inputLabel}>{tDash('createDiscipline.nameLabel')}</label>
                            <input
                                type="text"
                                className={styles.textInput}
                                placeholder={tDash('createDiscipline.namePlaceholder')}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.inputLabel}>{tDash('createDiscipline.imageLabel')}</label>
                            {image.preview ? (
                                <div className={styles.previewContainer}>
                                    <img src={image.preview} alt="Preview" className={styles.previewImage} />
                                    <button
                                        className={styles.removeImageBtn}
                                        onClick={() => setImage({ file: null, preview: null })}
                                        type="button"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div
                                    {...getRootProps()}
                                    className={`${styles.dropzone} ${isDragActive ? styles.dropzoneActive : ''}`}
                                >
                                    <input {...getInputProps()} />
                                    <ImageIcon size={32} />
                                    <p>{tDash('createDiscipline.dropzone')}</p>
                                </div>
                            )}
                        </div>

                        <div className={styles.modalFooter}>
                            <Button variant="outline" onClick={handleCloseModal} disabled={isSubmitting}>
                                {tCommon('cancel')}
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleSave}
                                loading={isSubmitting}
                                disabled={isSubmitting}
                            >
                                {editingDiscipline ? tDash('actions.save') : tDash('createDiscipline.submit')}
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* Delete Confirmation Modal */}
                <Modal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    title={tDash('deleteDiscipline.title')}
                    size="sm"
                >
                    <div className={styles.deleteConfirmContent}>
                        <p>{tDash('deleteDiscipline.confirm', { name: disciplineToDelete?.name })}</p>
                        <p className={styles.deleteWarning}>{tCommon('actionIrreversible') || 'This action cannot be undone.'}</p>
                        <div className={styles.modalFooter}>
                            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting}>
                                {tCommon('cancel')}
                            </Button>
                            <Button
                                variant="danger"
                                onClick={handleDelete}
                                loading={isDeleting}
                                disabled={isDeleting}
                            >
                                {tCommon('delete')}
                            </Button>
                        </div>
                    </div>
                </Modal>
            </div>
        </ProtectedRoute>
    );
}
