import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ScanResultCard } from './ScanResultCard';
import {
  mockCitadelPaint,
  mockNotFoundBarcode,
} from '../../test/fixtures/mockPaints';
import { EXPECTED_BARCODES } from '../../test/fixtures/barcodeImages';

describe('ScanResultCard', () => {
  const defaultProps = {
    paint: null,
    barcode: null,
    isOwned: false,
    isPending: false,
    onAddToInventory: vi.fn(),
    onDismiss: vi.fn(),
  };

  describe('rendering', () => {
    it('returns null when barcode is null', () => {
      const { container } = render(<ScanResultCard {...defaultProps} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders paint not found message when paint is null but barcode exists', () => {
      render(
        <ScanResultCard
          {...defaultProps}
          barcode={mockNotFoundBarcode}
        />
      );

      expect(screen.getByText('Paint Not Found')).toBeInTheDocument();
      expect(screen.getByText(`Barcode: ${mockNotFoundBarcode}`)).toBeInTheDocument();
    });

    it('displays "not in database" message for unknown barcode', () => {
      render(
        <ScanResultCard
          {...defaultProps}
          barcode={mockNotFoundBarcode}
        />
      );

      expect(screen.getByText('This barcode is not in our database yet.')).toBeInTheDocument();
    });

    it('renders paint info when paint is found', () => {
      render(
        <ScanResultCard
          {...defaultProps}
          paint={mockCitadelPaint}
          barcode={EXPECTED_BARCODES.citadel}
        />
      );

      expect(screen.getByText(mockCitadelPaint.name)).toBeInTheDocument();
    });

    it('displays brand and product line', () => {
      render(
        <ScanResultCard
          {...defaultProps}
          paint={mockCitadelPaint}
          barcode={EXPECTED_BARCODES.citadel}
        />
      );

      expect(screen.getByText(/Citadel - Base/)).toBeInTheDocument();
    });

    it('displays paint type', () => {
      render(
        <ScanResultCard
          {...defaultProps}
          paint={mockCitadelPaint}
          barcode={EXPECTED_BARCODES.citadel}
        />
      );

      // Paint type is formatted and appears in the detail line
      expect(screen.getByText(/Base - 21-08/)).toBeInTheDocument();
    });

    it('displays SKU when available', () => {
      render(
        <ScanResultCard
          {...defaultProps}
          paint={mockCitadelPaint}
          barcode={EXPECTED_BARCODES.citadel}
        />
      );

      expect(screen.getByText(new RegExp(mockCitadelPaint.sku!))).toBeInTheDocument();
    });

    it('renders color swatch with correct background color', () => {
      render(
        <ScanResultCard
          {...defaultProps}
          paint={mockCitadelPaint}
          barcode={EXPECTED_BARCODES.citadel}
        />
      );

      const swatch = screen.getByLabelText(`Paint color: ${mockCitadelPaint.hexColor}`);
      expect(swatch).toHaveStyle({ backgroundColor: mockCitadelPaint.hexColor });
    });
  });

  describe('ownership states', () => {
    it('shows Add button when not owned', () => {
      render(
        <ScanResultCard
          {...defaultProps}
          paint={mockCitadelPaint}
          barcode={EXPECTED_BARCODES.citadel}
          isOwned={false}
        />
      );

      expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
    });

    it('shows "In Collection" when owned', () => {
      render(
        <ScanResultCard
          {...defaultProps}
          paint={mockCitadelPaint}
          barcode={EXPECTED_BARCODES.citadel}
          isOwned={true}
        />
      );

      expect(screen.getByText(/In Collection/)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument();
    });

    it('disables Add button when pending', () => {
      render(
        <ScanResultCard
          {...defaultProps}
          paint={mockCitadelPaint}
          barcode={EXPECTED_BARCODES.citadel}
          isOwned={false}
          isPending={true}
        />
      );

      const addButton = screen.getByRole('button', { name: /add/i });
      expect(addButton).toBeDisabled();
    });

    it('shows loading state when pending', () => {
      render(
        <ScanResultCard
          {...defaultProps}
          paint={mockCitadelPaint}
          barcode={EXPECTED_BARCODES.citadel}
          isOwned={false}
          isPending={true}
        />
      );

      // Button should be in loading state
      const addButton = screen.getByRole('button', { name: /add/i });
      expect(addButton).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('interactions', () => {
    it('calls onAddToInventory when Add button clicked', async () => {
      const user = userEvent.setup();
      const onAddToInventory = vi.fn();

      render(
        <ScanResultCard
          {...defaultProps}
          paint={mockCitadelPaint}
          barcode={EXPECTED_BARCODES.citadel}
          onAddToInventory={onAddToInventory}
        />
      );

      await user.click(screen.getByRole('button', { name: /add/i }));

      expect(onAddToInventory).toHaveBeenCalledTimes(1);
    });

    it('does not call onAddToInventory when Add button disabled', async () => {
      const user = userEvent.setup();
      const onAddToInventory = vi.fn();

      render(
        <ScanResultCard
          {...defaultProps}
          paint={mockCitadelPaint}
          barcode={EXPECTED_BARCODES.citadel}
          isPending={true}
          onAddToInventory={onAddToInventory}
        />
      );

      await user.click(screen.getByRole('button', { name: /add/i }));

      expect(onAddToInventory).not.toHaveBeenCalled();
    });

    it('calls onDismiss when Scan Another clicked', async () => {
      const user = userEvent.setup();
      const onDismiss = vi.fn();

      render(
        <ScanResultCard
          {...defaultProps}
          paint={mockCitadelPaint}
          barcode={EXPECTED_BARCODES.citadel}
          onDismiss={onDismiss}
        />
      );

      await user.click(screen.getByRole('button', { name: /scan another/i }));

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('calls onDismiss when Continue clicked for not-found state', async () => {
      const user = userEvent.setup();
      const onDismiss = vi.fn();

      render(
        <ScanResultCard
          {...defaultProps}
          barcode={mockNotFoundBarcode}
          onDismiss={onDismiss}
        />
      );

      // Button has aria-label="Dismiss" which overrides visible text for accessibility
      await user.click(screen.getByRole('button', { name: /dismiss/i }));

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('color swatch has aria-label with hex color', () => {
      render(
        <ScanResultCard
          {...defaultProps}
          paint={mockCitadelPaint}
          barcode={EXPECTED_BARCODES.citadel}
        />
      );

      const swatch = screen.getByLabelText(`Paint color: ${mockCitadelPaint.hexColor}`);
      expect(swatch).toBeInTheDocument();
    });

    it('Add button has accessible name', () => {
      render(
        <ScanResultCard
          {...defaultProps}
          paint={mockCitadelPaint}
          barcode={EXPECTED_BARCODES.citadel}
        />
      );

      expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
    });

    it('Dismiss/Continue button has aria-label when needed', () => {
      render(
        <ScanResultCard
          {...defaultProps}
          barcode={mockNotFoundBarcode}
        />
      );

      // Button has aria-label="Dismiss" so we find it by that accessible name
      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      expect(dismissButton).toHaveAttribute('aria-label', 'Dismiss');
    });
  });

  describe('brand formatting', () => {
    it('formats citadel brand name correctly', () => {
      render(
        <ScanResultCard
          {...defaultProps}
          paint={mockCitadelPaint}
          barcode={EXPECTED_BARCODES.citadel}
        />
      );

      expect(screen.getByText(/Citadel/)).toBeInTheDocument();
    });

    it('formats army_painter brand name correctly', () => {
      const armyPainterPaint = {
        ...mockCitadelPaint,
        brand: 'army_painter',
      };

      render(
        <ScanResultCard
          {...defaultProps}
          paint={armyPainterPaint}
          barcode={EXPECTED_BARCODES.citadel}
        />
      );

      expect(screen.getByText(/Army Painter/)).toBeInTheDocument();
    });
  });

  describe('paint type formatting', () => {
    it('formats single-word paint type', () => {
      render(
        <ScanResultCard
          {...defaultProps}
          paint={mockCitadelPaint}
          barcode={EXPECTED_BARCODES.citadel}
        />
      );

      // Paint type appears with SKU
      expect(screen.getByText(/Base - 21-08/)).toBeInTheDocument();
    });

    it('formats underscore-separated paint type', () => {
      const layerPaint = {
        ...mockCitadelPaint,
        paintType: 'technical_effect',
        sku: 'TEST-SKU',
      };

      render(
        <ScanResultCard
          {...defaultProps}
          paint={layerPaint}
          barcode={EXPECTED_BARCODES.citadel}
        />
      );

      expect(screen.getByText(/Technical Effect - TEST-SKU/)).toBeInTheDocument();
    });
  });
});
