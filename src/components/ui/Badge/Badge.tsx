import { type HTMLAttributes, type ReactNode, forwardRef } from 'react';

export type BadgeVariant = 'default' | 'to_buy' | 'owned' | 'assembled' | 'primed' | 'painted' | 'based';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700',
  to_buy: 'bg-status-to-buy/20 text-status-to-buy',
  owned: 'bg-status-owned/20 text-status-owned',
  assembled: 'bg-status-assembled/20 text-status-assembled',
  primed: 'bg-status-primed/20 text-status-primed',
  painted: 'bg-status-painted/20 text-status-painted',
  based: 'bg-status-based/20 text-status-based',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', size = 'sm', children, className = '', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center font-medium rounded-full';

    const classes = [baseStyles, variantStyles[variant], sizeStyles[size], className]
      .filter(Boolean)
      .join(' ');

    return (
      <span ref={ref} className={classes} {...props}>
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
