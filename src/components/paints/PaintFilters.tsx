import { Input } from '../ui';

interface PaintFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  brandFilter: string;
  onBrandChange: (brand: string) => void;
  brands: string[];
}

export function PaintFilters({
  searchQuery,
  onSearchChange,
  brandFilter,
  onBrandChange,
  brands,
}: PaintFiltersProps) {
  const formatBrand = (brand: string) =>
    brand
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
      {/* Search input */}
      <div className="flex-1">
        <Input
          label="Search paints"
          placeholder="Search by name, brand..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          fullWidth
          leftAddon={
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          }
        />
      </div>

      {/* Brand filter */}
      <div className="sm:w-48">
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Brand
        </label>
        <select
          value={brandFilter}
          onChange={(e) => onBrandChange(e.target.value)}
          className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-base transition-colors duration-150 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Brands</option>
          {brands.map((brand) => (
            <option key={brand} value={brand}>
              {formatBrand(brand)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
