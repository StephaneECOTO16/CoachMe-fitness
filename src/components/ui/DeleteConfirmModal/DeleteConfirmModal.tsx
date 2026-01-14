'use client';

import React from 'react';
import Modal from '../Modal';
import Button from '../Button';
import { AlertTriangle } from 'lucide-react';
import styles from './DeleteConfirmModal.module.css';

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isLoading?: boolean;
    itemName?: string;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Delete',
    cancelText = 'Cancel',
    isLoading = false,
    itemName
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="sm"
        >
            <div className={styles.container}>
                <div className={styles.iconContainer}>
                    <AlertTriangle className={styles.icon} size={48} />
                </div>

                <div className={styles.content}>
                    <p className={styles.message}>{message}</p>
                    {itemName && (
                        <div className={styles.itemName}>
                            <strong>{itemName}</strong>
                        </div>
                    )}
                    <p className={styles.warning}>
                        This action cannot be undone.
                    </p>
                </div>

                <div className={styles.actions}>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        {cancelText}
                    </Button>
                    <Button
                        variant="danger"
                        onClick={onConfirm}
                        disabled={isLoading}
                        loading={isLoading}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default DeleteConfirmModal;
