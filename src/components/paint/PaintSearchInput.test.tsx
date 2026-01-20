import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaintSearchInput } from './PaintSearchInput';
import * as usePaintSearchModule from '../../hooks/usePaintSearch';

// Mock the hook
vi.mock('../../hooks/usePaintSearch', () => ({
  usePaintSearch: vi.fn(),
}));

const mockSuggestions = [
  {
    id: '1',
    name: 'Abaddon Black',
    brand: 'citadel',
    productLine: 'Base',
    hexColor: '#000000',
  },
  {
    id: '2',
    name: 'Mephiston Red',
    brand: 'citadel',
    productLine: 'Base',
    hexColor: '#9A1115',
  },
];

const mockFilterOptions = {
  brands: ['citadel', 'vallejo', 'army_painter'],
  paintTypes: ['base', 'layer'],
  productLines: ['Base', 'Layer'],
};

const createMockHookReturn = (overrides = {}) => ({
  query: '',
  brand: '',
  results: [],
  suggestions: [],
  filterOptions: mockFilterOptions,
  isSearching: false,
  isSuggestionsLoading: false,
  totalMatches: 0,
  searchTimeMs: 0,
  error: null,
  setQuery: vi.fn(),
  setBrand: vi.fn(),
  reset: vi.fn(),
  search: vi.fn(),
  ...overrides,
});

