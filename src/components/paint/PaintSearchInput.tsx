import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
  type ChangeEvent,
} from 'react';
import type { PaintAutocompleteSuggestion } from '../../types/paintSearch';
import { usePaintSearch } from '../../hooks/usePaintSearch';

export interface PaintSearchInputProps {
  /** Callback when a paint is selected */
  onSelect: (paint: PaintAutocompleteSuggestion) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Initial brand filter */
  initialBrand?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Additional CSS classes for the container */
  className?: string;
  /** Label for the input */
  label?: string;
}

/**
 * Format brand name for display
 */
function formatBrand(brand: string): string {
  const brandMap: Record<string, string> = {
    citadel: 'Citadel',
    vallejo: 'Vallejo',
    army_painter: 'Army Painter',
  };
  return brandMap[brand] || brand;
}

/**
 * Paint search input with autocomplete dropdown
 */
export function PaintSearchInput({
  onSelect,
  placeholder = 'Search paints...',
  initialBrand,
  disabled = false,
  className = '',
  label,
}: PaintSearchInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    query,
    setQuery,
    suggestions,
    isSuggestionsLoading,
    filterOptions,
    setBrand,
    brand,
  } = usePaintSearch({ brand: initialBrand });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Open dropdown when query is long enough (for suggestions or no-results message)
  useEffect(() => {
    if (query.length >= 2) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [query]);

  // Reset highlighted index when suggestions change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [suggestions]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      if (item) {
        item.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value);
      if (e.target.value.length < 2) {
        setIsOpen(false);
      }
    },
    [setQuery]
  );

  const handleSelect = useCallback(
    (suggestion: PaintAutocompleteSuggestion) => {
      onSelect(suggestion);
      setQuery('');
      setIsOpen(false);
      setHighlightedIndex(-1);
      inputRef.current?.focus();
    },
    [onSelect, setQuery]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen || suggestions.length === 0) {
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
            handleSelect(suggestions[highlightedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setHighlightedIndex(-1);
          break;
      }
    },
    [isOpen, suggestions, highlightedIndex, handleSelect]
  );

  const handleBrandChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      setBrand(e.target.value);
    },
    [setBrand]
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="flex gap-2">
        {filterOptions && (
          <select
            value={brand}
            onChange={handleBrandChange}
            disabled={disabled}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
            aria-label="Filter by brand"
          >
            <option value="">All Brands</option>
            {filterOptions.brands.map((b) => (
              <option key={b} value={b}>
                {formatBrand(b)}
              </option>
            ))}
          </select>
        )}
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0 && query.length >= 2) {
                setIsOpen(true);
              }
            }}
            placeholder={placeholder}
            disabled={disabled}
            className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            aria-controls="paint-suggestions"
          />
          {isSuggestionsLoading && (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <svg
                className="h-4 w-4 animate-spin text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          )}
        </div>
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul
          ref={listRef}
          id="paint-suggestions"
          role="listbox"
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              role="option"
              aria-selected={index === highlightedIndex}
              className={`flex cursor-pointer items-center gap-3 px-4 py-2 ${
                index === highlightedIndex
                  ? 'bg-primary-50 text-primary-900'
                  : 'text-gray-900 hover:bg-gray-50'
              }`}
              onClick={() => handleSelect(suggestion)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {/* Color swatch */}
              <span
                className="h-6 w-6 flex-shrink-0 rounded border border-gray-200"
                style={{ backgroundColor: suggestion.hexColor }}
                aria-hidden="true"
              />
              {/* Paint info */}
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{suggestion.name}</div>
                <div className="truncate text-sm text-gray-500">
                  {suggestion.productLine}
                </div>
              </div>
              {/* Brand badge */}
              <span className="flex-shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                {formatBrand(suggestion.brand)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {isOpen && query.length >= 2 && suggestions.length === 0 && !isSuggestionsLoading && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 shadow-lg">
          No paints found matching "{query}"
        </div>
      )}
    </div>
  );
}
