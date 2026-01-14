'use client';

import React, { useState, useRef, useEffect, ReactNode } from 'react';
import styles from './Dropdown.module.css';
import Portal from '../Portal';

export interface DropdownItem {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
    variant?: 'default' | 'danger';
    disabled?: boolean;
}

interface DropdownProps {
    trigger: ReactNode;
    items: DropdownItem[];
    align?: 'left' | 'right';
}

const Dropdown: React.FC<DropdownProps> = ({ trigger, items, align = 'right' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

    const updateCoords = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom,
                left: align === 'left' ? rect.left : rect.right,
                width: rect.width
            });
        }
    };

    useEffect(() => {
        if (isOpen) {
            updateCoords();
            window.addEventListener('scroll', updateCoords, true);
            window.addEventListener('resize', updateCoords);
        }
        return () => {
            window.removeEventListener('scroll', updateCoords, true);
            window.removeEventListener('resize', updateCoords);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, align]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const isClickInsideTrigger = dropdownRef.current && dropdownRef.current.contains(event.target as Node);
            const isClickInsideMenu = menuRef.current && menuRef.current.contains(event.target as Node);

            if (!isClickInsideTrigger && !isClickInsideMenu) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className={styles.dropdown} ref={dropdownRef}>
            <div
                className={styles.trigger}
                ref={triggerRef}
                onClick={() => setIsOpen(!isOpen)}
            >
                {trigger}
            </div>

            {isOpen && (
                <Portal>
                    <div
                        className={styles.menu}
                        ref={menuRef}
                        style={{
                            position: 'fixed',
                            top: coords.top,
                            left: align === 'left' ? coords.left : 'auto',
                            right: align === 'right' ? (typeof window !== 'undefined' ? window.innerWidth - coords.left : 0) : 'auto',
                            marginTop: '4px'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >

                        {items.map((item, index) => (
                            <button
                                key={index}
                                className={`${styles.item} ${item.variant === 'danger' ? styles.danger : ''}`}
                                onClick={() => {
                                    if (!item.disabled) {
                                        item.onClick();
                                        setIsOpen(false);
                                    }
                                }}
                                disabled={item.disabled}
                            >
                                {item.icon && <span className={styles.icon}>{item.icon}</span>}
                                {item.label}
                            </button>
                        ))}
                    </div>
                </Portal>
            )}
        </div>
    );
};

export default Dropdown;