describe('PaintSearchInput', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (usePaintSearchModule.usePaintSearch as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockHookReturn()
    );
  });

  describe('rendering', () => {
    it('renders input element', () => {
      render(<PaintSearchInput onSelect={mockOnSelect} />);
      expect(screen.getByPlaceholderText('Search paints...')).toBeInTheDocument();
    });

    it('renders with custom placeholder', () => {
      render(
        <PaintSearchInput onSelect={mockOnSelect} placeholder="Find paints..." />
      );
      expect(screen.getByPlaceholderText('Find paints...')).toBeInTheDocument();
    });

    it('renders label when provided', () => {
      render(<PaintSearchInput onSelect={mockOnSelect} label="Select Paint" />);
      expect(screen.getByText('Select Paint')).toBeInTheDocument();
    });

    it('renders brand filter dropdown', () => {
      render(<PaintSearchInput onSelect={mockOnSelect} />);
      expect(screen.getByLabelText('Filter by brand')).toBeInTheDocument();
    });

    it('renders brand options', () => {
      render(<PaintSearchInput onSelect={mockOnSelect} />);
      expect(screen.getByRole('option', { name: 'All Brands' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Citadel' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Vallejo' })).toBeInTheDocument();
    });

    it('disables input when disabled prop is true', () => {
      render(<PaintSearchInput onSelect={mockOnSelect} disabled />);
      expect(screen.getByPlaceholderText('Search paints...')).toBeDisabled();
    });
  });

  describe('suggestions dropdown', () => {
    it('shows suggestions when available', () => {
      (usePaintSearchModule.usePaintSearch as ReturnType<typeof vi.fn>).mockReturnValue(
        createMockHookReturn({
          query: 'ab',
          suggestions: mockSuggestions,
        })
      );

      render(<PaintSearchInput onSelect={mockOnSelect} />);

      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(screen.getByText('Abaddon Black')).toBeInTheDocument();
      expect(screen.getByText('Mephiston Red')).toBeInTheDocument();
    });

    it('shows color swatches', () => {
      (usePaintSearchModule.usePaintSearch as ReturnType<typeof vi.fn>).mockReturnValue(
        createMockHookReturn({
          query: 'ab',
          suggestions: mockSuggestions,
        })
      );

      render(<PaintSearchInput onSelect={mockOnSelect} />);

      const listbox = screen.getByRole('listbox');
      const swatches = listbox.querySelectorAll('[style*="background-color"]');
      expect(swatches.length).toBe(2);
    });

    it('shows brand badges', () => {
      (usePaintSearchModule.usePaintSearch as ReturnType<typeof vi.fn>).mockReturnValue(
        createMockHookReturn({
          query: 'ab',
          suggestions: mockSuggestions,
        })
      );

      render(<PaintSearchInput onSelect={mockOnSelect} />);

      const badges = screen.getAllByText('Citadel');
      expect(badges.length).toBeGreaterThan(0);
    });

    it('shows no results message when query has no matches', async () => {
      (usePaintSearchModule.usePaintSearch as ReturnType<typeof vi.fn>).mockReturnValue(
        createMockHookReturn({
          query: 'nonexistent',
          suggestions: [],
          isSuggestionsLoading: false,
        })
      );

      render(<PaintSearchInput onSelect={mockOnSelect} />);

      // The component should show the no results message when query is >= 2 chars and no suggestions
      expect(
        screen.getByText(/No paints found matching "nonexistent"/)
      ).toBeInTheDocument();
    });

    it('shows loading spinner when loading', () => {
      (usePaintSearchModule.usePaintSearch as ReturnType<typeof vi.fn>).mockReturnValue(
        createMockHookReturn({
          query: 'ab',
          isSuggestionsLoading: true,
        })
      );

      render(<PaintSearchInput onSelect={mockOnSelect} />);

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls setQuery on input change', async () => {
      const setQuery = vi.fn();
      (usePaintSearchModule.usePaintSearch as ReturnType<typeof vi.fn>).mockReturnValue(
        createMockHookReturn({ setQuery })
      );

      const user = userEvent.setup();
      render(<PaintSearchInput onSelect={mockOnSelect} />);

      await user.type(screen.getByPlaceholderText('Search paints...'), 'test');

      expect(setQuery).toHaveBeenCalled();
    });

    it('calls setBrand on brand select', async () => {
      const setBrand = vi.fn();
      (usePaintSearchModule.usePaintSearch as ReturnType<typeof vi.fn>).mockReturnValue(
        createMockHookReturn({ setBrand })
      );

      const user = userEvent.setup();
      render(<PaintSearchInput onSelect={mockOnSelect} />);

      await user.selectOptions(screen.getByLabelText('Filter by brand'), 'citadel');

      expect(setBrand).toHaveBeenCalledWith('citadel');
    });

    it('calls onSelect when suggestion clicked', async () => {
      const setQuery = vi.fn();
      (usePaintSearchModule.usePaintSearch as ReturnType<typeof vi.fn>).mockReturnValue(
        createMockHookReturn({
          query: 'ab',
          suggestions: mockSuggestions,
          setQuery,
        })
      );

      const user = userEvent.setup();
      render(<PaintSearchInput onSelect={mockOnSelect} />);

      await user.click(screen.getByText('Abaddon Black'));

      expect(mockOnSelect).toHaveBeenCalledWith(mockSuggestions[0]);
      expect(setQuery).toHaveBeenCalledWith('');
    });
  });

  describe('keyboard navigation', () => {
    it('navigates down with ArrowDown', async () => {
      (usePaintSearchModule.usePaintSearch as ReturnType<typeof vi.fn>).mockReturnValue(
        createMockHookReturn({
          query: 'ab',
          suggestions: mockSuggestions,
        })
      );

      const user = userEvent.setup();
      render(<PaintSearchInput onSelect={mockOnSelect} />);

      const input = screen.getByPlaceholderText('Search paints...');
      await user.click(input);
      await user.keyboard('{ArrowDown}');

      // Get options from the listbox (not the select dropdown)
      const listbox = screen.getByRole('listbox');
      const options = listbox.querySelectorAll('[role="option"]');
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('selects with Enter', async () => {
      const setQuery = vi.fn();
      (usePaintSearchModule.usePaintSearch as ReturnType<typeof vi.fn>).mockReturnValue(
        createMockHookReturn({
          query: 'ab',
          suggestions: mockSuggestions,
          setQuery,
        })
      );

      const user = userEvent.setup();
      render(<PaintSearchInput onSelect={mockOnSelect} />);

      const input = screen.getByPlaceholderText('Search paints...');
      await user.click(input);
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      expect(mockOnSelect).toHaveBeenCalledWith(mockSuggestions[0]);
    });

    it('closes dropdown with Escape', async () => {
      (usePaintSearchModule.usePaintSearch as ReturnType<typeof vi.fn>).mockReturnValue(
        createMockHookReturn({
          query: 'ab',
          suggestions: mockSuggestions,
        })
      );

      const user = userEvent.setup();
      render(<PaintSearchInput onSelect={mockOnSelect} />);

      const input = screen.getByPlaceholderText('Search paints...');
      await user.click(input);

      expect(screen.getByRole('listbox')).toBeInTheDocument();

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    it('has correct ARIA attributes on input', () => {
      render(<PaintSearchInput onSelect={mockOnSelect} />);

      const input = screen.getByPlaceholderText('Search paints...');
      expect(input).toHaveAttribute('aria-haspopup', 'listbox');
      expect(input).toHaveAttribute('aria-autocomplete', 'list');
    });

    it('has aria-expanded when suggestions shown', async () => {
      (usePaintSearchModule.usePaintSearch as ReturnType<typeof vi.fn>).mockReturnValue(
        createMockHookReturn({
          query: 'ab',
          suggestions: mockSuggestions,
        })
      );

      const user = userEvent.setup();
      render(<PaintSearchInput onSelect={mockOnSelect} />);

      const input = screen.getByPlaceholderText('Search paints...');
      await user.click(input);
      expect(input).toHaveAttribute('aria-expanded', 'true');
    });

    it('listbox options have aria-selected attribute', async () => {
      (usePaintSearchModule.usePaintSearch as ReturnType<typeof vi.fn>).mockReturnValue(
        createMockHookReturn({
          query: 'ab',
          suggestions: mockSuggestions,
        })
      );

      const user = userEvent.setup();
      render(<PaintSearchInput onSelect={mockOnSelect} />);

      await user.click(screen.getByPlaceholderText('Search paints...'));

      const listbox = screen.getByRole('listbox');
      const options = listbox.querySelectorAll('[role="option"]');
      options.forEach((option) => {
        expect(option).toHaveAttribute('aria-selected');
      });
    });
  });
});
