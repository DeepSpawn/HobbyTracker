import { useState } from 'react';

export function ImportInstructions() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-100"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2">
          <InfoIcon className="h-4 w-4 text-gray-500" />
          How to export your army list
        </span>
        <ChevronIcon className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="border-t border-gray-200 px-4 py-3">
          <div className="space-y-4 text-sm text-gray-600">
            {/* New Recruit */}
            <div>
              <h4 className="mb-1 font-medium text-gray-800">From New Recruit</h4>
              <ol className="ml-4 list-decimal space-y-1">
                <li>Open your roster in the New Recruit app</li>
                <li>Tap the menu icon (three dots)</li>
                <li>Select "Export" → "JSON"</li>
                <li>Save or share the file</li>
              </ol>
              <p className="mt-2 text-xs text-gray-500">
                Visit{' '}
                <a
                  href="https://newrecruit.eu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:underline"
                >
                  newrecruit.eu
                </a>
                {' '}to create rosters
              </p>
            </div>

            {/* BattleScribe */}
            <div>
              <h4 className="mb-1 font-medium text-gray-800">From BattleScribe</h4>
              <ol className="ml-4 list-decimal space-y-1">
                <li>Open your roster in BattleScribe</li>
                <li>Go to File → Save As (or Export)</li>
                <li>Save as .rosz or .ros file format</li>
              </ol>
            </div>

            {/* Supported Formats */}
            <div className="rounded border border-gray-200 bg-white p-3">
              <h4 className="mb-1 font-medium text-gray-800">Supported formats</h4>
              <ul className="ml-4 list-disc space-y-1">
                <li><code className="rounded bg-gray-100 px-1">.json</code> - New Recruit export</li>
                <li><code className="rounded bg-gray-100 px-1">.rosz</code> - BattleScribe compressed roster</li>
                <li><code className="rounded bg-gray-100 px-1">.ros</code> - BattleScribe XML roster</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

ImportInstructions.displayName = 'ImportInstructions';
