import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Modal } from './Modal';

describe('Modal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Test Modal',
    children: <p>Modal content</p>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any modals left in the DOM
    document.body.style.overflow = '';
  });

  describe('rendering', () => {
    it('renders when isOpen is true', () => {
      render(<Modal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<Modal {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders title in header', () => {
      render(<Modal {...defaultProps} />);
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
    });

    it('renders children in body', () => {
      render(<Modal {...defaultProps} />);
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('renders footer when provided', () => {
      render(<Modal {...defaultProps} footer={<button>Save</button>} />);
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    });

    it('renders close button when showCloseButton is true', () => {
      render(<Modal {...defaultProps} showCloseButton />);
      expect(screen.getByRole('button', { name: 'Close modal' })).toBeInTheDocument();
    });

    it('does not render close button when showCloseButton is false', () => {
      render(<Modal {...defaultProps} showCloseButton={false} />);
      expect(screen.queryByRole('button', { name: 'Close modal' })).not.toBeInTheDocument();
    });
  });

  describe('sizes', () => {
    it('applies md size by default', () => {
      render(<Modal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toHaveClass('sm:max-w-md');
    });

    it('applies sm size', () => {
      render(<Modal {...defaultProps} size="sm" />);
      expect(screen.getByRole('dialog')).toHaveClass('sm:max-w-sm');
    });

    it('applies lg size', () => {
      render(<Modal {...defaultProps} size="lg" />);
      expect(screen.getByRole('dialog')).toHaveClass('sm:max-w-lg');
    });

    it('applies xl size', () => {
      render(<Modal {...defaultProps} size="xl" />);
      expect(screen.getByRole('dialog')).toHaveClass('sm:max-w-xl');
    });

    it('applies full size', () => {
      render(<Modal {...defaultProps} size="full" />);
      expect(screen.getByRole('dialog')).toHaveClass('sm:max-w-4xl');
    });
  });

  describe('close button interaction', () => {
    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<Modal {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: 'Close modal' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('backdrop interaction', () => {
    it('calls onClose when backdrop is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<Modal {...defaultProps} onClose={onClose} />);

      const backdrop = screen.getByTestId('modal-backdrop');
      await user.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when backdrop is clicked if closeOnBackdropClick is false', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<Modal {...defaultProps} onClose={onClose} closeOnBackdropClick={false} />);

      const backdrop = screen.getByTestId('modal-backdrop');
      await user.click(backdrop);
      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not call onClose when clicking inside modal content', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<Modal {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByText('Modal content'));
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('escape key', () => {
    it('calls onClose when Escape is pressed', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<Modal {...defaultProps} onClose={onClose} />);

      await user.keyboard('{Escape}');
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when Escape is pressed if closeOnEsc is false', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<Modal {...defaultProps} onClose={onClose} closeOnEsc={false} />);

      await user.keyboard('{Escape}');
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('has role="dialog"', () => {
      render(<Modal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-modal="true"', () => {
      render(<Modal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-labelledby pointing to title', () => {
      render(<Modal {...defaultProps} />);
      const dialog = screen.getByRole('dialog');
      const labelledBy = dialog.getAttribute('aria-labelledby');
      expect(labelledBy).toBeTruthy();
      const title = document.getElementById(labelledBy!);
      expect(title).toHaveTextContent('Test Modal');
    });
  });

  describe('body scroll lock', () => {
    it('locks body scroll when open', () => {
      render(<Modal {...defaultProps} />);
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('restores body scroll when closed', () => {
      const { rerender } = render(<Modal {...defaultProps} />);
      expect(document.body.style.overflow).toBe('hidden');

      rerender(<Modal {...defaultProps} isOpen={false} />);
      expect(document.body.style.overflow).toBe('');
    });

    it('does not lock body scroll when preventBodyScroll is false', () => {
      render(<Modal {...defaultProps} preventBodyScroll={false} />);
      expect(document.body.style.overflow).not.toBe('hidden');
    });
  });

  describe('focus management', () => {
    it('traps focus within modal', async () => {
      const user = userEvent.setup();
      render(
        <Modal {...defaultProps}>
          <input data-testid="input-1" />
          <input data-testid="input-2" />
        </Modal>
      );

      // Tab through all focusable elements
      // Close button should be first
      expect(screen.getByRole('button', { name: 'Close modal' })).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('input-1')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('input-2')).toHaveFocus();

      // Should cycle back to first focusable
      await user.tab();
      expect(screen.getByRole('button', { name: 'Close modal' })).toHaveFocus();
    });

    it('focuses first focusable element on open', () => {
      render(
        <Modal {...defaultProps}>
          <button>First button</button>
        </Modal>
      );
      // Close button is first focusable
      expect(screen.getByRole('button', { name: 'Close modal' })).toHaveFocus();
    });
  });
});
