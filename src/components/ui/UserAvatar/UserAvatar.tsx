"use client";

import Image from "next/image";
import styles from "./UserAvatar.module.css";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
    user?: {
        name?: string | null;
        avatar?: string | null;
    } | null;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string; // Allow overriding/extending styles
}

export default function UserAvatar({ user, size = 'md', className }: UserAvatarProps) {
    return (
        <div className={cn(styles.avatar, styles[size], className)}>
            {user?.avatar ? (
                <Image
                    src={user.avatar}
                    alt={user?.name || "User"}
                    width={size === 'xl' ? 80 : size === 'lg' ? 48 : size === 'md' ? 40 : 32}
                    height={size === 'xl' ? 80 : size === 'lg' ? 48 : size === 'md' ? 40 : 32}
                    className={styles.avatarImage}
                    unoptimized // Keeping this as per original implementation
                />
            ) : user?.name ? (
                user.name.charAt(0).toUpperCase()
            ) : (
                "U"
            )}
        </div>
    );
}
