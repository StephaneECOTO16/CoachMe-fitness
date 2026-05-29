import React, { forwardRef } from 'react';
import PhoneInputLib from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';
import 'react-phone-number-input/style.css';
import { cn } from '@/lib/utils';
import inputStyles from './Input.module.css';
import styles from './PhoneInput.module.css';

export interface PhoneInputProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  id?: string;
  className?: string;
  placeholder?: string;
  defaultCountry?: any;
  autoComplete?: string;
}

const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      required,
      id,
      value,
      onChange,
      placeholder = '+237 659 037 423',
      defaultCountry = 'CM',
      autoComplete = 'tel',
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className={cn(inputStyles.inputWrapper, className)}>
        {label && (
          <label htmlFor={inputId} className={inputStyles.label}>
            {label}
            {required && <span className={inputStyles.required}>*</span>}
          </label>
        )}
        
        <div className={cn(styles.phoneInputContainer, error && styles.error)}>
          <PhoneInputLib
            id={inputId}
            international
            countryCallingCodeEditable={false}
            defaultCountry={defaultCountry}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            flags={flags}
            ref={ref as any}
            inputProps={{ autoComplete }}
            {...props}
          />
        </div>

        {error && (
          <span id={`${inputId}-error`} className={cn(inputStyles.helperText, inputStyles.errorText)}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </span>
        )}
        {!error && helperText && (
          <span id={`${inputId}-helper`} className={inputStyles.helperText}>
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

PhoneInput.displayName = 'PhoneInput';

export default PhoneInput;
