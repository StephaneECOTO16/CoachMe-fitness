'use client';

import React from 'react';
import styles from './Pagination.module.css';

export interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    siblingCount?: number;
    showFirstLast?: boolean;
    className?: string;
}

const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    onPageChange,
    siblingCount = 1,
    showFirstLast = true,
    className = '',
}) => {
    // Generate page numbers to display
    const generatePageNumbers = (): (number | string)[] => {
        const totalNumbers = siblingCount * 2 + 3; // siblings + current + first + last
        const totalBlocks = totalNumbers + 2; // + 2 for ellipsis

        if (totalPages <= totalBlocks) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
        const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

        const shouldShowLeftDots = leftSiblingIndex > 2;
        const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

        if (!shouldShowLeftDots && shouldShowRightDots) {
            const leftItemCount = 3 + 2 * siblingCount;
            const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
            return [...leftRange, '...', totalPages];
        }

        if (shouldShowLeftDots && !shouldShowRightDots) {
            const rightItemCount = 3 + 2 * siblingCount;
            const rightRange = Array.from(
                { length: rightItemCount },
                (_, i) => totalPages - rightItemCount + i + 1
            );
            return [1, '...', ...rightRange];
        }

        if (shouldShowLeftDots && shouldShowRightDots) {
            const middleRange = Array.from(
                { length: rightSiblingIndex - leftSiblingIndex + 1 },
                (_, i) => leftSiblingIndex + i
            );
            return [1, '...', ...middleRange, '...', totalPages];
        }

        return [];
    };

    const pages = generatePageNumbers();

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages && page !== currentPage) {
            onPageChange(page);
        }
    };

    if (totalPages <= 1) {
        return null;
    }

    return (
        <nav className={`${styles.pagination} ${className}`} aria-label="Pagination">
            <ul className={styles.paginationList}>
                {/* First Page Button */}
                {showFirstLast && (
                    <li>
                        <button
                            className={`${styles.pageButton} ${styles.navButton}`}
                            onClick={() => handlePageChange(1)}
                            disabled={currentPage === 1}
                            aria-label="Go to first page"
                        >
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M18 17L13 12L18 7M11 17L6 12L11 7"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </button>
                    </li>
                )}

                {/* Previous Page Button */}
                <li>
                    <button
                        className={`${styles.pageButton} ${styles.navButton}`}
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        aria-label="Go to previous page"
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M15 18L9 12L15 6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </button>
                </li>

                {/* Page Numbers */}
                {pages.map((page, index) => {
                    if (page === '...') {
                        return (
                            <li key={`ellipsis-${index}`}>
                                <span className={styles.ellipsis}>...</span>
                            </li>
                        );
                    }

                    const pageNumber = page as number;
                    return (
                        <li key={pageNumber}>
                            <button
                                className={`${styles.pageButton} ${currentPage === pageNumber ? styles.active : ''
                                    }`}
                                onClick={() => handlePageChange(pageNumber)}
                                aria-label={`Go to page ${pageNumber}`}
                                aria-current={currentPage === pageNumber ? 'page' : undefined}
                            >
                                {pageNumber}
                            </button>
                        </li>
                    );
                })}

                {/* Next Page Button */}
                <li>
                    <button
                        className={`${styles.pageButton} ${styles.navButton}`}
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        aria-label="Go to next page"
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M9 18L15 12L9 6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </button>
                </li>

                {/* Last Page Button */}
                {showFirstLast && (
                    <li>
                        <button
                            className={`${styles.pageButton} ${styles.navButton}`}
                            onClick={() => handlePageChange(totalPages)}
                            disabled={currentPage === totalPages}
                            aria-label="Go to last page"
                        >
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M6 17L11 12L6 7M13 17L18 12L13 7"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </button>
                    </li>
                )}
            </ul>
        </nav>
    );
};

export default Pagination;
