import { useState, useCallback } from 'react';
import { Modal } from '../ui';
import { Button } from '../ui';
import type { Paint } from '../../types/paint';

interface PaintDetailModalProps {
  paint: Paint | null;
  isOpen: boolean;
  onClose: () => void;
  isOwned: boolean;
  isPending: boolean;
  onToggleOwnership: () => void;
}

export function PaintDetailModal({
  paint,
  isOpen,
  onClose,
  isOwned,
  isPending,
  onToggleOwnership,
}: PaintDetailModalProps) {
  const [copied, setCopied] = useState(false);

  const formatBrand = (brand: string) => {
    return brand
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatPaintType = (paintType: string) => {
    return paintType
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleCopyHex = useCallback(async () => {
    if (!paint) return;
    try {
      await navigator.clipboard.writeText(paint.hexColor);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = paint.hexColor;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [paint]);

  if (!paint) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Paint Details"
      size="sm"
    >
      <div className="space-y-6">
        {/* Large color swatch and name */}
        <div className="flex items-start gap-4">
          <div
            className="h-20 w-20 shrink-0 rounded-lg border border-gray-200 shadow-sm"
            style={{ backgroundColor: paint.hexColor }}
            aria-label={`Color swatch: ${paint.hexColor}`}
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-semibold text-gray-900">{paint.name}</h3>
            <p className="mt-1 text-gray-600">
              {formatBrand(paint.brand)}
            </p>
          </div>
        </div>

        {/* Paint details */}
        <dl className="divide-y divide-gray-100">
          <div className="flex justify-between py-2">
            <dt className="text-sm font-medium text-gray-500">Product Line</dt>
            <dd className="text-sm text-gray-900">{paint.productLine}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-sm font-medium text-gray-500">Paint Type</dt>
            <dd className="text-sm text-gray-900">{formatPaintType(paint.paintType)}</dd>
          </div>
          {paint.sku && (
            <div className="flex justify-between py-2">
              <dt className="text-sm font-medium text-gray-500">SKU</dt>
              <dd className="text-sm text-gray-900">{paint.sku}</dd>
            </div>
          )}
          <div className="flex items-center justify-between py-2">
            <dt className="text-sm font-medium text-gray-500">Hex Color</dt>
            <dd className="flex items-center gap-2">
              <code className="rounded bg-gray-100 px-2 py-0.5 text-sm font-mono text-gray-900">
                {paint.hexColor}
              </code>
              <button
                type="button"
                onClick={handleCopyHex}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                aria-label="Copy hex color"
              >
                {copied ? (
                  <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </dd>
          </div>
        </dl>

        {/* Ownership toggle */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">
                {isOwned ? 'In your collection' : 'Not in collection'}
              </p>
              <p className="text-sm text-gray-500">
                {isOwned
                  ? 'Remove this paint from your inventory'
                  : 'Add this paint to your inventory'}
              </p>
            </div>
            <Button
              variant={isOwned ? 'secondary' : 'primary'}
              size="sm"
              onClick={onToggleOwnership}
              disabled={isPending}
              leftIcon={
                isOwned ? (
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                )
              }
            >
              {isOwned ? 'Owned' : 'Add to Collection'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
