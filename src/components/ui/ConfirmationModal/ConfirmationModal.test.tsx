import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConfirmationModal } from './ConfirmationModal';

describe('ConfirmationModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  describe('rendering', () => {
    it('renders when isOpen is true', () => {
      render(<ConfirmationModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<ConfirmationModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders title', () => {
      render(<ConfirmationModal {...defaultProps} />);
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    });

    it('renders string message', () => {
      render(<ConfirmationModal {...defaultProps} />);
      expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
    });

    it('renders ReactNode message', () => {
      render(
        <ConfirmationModal
          {...defaultProps}
          message={<span data-testid="custom-message">Custom content</span>}
        />
      );
      expect(screen.getByTestId('custom-message')).toBeInTheDocument();
    });

    it('renders confirm button with default label', () => {
      render(<ConfirmationModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    });

    it('renders cancel button with default label', () => {
      render(<ConfirmationModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('renders custom confirm label', () => {
      render(<ConfirmationModal {...defaultProps} confirmLabel="Delete" />);
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });

    it('renders custom cancel label', () => {
      render(<ConfirmationModal {...defaultProps} cancelLabel="Go Back" />);
      expect(screen.getByRole('button', { name: 'Go Back' })).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onConfirm when confirm button is clicked', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      render(<ConfirmationModal {...defaultProps} onConfirm={onConfirm} />);

      await user.click(screen.getByRole('button', { name: 'Confirm' }));
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<ConfirmationModal {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<ConfirmationModal {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: 'Close modal' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('loading state', () => {
    it('disables cancel button when isLoading is true', () => {
      render(<ConfirmationModal {...defaultProps} isLoading />);
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    });

    it('shows loading indicator on confirm button when isLoading is true', () => {
      render(<ConfirmationModal {...defaultProps} isLoading />);
      expect(screen.getByRole('button', { name: 'Confirm' })).toHaveAttribute(
        'aria-busy',
        'true'
      );
    });

    it('hides close button when isLoading is true', () => {
      render(<ConfirmationModal {...defaultProps} isLoading />);
      expect(screen.queryByRole('button', { name: 'Close modal' })).not.toBeInTheDocument();
    });

    it('prevents backdrop click when isLoading is true', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<ConfirmationModal {...defaultProps} onClose={onClose} isLoading />);

      const backdrop = screen.getByTestId('modal-backdrop');
      await user.click(backdrop);
      expect(onClose).not.toHaveBeenCalled();
    });

    it('prevents escape key when isLoading is true', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<ConfirmationModal {...defaultProps} onClose={onClose} isLoading />);

      await user.keyboard('{Escape}');
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('variants', () => {
    it('renders danger variant by default', () => {
      render(<ConfirmationModal {...defaultProps} />);
      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      expect(confirmButton).toHaveClass('bg-error');
    });

    it('renders warning variant with primary button', () => {
      render(<ConfirmationModal {...defaultProps} variant="warning" />);
      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      expect(confirmButton).toHaveClass('bg-primary-600');
    });
  });
});
