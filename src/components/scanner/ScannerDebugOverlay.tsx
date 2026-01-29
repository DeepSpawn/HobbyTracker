import { useRef, useEffect } from 'react';
import type { DebugEvent, StreamInfo, ScannerStatus } from '../../hooks/useBarcodeScanner';

interface ScannerDebugOverlayProps {
  events: DebugEvent[];
  streamInfo: StreamInfo | null;
  status: ScannerStatus;
  lastBarcode: string | null;
  visible: boolean;
  onToggle: () => void;
}

const EVENT_TYPE_COLORS: Record<DebugEvent['type'], string> = {
  status_change: 'text-blue-300',
  barcode_detected: 'text-green-300',
  paint_lookup: 'text-yellow-300',
  error: 'text-red-300',
  camera_info: 'text-cyan-300',
  zxing_callback: 'text-purple-300',
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`;
}

export function ScannerDebugOverlay({
  events,
  streamInfo,
  status,
  lastBarcode,
  visible,
  onToggle,
}: ScannerDebugOverlayProps) {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <>
      {/* Toggle button - always visible */}
      <button
        type="button"
        onClick={onToggle}
        className="absolute top-2 right-2 z-50 bg-black/60 text-white text-xs px-2 py-1 rounded font-mono"
      >
        {visible ? 'Hide Debug' : 'Debug'}
      </button>

      {visible && (
        <div className="absolute inset-0 z-40 pointer-events-none">
          {/* Status bar */}
          <div className="pointer-events-auto bg-black/80 text-white text-xs font-mono p-2 flex gap-4 flex-wrap">
            <span>
              Status: <span className="text-yellow-300">{status}</span>
            </span>
            {lastBarcode && (
              <span>
                Last: <span className="text-green-300">{lastBarcode}</span>
              </span>
            )}
            {streamInfo && (
              <span>
                Camera: <span className="text-cyan-300">{streamInfo.width}x{streamInfo.height} @{Math.round(streamInfo.frameRate)}fps ({streamInfo.facingMode})</span>
              </span>
            )}
          </div>

          {/* Event log */}
          <div
            ref={logRef}
            className="pointer-events-auto absolute bottom-0 left-0 right-0 max-h-[40%] overflow-y-auto bg-black/80 text-xs font-mono p-2"
          >
            {events.length === 0 ? (
              <div className="text-gray-500">No debug events yet...</div>
            ) : (
              events.map((event, i) => (
                <div key={i} className="leading-tight py-0.5">
                  <span className="text-gray-500">{formatTime(event.timestamp)}</span>{' '}
                  <span className={EVENT_TYPE_COLORS[event.type]}>{event.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
