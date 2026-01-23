import { useState, type ReactNode } from 'react';

export interface CollapsibleSectionProps {
  /** Section title */
  title: string;
  /** Optional count to display as badge */
  count?: number;
  /** Whether the section is expanded by default */
  defaultExpanded?: boolean;
  /** Section content */
  children: ReactNode;
  /** Optional className for the container */
  className?: string;
}

/**
 * A collapsible section with a header that can be expanded/collapsed.
 * Used for organizing content into expandable groups.
 */
export function CollapsibleSection({
  title,
  count,
  defaultExpanded = true,
  children,
  className = '',
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={`rounded-lg border border-gray-200 bg-white ${className}`}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {count !== undefined && (
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-600">
              {count}
            </span>
          )}
        </div>
        <svg
          className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isExpanded && <div className="border-t border-gray-200 p-4">{children}</div>}
    </div>
  );
}
