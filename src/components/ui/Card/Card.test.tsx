import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Card } from './Card';

describe('Card', () => {
  describe('rendering', () => {
    it('renders children', () => {
      render(<Card>Card content</Card>);
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('applies elevated variant styles by default', () => {
      render(<Card data-testid="card">Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('shadow-card');
    });

    it('applies outlined variant styles', () => {
      render(<Card variant="outlined" data-testid="card">Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('border');
    });

    it('applies filled variant styles', () => {
      render(<Card variant="filled" data-testid="card">Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('bg-gray-100');
    });
  });

  describe('padding', () => {
    it('has no padding by default', () => {
      render(<Card data-testid="card">Content</Card>);
      const card = screen.getByTestId('card');
      expect(card).not.toHaveClass('p-4');
    });

    it('applies sm padding', () => {
      render(<Card padding="sm" data-testid="card">Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('p-3');
    });

    it('applies md padding', () => {
      render(<Card padding="md" data-testid="card">Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('p-4');
    });

    it('applies lg padding', () => {
      render(<Card padding="lg" data-testid="card">Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('p-6');
    });
  });

  describe('interactive mode', () => {
    it('has role="button" when interactive', () => {
      render(<Card isInteractive>Content</Card>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('is focusable when interactive', async () => {
      const user = userEvent.setup();
      render(<Card isInteractive>Content</Card>);
      await user.tab();
      expect(screen.getByRole('button')).toHaveFocus();
    });

    it('calls onClick when clicked', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(
        <Card isInteractive onClick={handleClick}>
          Content
        </Card>
      );
      await user.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('calls onClick when Enter is pressed', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(
        <Card isInteractive onClick={handleClick}>
          Content
        </Card>
      );
      await user.tab();
      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('calls onClick when Space is pressed', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(
        <Card isInteractive onClick={handleClick}>
          Content
        </Card>
      );
      await user.tab();
      await user.keyboard(' ');
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not have role="button" when not interactive', () => {
      render(<Card>Content</Card>);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });
});

describe('Card.Header', () => {
  it('renders title', () => {
    render(
      <Card>
        <Card.Header title="My Title" />
      </Card>
    );
    expect(screen.getByText('My Title')).toBeInTheDocument();
  });

  it('renders subtitle', () => {
    render(
      <Card>
        <Card.Header title="Title" subtitle="My subtitle" />
      </Card>
    );
    expect(screen.getByText('My subtitle')).toBeInTheDocument();
  });

  it('renders action element', () => {
    render(
      <Card>
        <Card.Header title="Title" action={<button>Action</button>} />
      </Card>
    );
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });

  it('renders children when provided', () => {
    render(
      <Card>
        <Card.Header>
          <span>Custom header content</span>
        </Card.Header>
      </Card>
    );
    expect(screen.getByText('Custom header content')).toBeInTheDocument();
  });
});

describe('Card.Body', () => {
  it('renders children', () => {
    render(
      <Card>
        <Card.Body>Body content</Card.Body>
      </Card>
    );
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });
});

describe('Card.Footer', () => {
  it('renders children', () => {
    render(
      <Card>
        <Card.Footer>Footer content</Card.Footer>
      </Card>
    );
    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });

  it('applies right alignment by default', () => {
    render(
      <Card>
        <Card.Footer data-testid="footer">Content</Card.Footer>
      </Card>
    );
    expect(screen.getByTestId('footer')).toHaveClass('justify-end');
  });

  it('applies left alignment', () => {
    render(
      <Card>
        <Card.Footer align="left" data-testid="footer">
          Content
        </Card.Footer>
      </Card>
    );
    expect(screen.getByTestId('footer')).toHaveClass('justify-start');
  });

  it('applies center alignment', () => {
    render(
      <Card>
        <Card.Footer align="center" data-testid="footer">
          Content
        </Card.Footer>
      </Card>
    );
    expect(screen.getByTestId('footer')).toHaveClass('justify-center');
  });

  it('applies between alignment', () => {
    render(
      <Card>
        <Card.Footer align="between" data-testid="footer">
          Content
        </Card.Footer>
      </Card>
    );
    expect(screen.getByTestId('footer')).toHaveClass('justify-between');
  });
});

describe('Card composition', () => {
  it('renders all subcomponents together', () => {
    render(
      <Card>
        <Card.Header title="Header" subtitle="Subtitle" />
        <Card.Body>Body</Card.Body>
        <Card.Footer>Footer</Card.Footer>
      </Card>
    );
    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Subtitle')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });
});
