import { type HTMLAttributes, forwardRef } from 'react';

export type ProgressBarSize = 'sm' | 'md' | 'lg';
export type ProgressBarVariant = 'default' | 'success';

export interface ProgressBarProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Progress value from 0 to 100 */
  value: number;
  /** Optional max value (defaults to 100) */
  max?: number;
  /** Size of the progress bar */
  size?: ProgressBarSize;
  /** Color variant */
  variant?: ProgressBarVariant;
}

const sizeStyles: Record<ProgressBarSize, string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

const variantStyles: Record<ProgressBarVariant, string> = {
  default: 'bg-primary-500',
  success: 'bg-status-complete',
};

export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      value,
      max = 100,
      size = 'md',
      variant = 'default',
      className = '',
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
      <div
        ref={ref}
        className={`w-full overflow-hidden rounded-full bg-gray-200 ${sizeStyles[size]} ${className}`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        {...props}
      >
        <div
          className={`h-full rounded-full transition-all duration-normal ${variantStyles[variant]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  }
);

ProgressBar.displayName = 'ProgressBar';
