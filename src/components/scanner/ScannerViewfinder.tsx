import type { RefObject } from 'react';
import type { ScannerStatus, ScannerError } from '../../hooks/useBarcodeScanner';
import { Button } from '../ui/Button';

interface ScannerViewfinderProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  status: ScannerStatus;
  error: ScannerError | null;
  onRetry: () => void;
}

const CameraOffIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-16 w-16 text-gray-400"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 3l18 18"
    />
  </svg>
);

const ScanningIndicator = () => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
    <div className="relative w-64 h-48 sm:w-80 sm:h-60">
      {/* Corner brackets */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 320 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Top-left corner */}
        <path d="M20 60V20H60" stroke="white" strokeWidth="4" strokeLinecap="round" />
        {/* Top-right corner */}
        <path d="M260 20H300V60" stroke="white" strokeWidth="4" strokeLinecap="round" />
        {/* Bottom-left corner */}
        <path d="M20 180V220H60" stroke="white" strokeWidth="4" strokeLinecap="round" />
        {/* Bottom-right corner */}
        <path d="M260 220H300V180" stroke="white" strokeWidth="4" strokeLinecap="round" />
      </svg>

      {/* Scanning line animation */}
      <div className="absolute left-5 right-5 h-0.5 bg-amber-500 animate-scan-line" />
    </div>
  </div>
);

export function ScannerViewfinder({
  videoRef,
  status,
  error,
  onRetry,
}: ScannerViewfinderProps) {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] bg-gray-900 text-white p-6">
        <CameraOffIcon />
        <h3 className="mt-4 text-lg font-medium">
          {error.type === 'permission_denied' && 'Camera Access Denied'}
          {error.type === 'no_camera' && 'No Camera Found'}
          {error.type === 'not_supported' && 'Camera Not Supported'}
          {error.type === 'unknown' && 'Camera Error'}
        </h3>
        <p className="mt-2 text-center text-gray-300 max-w-sm">
          {error.message}
        </p>
        {error.type === 'permission_denied' && (
          <p className="mt-2 text-sm text-gray-400 text-center">
            Check your browser settings to allow camera access for this site.
          </p>
        )}
        <Button
          variant="primary"
          onClick={onRetry}
          className="mt-6"
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (status === 'requesting') {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] bg-gray-900 text-white p-6">
        <div className="w-12 h-12 border-4 border-gray-600 border-t-amber-500 rounded-full animate-spin" />
        <p className="mt-4 text-gray-300">Requesting camera access...</p>
      </div>
    );
  }

  if (status === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] bg-gray-900 text-white p-6">
        <CameraOffIcon />
        <p className="mt-4 text-gray-300">Camera is not active</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[300px] bg-black overflow-hidden">
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        playsInline
        muted
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" />

      {(status === 'scanning' || status === 'processing') && <ScanningIndicator />}

      {status === 'processing' && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center">
          <div className="bg-black/70 text-white px-4 py-2 rounded-full text-sm">
            Processing barcode...
          </div>
        </div>
      )}
    </div>
  );
}
