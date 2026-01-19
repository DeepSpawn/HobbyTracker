import {
  type InputHTMLAttributes,
  type ReactNode,
  forwardRef,
  useId,
} from 'react';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  helperText?: string;
  error?: string;
  size?: InputSize;
  fullWidth?: boolean;
  leftAddon?: ReactNode;
  rightAddon?: ReactNode;
}

const sizeStyles: Record<InputSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-4 py-3 text-lg',
};

const labelSizeStyles: Record<InputSize, string> = {
  sm: 'text-sm',
  md: 'text-sm',
  lg: 'text-base',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      size = 'md',
      fullWidth = false,
      leftAddon,
      rightAddon,
      className = '',
      id: providedId,
      required,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = providedId ?? generatedId;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;

    const hasError = Boolean(error);
    const describedBy = [
      hasError ? errorId : null,
      helperText && !hasError ? helperId : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

    const baseInputStyles =
      'block rounded-lg border bg-white placeholder:text-gray-400 transition-colors duration-fast focus:outline-none focus:ring-1 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed';

    const normalStyles = 'border-gray-300 focus:border-primary-500 focus:ring-primary-500';
    const errorStyles = 'border-error focus:border-error focus:ring-error';

    const inputClasses = [
      baseInputStyles,
      sizeStyles[size],
      hasError ? errorStyles : normalStyles,
      leftAddon ? 'pl-10' : '',
      rightAddon ? 'pr-10' : '',
      fullWidth ? 'w-full' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const containerClasses = fullWidth ? 'w-full' : 'inline-block';

    return (
      <div className={containerClasses}>
        {label && (
          <label
            htmlFor={id}
            className={`mb-1.5 block font-medium text-gray-700 ${labelSizeStyles[size]}`}
          >
            {label}
            {required && (
              <span className="ml-1 text-error" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <div className="relative">
          {leftAddon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
              {leftAddon}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            className={inputClasses}
            aria-invalid={hasError}
            aria-describedby={describedBy}
            aria-required={required}
            disabled={disabled}
            required={required}
            {...props}
          />
          {rightAddon && (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">
              {rightAddon}
            </div>
          )}
        </div>
        {hasError && (
          <p id={errorId} role="alert" className="mt-1.5 text-sm text-error">
            {error}
          </p>
        )}
        {helperText && !hasError && (
          <p id={helperId} className="mt-1.5 text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
