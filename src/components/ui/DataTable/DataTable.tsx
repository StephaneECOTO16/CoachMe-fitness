'use client';

import React, { ReactNode } from 'react';
import { Search, ChevronDown, ListFilter, ArrowUpDown, Eye, MoreVertical } from 'lucide-react';
import { Pagination, LoadingIndicator, StatusBadge } from '@/components';
import UserAvatar from '@/components/ui/UserAvatar/UserAvatar';
import styles from './DataTable.module.css';

export interface ColumnConfig<T> {
    header: string;
    key: string;
    render?: (item: T) => ReactNode;
    align?: 'left' | 'center' | 'right';
    className?: string;
}

export interface DataTableProps<T> {
    data: T[];
    columns: ColumnConfig<T>[];
    isLoading?: boolean;
    title?: string;

    // Search & Filter
    searchPlaceholder?: string;
    onSearchChange?: (value: string) => void;
    searchValue?: string;

    renderHeaderActions?: () => ReactNode;

    // Pagination
    pagination?: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
        onPageChange: (page: number) => void;
    };

    // Empty State
    emptyMessage?: string;
    emptyIcon?: ReactNode;

    onView?: (item: T) => void;
    onMoreActions?: (item: T) => void;
    renderRowActions?: (item: T) => ReactNode;

    // Visibility
    showHeader?: boolean;
    showFooter?: boolean;
}

const DataTable = <T extends { id: string | number }>({
    data,
    columns,
    isLoading = false,
    searchPlaceholder = 'Search...',
    onSearchChange,
    searchValue = '',
    renderHeaderActions,
    pagination,
    emptyMessage = 'No data found',
    emptyIcon,
    onView,
    onMoreActions,
    renderRowActions,
    showHeader = true,
    showFooter = true,
}: DataTableProps<T>) => {

    const renderPaginationInfo = () => {
        if (!pagination) return null;

        const start = (pagination.currentPage - 1) * pagination.itemsPerPage + 1;
        const end = Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems);

        return (
            <div className={styles.paginationInfo}>
                Showing {start} to {end} of {pagination.totalItems} items
            </div>
        );
    };

    return (
        <div className={styles.tableContainer}>
            {/* Search and Filters Header */}
            {showHeader && (
                <div className={styles.tableHeaderActions}>
                    <div className={styles.searchWrapper}>
                        <Search className={styles.searchIcon} size={18} />
                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder={searchPlaceholder}
                            value={searchValue}
                            onChange={(e) => onSearchChange?.(e.target.value)}
                        />
                    </div>

                    <div className={styles.filtersWrapper}>
                        {renderHeaderActions ? (
                            renderHeaderActions()
                        ) : (
                            <>
                                <button className={styles.filterButton}>
                                    <ListFilter size={18} />
                                    Status: All
                                    <ChevronDown size={14} />
                                </button>
                                <button className={styles.filterButton}>
                                    <ArrowUpDown size={18} />
                                    Sort by: Date
                                    <ChevronDown size={14} />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Table Content */}
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead className={styles.thead}>
                        <tr>
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    className={`${styles.th} ${column.className || ''}`}
                                    style={{ textAlign: column.align || 'left' }}
                                >
                                    {column.header}
                                </th>
                            ))}
                            {(onView || onMoreActions || renderRowActions) && (
                                <th className={styles.th} style={{ textAlign: 'right' }}>
                                    Actions
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={columns.length + (onView || onMoreActions || renderRowActions ? 1 : 0)}>
                                    <div className={styles.loadingOverlay}>
                                        <LoadingIndicator />
                                    </div>
                                </td>
                            </tr>
                        ) : data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + (onView || onMoreActions || renderRowActions ? 1 : 0)}>
                                    <div className={styles.emptyState}>
                                        {emptyIcon || <Search size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />}
                                        <p>{emptyMessage}</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            data.map((item) => (
                                <tr key={item.id} className={styles.tr}>
                                    {columns.map((column) => (
                                        <td
                                            key={`${item.id}-${column.key}`}
                                            className={`${styles.td} ${column.className || ''}`}
                                            style={{ textAlign: column.align || 'left' }}
                                        >
                                            {column.render ? column.render(item) : (item as any)[column.key]}
                                        </td>
                                    ))}

                                    {(onView || onMoreActions || renderRowActions) && (
                                        <td className={styles.td}>
                                            <div className={styles.actionsCell}>
                                                {renderRowActions ? (
                                                    renderRowActions(item)
                                                ) : (
                                                    <>
                                                        {onView && (
                                                            <button
                                                                className={styles.actionIconBtn}
                                                                onClick={() => onView(item)}
                                                                aria-label="View details"
                                                            >
                                                                <Eye size={18} />
                                                            </button>
                                                        )}
                                                        {onMoreActions && (
                                                            <button
                                                                className={styles.actionIconBtn}
                                                                onClick={() => onMoreActions(item)}
                                                                aria-label="More actions"
                                                            >
                                                                <MoreVertical size={18} />
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer with Stats and Pagination */}
            {showFooter && pagination && data.length > 0 && (
                <div className={styles.tableFooter}>
                    {renderPaginationInfo()}
                    <Pagination
                        currentPage={pagination.currentPage}
                        totalPages={pagination.totalPages}
                        onPageChange={pagination.onPageChange}
                    />
                </div>
            )}
        </div>
    );
};

export default DataTable;
