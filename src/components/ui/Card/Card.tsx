import {
  type HTMLAttributes,
  type ReactNode,
  forwardRef,
  type KeyboardEvent,
} from 'react';

export type CardVariant = 'elevated' | 'outlined' | 'filled';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  isInteractive?: boolean;
  padding?: CardPadding;
  children: ReactNode;
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children?: ReactNode;
}

export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  align?: 'left' | 'center' | 'right' | 'between';
  children: ReactNode;
}

const variantStyles: Record<CardVariant, string> = {
  elevated: 'bg-white shadow-card',
  outlined: 'bg-white border border-gray-200',
  filled: 'bg-gray-100',
};

const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3 sm:p-4',
  md: 'p-4 sm:p-6',
  lg: 'p-6 sm:p-8',
};

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ title, subtitle, action, children, className = '', ...props }, ref) => {
    const baseStyles = 'px-4 py-3 sm:px-6 sm:py-4';

    if (children) {
      return (
        <div ref={ref} className={`${baseStyles} ${className}`} {...props}>
          {children}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={`${baseStyles} flex items-start justify-between gap-4 ${className}`}
        {...props}
      >
        <div>
          {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <div ref={ref} className={`px-4 py-3 sm:px-6 sm:py-4 ${className}`} {...props}>
        {children}
      </div>
    );
  }
);

CardBody.displayName = 'CardBody';

const alignStyles: Record<NonNullable<CardFooterProps['align']>, string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
  between: 'justify-between',
};

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ align = 'right', children, className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex items-center gap-3 border-t border-gray-200 px-4 py-3 sm:px-6 sm:py-4 ${alignStyles[align]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

type CardComponent = React.ForwardRefExoticComponent<
  CardProps & React.RefAttributes<HTMLDivElement>
> & {
  Header: typeof CardHeader;
  Body: typeof CardBody;
  Footer: typeof CardFooter;
};

const CardBase = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'elevated',
      isInteractive = false,
      padding = 'none',
      children,
      className = '',
      onClick,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'rounded-xl overflow-hidden';
    const interactiveStyles = isInteractive
      ? 'cursor-pointer transition-shadow duration-fast hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500'
      : '';

    const classes = [
      baseStyles,
      variantStyles[variant],
      paddingStyles[padding],
      interactiveStyles,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
      if (isInteractive && onClick && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
      }
    };

    return (
      <div
        ref={ref}
        className={classes}
        role={isInteractive ? 'button' : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        onClick={onClick}
        onKeyDown={isInteractive ? handleKeyDown : undefined}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardBase.displayName = 'Card';

export const Card = CardBase as CardComponent;
Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;
