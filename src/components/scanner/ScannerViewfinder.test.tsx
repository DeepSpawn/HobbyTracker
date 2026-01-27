import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { ScannerViewfinder } from './ScannerViewfinder';
import type { ScannerStatus, ScannerError } from '../../hooks/useBarcodeScanner';

describe('ScannerViewfinder', () => {
  const createProps = (
    status: ScannerStatus = 'idle',
    error: ScannerError | null = null
  ) => ({
    videoRef: createRef<HTMLVideoElement>(),
    status,
    error,
    onRetry: vi.fn(),
  });

  describe('rendering', () => {
    it('always renders a video element', () => {
      render(<ScannerViewfinder {...createProps('idle')} />);

      expect(document.querySelector('video')).toBeInTheDocument();
    });

    it('video element has correct attributes', () => {
      render(<ScannerViewfinder {...createProps('scanning')} />);

      const video = document.querySelector('video');
      expect(video).toHaveAttribute('autoplay');
      expect(video).toHaveAttribute('playsinline');
      // Boolean attributes in React are set as properties, not attributes
      expect((video as HTMLVideoElement).muted).toBe(true);
    });

    it('hides video when not active', () => {
      render(<ScannerViewfinder {...createProps('idle')} />);

      const video = document.querySelector('video');
      expect(video).toHaveClass('invisible');
    });

    it('shows video when scanning', () => {
      render(<ScannerViewfinder {...createProps('scanning')} />);

      const video = document.querySelector('video');
      expect(video).not.toHaveClass('invisible');
    });

    it('shows video when processing', () => {
      render(<ScannerViewfinder {...createProps('processing')} />);

      const video = document.querySelector('video');
      expect(video).not.toHaveClass('invisible');
    });
  });

  describe('idle state', () => {
    it('shows "Camera is not active" message', () => {
      render(<ScannerViewfinder {...createProps('idle')} />);

      expect(screen.getByText('Camera is not active')).toBeInTheDocument();
    });

    it('shows camera off icon', () => {
      render(<ScannerViewfinder {...createProps('idle')} />);

      // Icon is rendered via SVG
      expect(document.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('requesting state', () => {
    it('shows "Requesting camera access..." message', () => {
      render(<ScannerViewfinder {...createProps('requesting')} />);

      expect(screen.getByText('Requesting camera access...')).toBeInTheDocument();
    });

    it('shows loading spinner', () => {
      render(<ScannerViewfinder {...createProps('requesting')} />);

      // Spinner has animate-spin class
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('scanning state', () => {
    it('shows scanning indicator overlay', () => {
      render(<ScannerViewfinder {...createProps('scanning')} />);

      // Scanning indicator has animated scanning line
      expect(document.querySelector('.animate-scan-line')).toBeInTheDocument();
    });

    it('shows corner brackets SVG', () => {
      render(<ScannerViewfinder {...createProps('scanning')} />);

      // SVG viewfinder brackets
      const svgs = document.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });

    it('does not show idle message when scanning', () => {
      render(<ScannerViewfinder {...createProps('scanning')} />);

      expect(screen.queryByText('Camera is not active')).not.toBeInTheDocument();
    });

    it('does not show requesting message when scanning', () => {
      render(<ScannerViewfinder {...createProps('scanning')} />);

      expect(screen.queryByText('Requesting camera access...')).not.toBeInTheDocument();
    });
  });

  describe('processing state', () => {
    it('shows "Processing barcode..." message', () => {
      render(<ScannerViewfinder {...createProps('processing')} />);

      expect(screen.getByText('Processing barcode...')).toBeInTheDocument();
    });

    it('still shows scanning indicator while processing', () => {
      render(<ScannerViewfinder {...createProps('processing')} />);

      expect(document.querySelector('.animate-scan-line')).toBeInTheDocument();
    });
  });

  describe('error states', () => {
    describe('permission_denied error', () => {
      const permissionError: ScannerError = {
        type: 'permission_denied',
        message: 'Camera access was denied. Please enable camera permissions.',
      };

      it('shows "Camera Access Denied" title', () => {
        render(<ScannerViewfinder {...createProps('error', permissionError)} />);

        expect(screen.getByText('Camera Access Denied')).toBeInTheDocument();
      });

      it('shows error message', () => {
        render(<ScannerViewfinder {...createProps('error', permissionError)} />);

        expect(screen.getByText(permissionError.message)).toBeInTheDocument();
      });

      it('shows permission-specific hint', () => {
        render(<ScannerViewfinder {...createProps('error', permissionError)} />);

        expect(
          screen.getByText(/Check your browser settings to allow camera access/)
        ).toBeInTheDocument();
      });

      it('shows Try Again button', () => {
        render(<ScannerViewfinder {...createProps('error', permissionError)} />);

        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });

    describe('no_camera error', () => {
      const noCameraError: ScannerError = {
        type: 'no_camera',
        message: 'No camera found. Please try on a device with a camera.',
      };

      it('shows "No Camera Found" title', () => {
        render(<ScannerViewfinder {...createProps('error', noCameraError)} />);

        expect(screen.getByText('No Camera Found')).toBeInTheDocument();
      });

      it('shows error message', () => {
        render(<ScannerViewfinder {...createProps('error', noCameraError)} />);

        expect(screen.getByText(noCameraError.message)).toBeInTheDocument();
      });

      it('does not show permission-specific hint', () => {
        render(<ScannerViewfinder {...createProps('error', noCameraError)} />);

        expect(
          screen.queryByText(/Check your browser settings/)
        ).not.toBeInTheDocument();
      });
    });

    describe('not_supported error', () => {
      const notSupportedError: ScannerError = {
        type: 'not_supported',
        message: 'Your browser does not support camera access.',
      };

      it('shows "Camera Not Supported" title', () => {
        render(<ScannerViewfinder {...createProps('error', notSupportedError)} />);

        expect(screen.getByText('Camera Not Supported')).toBeInTheDocument();
      });

      it('shows error message', () => {
        render(<ScannerViewfinder {...createProps('error', notSupportedError)} />);

        expect(screen.getByText(notSupportedError.message)).toBeInTheDocument();
      });
    });

    describe('unknown error', () => {
      const unknownError: ScannerError = {
        type: 'unknown',
        message: 'Something went wrong with the camera.',
      };

      it('shows "Camera Error" title', () => {
        render(<ScannerViewfinder {...createProps('error', unknownError)} />);

        expect(screen.getByText('Camera Error')).toBeInTheDocument();
      });

      it('shows error message', () => {
        render(<ScannerViewfinder {...createProps('error', unknownError)} />);

        expect(screen.getByText(unknownError.message)).toBeInTheDocument();
      });
    });
  });

  describe('interactions', () => {
    it('calls onRetry when Try Again clicked', async () => {
      const user = userEvent.setup();
      const onRetry = vi.fn();
      const error: ScannerError = {
        type: 'permission_denied',
        message: 'Access denied',
      };

      render(
        <ScannerViewfinder
          videoRef={createRef()}
          status="error"
          error={error}
          onRetry={onRetry}
        />
      );

      await user.click(screen.getByRole('button', { name: /try again/i }));

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('does not show retry button when there is no error', () => {
      render(<ScannerViewfinder {...createProps('scanning')} />);

      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });
  });

  describe('video ref', () => {
    it('attaches videoRef to video element', () => {
      const videoRef = createRef<HTMLVideoElement>();

      render(
        <ScannerViewfinder
          videoRef={videoRef}
          status="scanning"
          error={null}
          onRetry={vi.fn()}
        />
      );

      expect(videoRef.current).toBeInstanceOf(HTMLVideoElement);
    });
  });

  describe('accessibility', () => {
    it('maintains minimum height for viewfinder area', () => {
      const { container } = render(<ScannerViewfinder {...createProps('scanning')} />);

      const viewfinder = container.firstChild as HTMLElement;
      expect(viewfinder).toHaveClass('min-h-[300px]');
    });

    it('error overlay is visually distinct', () => {
      const error: ScannerError = {
        type: 'permission_denied',
        message: 'Access denied',
      };

      render(<ScannerViewfinder {...createProps('error', error)} />);

      // Error overlay has background and centered content
      const overlay = document.querySelector('.bg-gray-900');
      expect(overlay).toBeInTheDocument();
    });
  });

  describe('state transitions', () => {
    it('error state takes precedence over other states', () => {
      const error: ScannerError = {
        type: 'unknown',
        message: 'Test error',
      };

      // Even with status = 'scanning', error should show
      render(<ScannerViewfinder {...createProps('scanning', error)} />);

      expect(screen.getByText('Camera Error')).toBeInTheDocument();
      expect(screen.queryByText('Processing barcode...')).not.toBeInTheDocument();
    });
  });
});
