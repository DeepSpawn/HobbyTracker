import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Input } from './Input';

describe('Input', () => {
  describe('rendering', () => {
    it('renders input element', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('renders label when provided', () => {
      render(<Input label="Email" />);
      expect(screen.getByText('Email')).toBeInTheDocument();
    });

    it('renders helper text when provided', () => {
      render(<Input helperText="Enter your email address" />);
      expect(screen.getByText('Enter your email address')).toBeInTheDocument();
    });

    it('renders error message when provided', () => {
      render(<Input error="Email is required" />);
      expect(screen.getByRole('alert')).toHaveTextContent('Email is required');
    });

    it('renders left addon', () => {
      render(<Input leftAddon={<span data-testid="left-addon">@</span>} />);
      expect(screen.getByTestId('left-addon')).toBeInTheDocument();
    });

    it('renders right addon', () => {
      render(<Input rightAddon={<span data-testid="right-addon">X</span>} />);
      expect(screen.getByTestId('right-addon')).toBeInTheDocument();
    });

    it('renders full width when fullWidth prop is true', () => {
      render(<Input fullWidth />);
      expect(screen.getByRole('textbox')).toHaveClass('w-full');
    });

    it('shows required indicator when required', () => {
      render(<Input label="Email" required />);
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('hides helper text when error is present', () => {
      render(<Input helperText="Some help" error="An error" />);
      expect(screen.queryByText('Some help')).not.toBeInTheDocument();
      expect(screen.getByText('An error')).toBeInTheDocument();
    });
  });

  describe('label association', () => {
    it('associates label with input via htmlFor', () => {
      render(<Input label="Email" />);
      const label = screen.getByText('Email');
      const input = screen.getByRole('textbox');
      expect(label).toHaveAttribute('for', input.id);
    });

    it('uses provided id', () => {
      render(<Input id="custom-id" label="Email" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('id', 'custom-id');
    });
  });

  describe('accessibility', () => {
    it('has aria-invalid when error present', () => {
      render(<Input error="Error message" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('has aria-describedby linking to error', () => {
      render(<Input id="test" error="Error message" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'test-error');
    });

    it('has aria-describedby linking to helper text', () => {
      render(<Input id="test" helperText="Help text" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'test-helper');
    });

    it('has aria-required when required', () => {
      render(<Input required />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-required', 'true');
    });

    it('error message has role="alert"', () => {
      render(<Input error="Error" />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('states', () => {
    it('shows error styling when error prop is provided', () => {
      render(<Input error="Error" />);
      expect(screen.getByRole('textbox')).toHaveClass('border-error');
    });

    it('is disabled when disabled prop is true', () => {
      render(<Input disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });
  });

  describe('sizes', () => {
    it('applies md size styles by default', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).toHaveClass('py-2');
    });

    it('applies sm size styles', () => {
      render(<Input size="sm" />);
      expect(screen.getByRole('textbox')).toHaveClass('py-1.5');
    });

    it('applies lg size styles', () => {
      render(<Input size="lg" />);
      expect(screen.getByRole('textbox')).toHaveClass('py-3');
    });
  });

  describe('interactions', () => {
    it('calls onChange when value changes', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} />);
      await user.type(screen.getByRole('textbox'), 'test');
      expect(handleChange).toHaveBeenCalled();
    });

    it('accepts user input', async () => {
      const user = userEvent.setup();
      render(<Input />);
      const input = screen.getByRole('textbox');
      await user.type(input, 'hello');
      expect(input).toHaveValue('hello');
    });
  });

  describe('ref forwarding', () => {
    it('forwards ref to input element', () => {
      const ref = vi.fn();
      render(<Input ref={ref} />);
      expect(ref).toHaveBeenCalledWith(expect.any(HTMLInputElement));
    });
  });
});
