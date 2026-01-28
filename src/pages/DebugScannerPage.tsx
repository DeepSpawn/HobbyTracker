import { useState, useCallback, useRef } from 'react';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import type { DebugEvent } from '../hooks/useBarcodeScanner';
import { getPaintBySku } from '../services/paint';
import { detectBarcodeFromRgba } from '../services/scanner/barcodeDetection';
import type { Paint } from '../types/paint';

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`;
}

const EVENT_TYPE_COLORS: Record<DebugEvent['type'], string> = {
  status_change: 'text-blue-400',
  barcode_detected: 'text-green-400',
  paint_lookup: 'text-yellow-400',
  error: 'text-red-400',
  camera_info: 'text-cyan-400',
  zxing_callback: 'text-purple-400',
};

export function DebugScannerPage() {
  const [manualBarcode, setManualBarcode] = useState('');
  const [manualResult, setManualResult] = useState<{ paint: Paint | null; searched: boolean } | null>(null);
  const [manualLoading, setManualLoading] = useState(false);
  const [imageResult, setImageResult] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    status,
    error,
    lastScannedBarcode,
    lastMatchedPaint,
    videoRef,
    startScanning,
    stopScanning,
    debugEvents,
    streamInfo,
  } = useBarcodeScanner({
    debug: true,
    continuous: true,
  });

  const handleManualLookup = useCallback(async () => {
    if (!manualBarcode.trim()) return;
    setManualLoading(true);
    setManualResult(null);
    try {
      const paint = await getPaintBySku(manualBarcode.trim());
      setManualResult({ paint, searched: true });
    } catch (err) {
      console.error('Manual lookup failed:', err);
      setManualResult({ paint: null, searched: true });
    } finally {
      setManualLoading(false);
    }
  }, [manualBarcode]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageResult(null);
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);

      const result = detectBarcodeFromRgba(imageData.data, imageData.width, imageData.height);
      if (result) {
        setImageResult(`Detected: ${result.text} (${result.format})`);
      } else {
        setImageResult('No barcode detected in image');
      }
    };
    img.src = URL.createObjectURL(file);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-1">Barcode Scanner Debug</h1>
        <p className="text-gray-400 text-sm mb-6">Test camera, detection, and paint lookup independently</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column: Camera + Controls */}
          <div className="space-y-4">
            {/* Camera panel */}
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="p-3 border-b border-gray-700 flex items-center justify-between">
                <h2 className="font-semibold">Camera Feed</h2>
                <div className="flex gap-2">
                  {status === 'idle' || status === 'error' ? (
                    <button
                      type="button"
                      onClick={startScanning}
                      className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded"
                    >
                      Start
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopScanning}
                      className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1 rounded"
                    >
                      Stop
                    </button>
                  )}
                </div>
              </div>
              <div className="relative bg-black aspect-video">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                {status === 'idle' && (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                    Camera off - click Start
                  </div>
                )}
                {status === 'requesting' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
                  </div>
                )}
              </div>
              {/* Stream info */}
              {streamInfo && (
                <div className="p-2 bg-gray-850 text-xs font-mono text-gray-400 border-t border-gray-700">
                  {streamInfo.width}x{streamInfo.height} @ {Math.round(streamInfo.frameRate)}fps | {streamInfo.facingMode} | {streamInfo.label}
                </div>
              )}
            </div>

            {/* State display */}
            <div className="bg-gray-800 rounded-lg p-3">
              <h2 className="font-semibold mb-2">Scanner State</h2>
              <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                <div>
                  <span className="text-gray-400">Status:</span>{' '}
                  <span className={status === 'error' ? 'text-red-400' : status === 'scanning' ? 'text-green-400' : 'text-yellow-400'}>
                    {status}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Last barcode:</span>{' '}
                  <span className="text-green-400">{lastScannedBarcode ?? 'none'}</span>
                </div>
                {error && (
                  <div className="col-span-2">
                    <span className="text-gray-400">Error:</span>{' '}
                    <span className="text-red-400">{error.type}: {error.message}</span>
                  </div>
                )}
                {lastMatchedPaint && (
                  <div className="col-span-2">
                    <span className="text-gray-400">Matched paint:</span>{' '}
                    <span className="text-purple-400">{lastMatchedPaint.name} ({lastMatchedPaint.brand})</span>
                  </div>
                )}
              </div>
            </div>

            {/* Manual barcode lookup */}
            <div className="bg-gray-800 rounded-lg p-3">
              <h2 className="font-semibold mb-2">Manual Barcode Lookup</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualLookup()}
                  placeholder="Enter EAN/barcode..."
                  className="flex-1 bg-gray-700 text-white px-3 py-2 rounded text-sm font-mono placeholder-gray-500"
                />
                <button
                  type="button"
                  onClick={handleManualLookup}
                  disabled={manualLoading || !manualBarcode.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded"
                >
                  {manualLoading ? '...' : 'Lookup'}
                </button>
              </div>
              {manualResult?.searched && (
                <div className="mt-2 text-sm font-mono">
                  {manualResult.paint ? (
                    <div className="text-green-400">
                      Found: {manualResult.paint.name} ({manualResult.paint.brand} - {manualResult.paint.productLine})
                      {manualResult.paint.hexColor && (
                        <span
                          className="inline-block w-3 h-3 rounded-full ml-2 align-middle border border-gray-600"
                          style={{ backgroundColor: manualResult.paint.hexColor }}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="text-red-400">No paint found for "{manualBarcode}"</div>
                  )}
                </div>
              )}
            </div>

            {/* Image file detection */}
            <div className="bg-gray-800 rounded-lg p-3">
              <h2 className="font-semibold mb-2">Image Detection Test</h2>
              <p className="text-gray-400 text-xs mb-2">Upload a barcode image to test ZXing detection without camera</p>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="text-sm text-gray-400 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-gray-700 file:text-white file:text-sm"
              />
              <canvas ref={canvasRef} className="hidden" />
              {imageResult && (
                <div className={`mt-2 text-sm font-mono ${imageResult.startsWith('Detected') ? 'text-green-400' : 'text-red-400'}`}>
                  {imageResult}
                </div>
              )}
            </div>
          </div>

          {/* Right column: Event log */}
          <div className="bg-gray-800 rounded-lg flex flex-col" style={{ maxHeight: 'calc(100vh - 120px)' }}>
            <div className="p-3 border-b border-gray-700 flex items-center justify-between shrink-0">
              <h2 className="font-semibold">Event Log</h2>
              <span className="text-gray-500 text-xs">{debugEvents.length} events</span>
            </div>
            <div
              ref={logRef}
              className="flex-1 overflow-y-auto p-2 text-xs font-mono"
            >
              {debugEvents.length === 0 ? (
                <div className="text-gray-500 p-2">
                  Start the scanner to see debug events...
                </div>
              ) : (
                debugEvents.map((event, i) => (
                  <div key={i} className="py-0.5 leading-tight border-b border-gray-800/50">
                    <span className="text-gray-600">{formatTime(event.timestamp)}</span>{' '}
                    <span className={EVENT_TYPE_COLORS[event.type]}>{event.message}</span>
                    {event.data != null && (
                      <div className="text-gray-600 pl-16 truncate">
                        {JSON.stringify(event.data)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
