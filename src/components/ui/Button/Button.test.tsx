import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  describe('rendering', () => {
    it('renders children correctly', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
    });

    it('renders with left icon', () => {
      render(<Button leftIcon={<span data-testid="left-icon">L</span>}>Click me</Button>);
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('renders with right icon', () => {
      render(<Button rightIcon={<span data-testid="right-icon">R</span>}>Click me</Button>);
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('renders full width when fullWidth prop is true', () => {
      render(<Button fullWidth>Click me</Button>);
      expect(screen.getByRole('button')).toHaveClass('w-full');
    });

    it('has type="button" by default', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });

    it('accepts custom type attribute', () => {
      render(<Button type="submit">Submit</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    });
  });

  describe('variants', () => {
    it('applies primary variant styles by default', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-primary-600');
    });

    it('applies secondary variant styles', () => {
      render(<Button variant="secondary">Click me</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-gray-100');
    });

    it('applies outline variant styles', () => {
      render(<Button variant="outline">Click me</Button>);
      expect(screen.getByRole('button')).toHaveClass('border-primary-600');
    });

    it('applies ghost variant styles', () => {
      render(<Button variant="ghost">Click me</Button>);
      expect(screen.getByRole('button')).toHaveClass('text-gray-700');
    });

    it('applies danger variant styles', () => {
      render(<Button variant="danger">Click me</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-error');
    });
  });

  describe('sizes', () => {
    it('applies md size styles by default', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button')).toHaveClass('min-h-[44px]');
    });

    it('applies sm size styles', () => {
      render(<Button size="sm">Click me</Button>);
      expect(screen.getByRole('button')).toHaveClass('min-h-[36px]');
    });

    it('applies lg size styles', () => {
      render(<Button size="lg">Click me</Button>);
      expect(screen.getByRole('button')).toHaveClass('min-h-[52px]');
    });
  });

  describe('loading state', () => {
    it('shows loading spinner when isLoading is true', () => {
      render(<Button isLoading>Click me</Button>);
      expect(screen.getByRole('button').querySelector('svg')).toBeInTheDocument();
    });

    it('is disabled when isLoading is true', () => {
      render(<Button isLoading>Click me</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('has aria-busy when loading', () => {
      render(<Button isLoading>Click me</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
    });

    it('hides left icon when loading', () => {
      render(
        <Button isLoading leftIcon={<span data-testid="left-icon">L</span>}>
          Click me
        </Button>
      );
      expect(screen.queryByTestId('left-icon')).not.toBeInTheDocument();
    });
  });

  describe('disabled state', () => {
    it('is disabled when disabled prop is true', () => {
      render(<Button disabled>Click me</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('does not call onClick when disabled', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(
        <Button disabled onClick={handleClick}>
          Click me
        </Button>
      );
      await user.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('interactions', () => {
    it('calls onClick when clicked', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      await user.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when loading', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(
        <Button isLoading onClick={handleClick}>
          Click me
        </Button>
      );
      await user.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('is focusable', async () => {
      const user = userEvent.setup();
      render(<Button>Click me</Button>);
      await user.tab();
      expect(screen.getByRole('button')).toHaveFocus();
    });

    it('can be activated with keyboard', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      await user.tab();
      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('ref forwarding', () => {
    it('forwards ref to button element', () => {
      const ref = vi.fn();
      render(<Button ref={ref}>Click me</Button>);
      expect(ref).toHaveBeenCalledWith(expect.any(HTMLButtonElement));
    });
  });
});
