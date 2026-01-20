import {
  type ReactNode,
  type DragEvent,
  type ChangeEvent,
  useState,
  useRef,
  useCallback,
  useId,
} from 'react';

export interface FileDropZoneProps {
  /** Accepted file extensions (e.g., ['.json', '.ros', '.rosz']) */
  accept: string[];
  /** Callback when a valid file is dropped or selected */
  onFileDrop: (file: File) => void;
  /** Show loading state */
  isLoading?: boolean;
  /** Error message to display */
  error?: string;
  /** Disable the drop zone */
  disabled?: boolean;
  /** Custom content inside the drop zone */
  children?: ReactNode;
}

export function FileDropZone({
  accept,
  onFileDrop,
  isLoading = false,
  error,
  disabled = false,
  children,
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneId = useId();
  const errorId = useId();

  const isDisabled = disabled || isLoading;

  const validateFile = useCallback(
    (file: File): boolean => {
      const fileName = file.name.toLowerCase();
      return accept.some((ext) => fileName.endsWith(ext.toLowerCase()));
    },
    [accept]
  );

  const handleDragEnter = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isDisabled) {
        setIsDragging(true);
      }
    },
    [isDisabled]
  );

  const handleDragLeave = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      // Only set dragging to false if we're leaving the drop zone entirely
      if (e.currentTarget.contains(e.relatedTarget as Node)) {
        return;
      }
      setIsDragging(false);
    },
    []
  );

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
    },
    []
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (isDisabled) return;

      const files = e.dataTransfer.files;
      if (files.length === 0) return;

      const file = files[0];
      if (validateFile(file)) {
        onFileDrop(file);
      }
    },
    [isDisabled, validateFile, onFileDrop]
  );

  const handleClick = useCallback(() => {
    if (!isDisabled) {
      fileInputRef.current?.click();
    }
  }, [isDisabled]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if ((e.key === 'Enter' || e.key === ' ') && !isDisabled) {
        e.preventDefault();
        fileInputRef.current?.click();
      }
    },
    [isDisabled]
  );

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (validateFile(file)) {
          onFileDrop(file);
        }
      }
      // Reset input so same file can be selected again
      e.target.value = '';
    },
    [validateFile, onFileDrop]
  );

  const acceptString = accept.join(',');
  const acceptDisplay = accept.join(', ');

  const baseStyles =
    'relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors duration-fast';

  const stateStyles = (() => {
    if (isDisabled) {
      return 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50';
    }
    if (error) {
      return 'border-error bg-error/5 hover:border-error hover:bg-error/10';
    }
    if (isDragging) {
      return 'border-primary-500 bg-primary-50';
    }
    return 'border-gray-300 bg-white hover:border-primary-400 hover:bg-gray-50';
  })();

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={isDisabled ? -1 : 0}
        aria-disabled={isDisabled}
        aria-describedby={error ? errorId : undefined}
        aria-label={`Drop zone for ${acceptDisplay} files. Click or drag and drop to upload.`}
        className={`${baseStyles} ${stateStyles}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptString}
          onChange={handleFileChange}
          className="sr-only"
          id={dropZoneId}
          disabled={isDisabled}
          aria-hidden="true"
        />

        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary-500" />
            <p className="text-sm text-gray-600">Processing file...</p>
          </div>
        ) : children ? (
          children
        ) : (
          <div className="flex flex-col items-center gap-3">
            <UploadIcon className={isDragging ? 'text-primary-500' : 'text-gray-400'} />
            <div>
              <p className="text-sm font-medium text-gray-700">
                {isDragging ? 'Drop file here' : 'Drag and drop a file here'}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                or click to browse
              </p>
            </div>
            <p className="text-xs text-gray-400">
              Supported: {acceptDisplay}
            </p>
          </div>
        )}
      </div>

      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-2 text-sm text-error"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`h-10 w-10 ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
      />
    </svg>
  );
}

FileDropZone.displayName = 'FileDropZone';
