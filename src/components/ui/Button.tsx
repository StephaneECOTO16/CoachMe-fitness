import { ButtonHTMLAttributes, ElementType, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import styles from './Button.module.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  iconOnly?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  as?: ElementType;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      iconOnly = false,
      leftIcon,
      rightIcon,
      disabled,
      as,
      ...props
    },
    ref
  ) => {
    const Component: ElementType = as || 'button';
    const baseProps = {
      className: cn(
        styles.button,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        iconOnly && styles.iconOnly,
        loading && styles.loading,
        className
      ),
      ...(as ? {} : { disabled: disabled || loading }),
      ...(disabled || loading ? { 'aria-disabled': true } : {}),
      ...props,
    };

    return (
      <Component ref={ref as any} {...baseProps}>
        <span className={styles.content}>
          {leftIcon && <span className={styles.icon}>{leftIcon}</span>}
          {children}
          {rightIcon && <span className={styles.icon}>{rightIcon}</span>}
        </span>
        {loading && (
          <span className={styles.spinner}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                opacity="0.25"
              />
              <path
                d="M12 2a10 10 0 0 1 10 10"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
          </span>
        )}
      </Component>
    );
  }
);

Button.displayName = 'Button';

export default Button;
