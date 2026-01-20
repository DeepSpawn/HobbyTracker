import { useEffect, useCallback, useState, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { useInventory } from '../../hooks/useInventory';
import type { Paint } from '../../types/paint';
import { ScannerViewfinder } from './ScannerViewfinder';
import { ScanResultCard } from './ScanResultCard';

export interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaintAdded?: (paint: Paint) => void;
}

const CloseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export function BarcodeScannerModal({
  isOpen,
  onClose,
  onPaintAdded,
}: BarcodeScannerModalProps) {
  const [scanCount, setScanCount] = useState(0);
  const [addedCount, setAddedCount] = useState(0);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const { isOwned, toggleOwnership, isPending } = useInventory();

  const handlePaintFound = useCallback((_paint: Paint) => {
    setScanCount((c) => c + 1);
  }, []);

  const handlePaintNotFound = useCallback(() => {
    setScanCount((c) => c + 1);
  }, []);

  const {
    status,
    error,
    lastScannedBarcode,
    lastMatchedPaint,
    videoRef,
    startScanning,
    stopScanning,
    resetError,
    resetLastScan,
  } = useBarcodeScanner({
    onPaintFound: handlePaintFound,
    onPaintNotFound: handlePaintNotFound,
    continuous: true,
  });

  // Start scanning when modal opens
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      setScanCount(0);
      setAddedCount(0);
      startScanning();
    } else {
      stopScanning();
      resetLastScan();
      previousActiveElement.current?.focus();
    }
  }, [isOpen, startScanning, stopScanning, resetLastScan]);

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Escape key handling
  useEffect(() => {
    if (!isOpen) return;

    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const modal = modalRef.current;
    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    firstFocusable?.focus();

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    modal.addEventListener('keydown', handleTabKey);

    return () => {
      modal.removeEventListener('keydown', handleTabKey);
    };
  }, [isOpen]);

  const handleAddToInventory = useCallback(async () => {
    if (!lastMatchedPaint) return;

    try {
      await toggleOwnership(lastMatchedPaint.id);
      setAddedCount((c) => c + 1);
      onPaintAdded?.(lastMatchedPaint);
    } catch (err) {
      console.error('Failed to add paint to inventory:', err);
    }
  }, [lastMatchedPaint, toggleOwnership, onPaintAdded]);

  const handleDismiss = useCallback(() => {
    resetLastScan();
  }, [resetLastScan]);

  const handleRetry = useCallback(() => {
    resetError();
    startScanning();
  }, [resetError, startScanning]);

  if (!isOpen) return null;

  const paintId = lastMatchedPaint?.id;
  const paintIsOwned = paintId ? isOwned(paintId) : false;
  const paintIsPending = paintId ? isPending(paintId) : false;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex flex-col h-full"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/80 text-white z-10">
          <div>
            <h2 id={titleId} className="text-lg font-semibold">
              Scan Paint
            </h2>
            {scanCount > 0 && (
              <p className="text-sm text-gray-300">
                {scanCount} scanned
                {addedCount > 0 && `, ${addedCount} added`}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-white hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            aria-label="Close scanner"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Camera viewfinder */}
        <div className="flex-1 relative">
          <ScannerViewfinder
            videoRef={videoRef}
            status={status}
            error={error}
            onRetry={handleRetry}
          />
        </div>

        {/* Result card overlay */}
        {lastScannedBarcode && (
          <div className="absolute bottom-0 left-0 right-0 pb-safe">
            <ScanResultCard
              paint={lastMatchedPaint}
              barcode={lastScannedBarcode}
              isOwned={paintIsOwned}
              isPending={paintIsPending}
              onAddToInventory={handleAddToInventory}
              onDismiss={handleDismiss}
            />
          </div>
        )}

        {/* Instructions */}
        {!lastScannedBarcode && status === 'scanning' && (
          <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none">
            <div className="bg-black/70 text-white px-4 py-2 rounded-full text-sm">
              Point camera at paint barcode
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
