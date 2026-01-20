import { useState, useCallback } from 'react';
import { Modal, Button, FileDropZone } from '../ui';
import { ImportPreview } from './ImportPreview';
import { ImportInstructions } from './ImportInstructions';
import {
  parseArmyListFile,
  getSupportedExtensions,
} from '../../services/armyListParser/battleScribeParser';
import type { NewRecruitParseResult } from '../../types/newRecruit';

export interface ImportWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onValidationComplete?: (result: NewRecruitParseResult) => void;
}

type InputMode = 'file' | 'paste';
type ValidationState = 'idle' | 'validating' | 'valid' | 'error';

export function ImportWizardModal({
  isOpen,
  onClose,
  onValidationComplete,
}: ImportWizardModalProps) {
  const [inputMode, setInputMode] = useState<InputMode>('file');
  const [validationState, setValidationState] = useState<ValidationState>('idle');
  const [parseResult, setParseResult] = useState<NewRecruitParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pasteContent, setPasteContent] = useState('');

  const supportedExtensions = getSupportedExtensions();

  const resetState = useCallback(() => {
    setValidationState('idle');
    setParseResult(null);
    setError(null);
    setPasteContent('');
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  const handleModeChange = useCallback((mode: InputMode) => {
    setInputMode(mode);
    resetState();
  }, [resetState]);

  const validateAndParse = useCallback(async (file: File | Blob, fileName: string) => {
    setValidationState('validating');
    setError(null);

    try {
      // Create a File-like object if we have a Blob
      const fileToProcess = file instanceof File
        ? file
        : new File([file], fileName, { type: 'application/json' });

      const result = await parseArmyListFile(fileToProcess);
      setParseResult(result);
      setValidationState('valid');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse file';
      setError(message);
      setValidationState('error');
    }
  }, []);

  const handleFileDrop = useCallback((file: File) => {
    validateAndParse(file, file.name);
  }, [validateAndParse]);

  const handlePasteValidate = useCallback(() => {
    const trimmed = pasteContent.trim();
    if (!trimmed) {
      setError('Please paste JSON content');
      setValidationState('error');
      return;
    }

    // First validate that it's valid JSON
    try {
      JSON.parse(trimmed);
    } catch {
      setError('Invalid JSON syntax. Please check your pasted content.');
      setValidationState('error');
      return;
    }

    // Create a Blob and process it
    const blob = new Blob([trimmed], { type: 'application/json' });
    validateAndParse(blob, 'pasted-content.json');
  }, [pasteContent, validateAndParse]);

  const handleContinue = useCallback(() => {
    if (parseResult && onValidationComplete) {
      onValidationComplete(parseResult);
    }
    handleClose();
  }, [parseResult, onValidationComplete, handleClose]);

  const isValidating = validationState === 'validating';
  const isValid = validationState === 'valid' && parseResult !== null;

  const footer = (
    <>
      <Button variant="ghost" onClick={handleClose}>
        Cancel
      </Button>
      <Button
        variant="primary"
        onClick={handleContinue}
        disabled={!isValid}
      >
        Continue
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Army List"
      size="lg"
      footer={footer}
    >
      <div className="space-y-4">
        {/* Instructions */}
        <ImportInstructions />

        {/* Mode Toggle */}
        <div className="flex rounded-lg border border-gray-200 bg-gray-100 p-1" role="tablist">
          <TabButton
            isActive={inputMode === 'file'}
            onClick={() => handleModeChange('file')}
          >
            Upload File
          </TabButton>
          <TabButton
            isActive={inputMode === 'paste'}
            onClick={() => handleModeChange('paste')}
          >
            Paste JSON
          </TabButton>
        </div>

        {/* Input Area */}
        {inputMode === 'file' ? (
          <FileDropZone
            accept={supportedExtensions}
            onFileDrop={handleFileDrop}
            isLoading={isValidating}
            error={validationState === 'error' ? error ?? undefined : undefined}
          />
        ) : (
          <div className="space-y-3">
            <textarea
              value={pasteContent}
              onChange={(e) => {
                setPasteContent(e.target.value);
                // Clear error when user starts typing
                if (validationState === 'error') {
                  setValidationState('idle');
                  setError(null);
                }
              }}
              placeholder='Paste your JSON content here...

Example structure:
{
  "roster": {
    "name": "My Army",
    "forces": [...],
    ...
  }
}'
              className="h-48 w-full resize-none rounded-lg border border-gray-300 bg-white p-3 font-mono text-sm placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              disabled={isValidating}
            />
            <div className="flex items-center justify-between">
              {error && validationState === 'error' && (
                <p role="alert" className="text-sm text-error">
                  {error}
                </p>
              )}
              <div className="ml-auto">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handlePasteValidate}
                  isLoading={isValidating}
                  disabled={!pasteContent.trim()}
                >
                  Validate
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Preview (shown when valid) */}
        {isValid && parseResult && (
          <ImportPreview result={parseResult} />
        )}
      </div>
    </Modal>
  );
}

interface TabButtonProps {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TabButton({ isActive, onClick, children }: TabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
        isActive
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      {children}
    </button>
  );
}

ImportWizardModal.displayName = 'ImportWizardModal';
