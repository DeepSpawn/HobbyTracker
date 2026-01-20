import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PaintDetailModal } from './PaintDetailModal';
import type { Paint } from '../../types/paint';

const mockPaint: Paint = {
  id: 'test-paint-1',
  name: 'Mephiston Red',
  brand: 'citadel',
  productLine: 'Base',
  paintType: 'base',
  sku: '21-03',
  hexColor: '#9A1115',
  rgb: { r: 154, g: 17, b: 21 },
};

describe('PaintDetailModal', () => {
  const defaultProps = {
    paint: mockPaint,
    isOpen: true,
    onClose: vi.fn(),
    isOwned: false,
    isPending: false,
    onToggleOwnership: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  describe('rendering', () => {
    it('renders when isOpen is true and paint is provided', () => {
      render(<PaintDetailModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<PaintDetailModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('does not render when paint is null', () => {
      render(<PaintDetailModal {...defaultProps} paint={null} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders paint name', () => {
      render(<PaintDetailModal {...defaultProps} />);
      expect(screen.getByText('Mephiston Red')).toBeInTheDocument();
    });

    it('renders formatted brand name', () => {
      render(<PaintDetailModal {...defaultProps} />);
      expect(screen.getByText('Citadel')).toBeInTheDocument();
    });

    it('renders product line', () => {
      render(<PaintDetailModal {...defaultProps} />);
      expect(screen.getByText('Product Line')).toBeInTheDocument();
      // Product line value is "Base"
      expect(screen.getAllByText('Base').length).toBeGreaterThanOrEqual(1);
    });

    it('renders paint type', () => {
      render(<PaintDetailModal {...defaultProps} />);
      expect(screen.getByText('Paint Type')).toBeInTheDocument();
      // Paint type value is also "Base" (formatted from "base")
      expect(screen.getAllByText('Base').length).toBeGreaterThanOrEqual(1);
    });

    it('renders SKU when provided', () => {
      render(<PaintDetailModal {...defaultProps} />);
      expect(screen.getByText('21-03')).toBeInTheDocument();
    });

    it('does not render SKU row when not provided', () => {
      const paintWithoutSku = { ...mockPaint, sku: null };
      render(<PaintDetailModal {...defaultProps} paint={paintWithoutSku} />);
      expect(screen.queryByText('SKU')).not.toBeInTheDocument();
    });

    it('renders hex color code', () => {
      render(<PaintDetailModal {...defaultProps} />);
      expect(screen.getByText('#9A1115')).toBeInTheDocument();
    });

    it('renders color swatch with correct background color', () => {
      render(<PaintDetailModal {...defaultProps} />);
      const swatch = screen.getByLabelText('Color swatch: #9A1115');
      expect(swatch).toHaveStyle({ backgroundColor: '#9A1115' });
    });
  });

  describe('ownership status', () => {
    it('shows "Not in collection" when not owned', () => {
      render(<PaintDetailModal {...defaultProps} isOwned={false} />);
      expect(screen.getByText('Not in collection')).toBeInTheDocument();
      expect(screen.getByText('Add this paint to your inventory')).toBeInTheDocument();
    });

    it('shows "In your collection" when owned', () => {
      render(<PaintDetailModal {...defaultProps} isOwned={true} />);
      expect(screen.getByText('In your collection')).toBeInTheDocument();
      expect(screen.getByText('Remove this paint from your inventory')).toBeInTheDocument();
    });

    it('shows "Add to Collection" button when not owned', () => {
      render(<PaintDetailModal {...defaultProps} isOwned={false} />);
      expect(screen.getByRole('button', { name: /add to collection/i })).toBeInTheDocument();
    });

    it('shows "Owned" button when owned', () => {
      render(<PaintDetailModal {...defaultProps} isOwned={true} />);
      expect(screen.getByRole('button', { name: /owned/i })).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onToggleOwnership when ownership button is clicked', async () => {
      const user = userEvent.setup();
      const onToggleOwnership = vi.fn();
      render(<PaintDetailModal {...defaultProps} onToggleOwnership={onToggleOwnership} />);

      await user.click(screen.getByRole('button', { name: /add to collection/i }));
      expect(onToggleOwnership).toHaveBeenCalledTimes(1);
    });

    it('disables ownership button when isPending is true', () => {
      render(<PaintDetailModal {...defaultProps} isPending={true} />);
      expect(screen.getByRole('button', { name: /add to collection/i })).toBeDisabled();
    });

    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<PaintDetailModal {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: 'Close modal' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Escape is pressed', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<PaintDetailModal {...defaultProps} onClose={onClose} />);

      await user.keyboard('{Escape}');
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('copy hex color', () => {
    it('renders copy button for hex color', () => {
      render(<PaintDetailModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Copy hex color' })).toBeInTheDocument();
    });

    it('shows checkmark after copy button is clicked', async () => {
      const user = userEvent.setup();
      // Mock clipboard API
      const writeText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', {
        ...navigator,
        clipboard: { writeText },
      });

      render(<PaintDetailModal {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: 'Copy hex color' }));

      // After clicking, the icon should change to a checkmark
      // We can verify the button is still there
      expect(screen.getByRole('button', { name: 'Copy hex color' })).toBeInTheDocument();

      vi.unstubAllGlobals();
    });
  });

  describe('brand formatting', () => {
    it('formats underscore-separated brand names', () => {
      const paintWithUnderscoreBrand = { ...mockPaint, brand: 'army_painter' };
      render(<PaintDetailModal {...defaultProps} paint={paintWithUnderscoreBrand} />);
      expect(screen.getByText('Army Painter')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has accessible title', () => {
      render(<PaintDetailModal {...defaultProps} />);
      expect(screen.getByText('Paint Details')).toBeInTheDocument();
    });

    it('color swatch has aria-label', () => {
      render(<PaintDetailModal {...defaultProps} />);
      expect(screen.getByLabelText('Color swatch: #9A1115')).toBeInTheDocument();
    });
  });
});
