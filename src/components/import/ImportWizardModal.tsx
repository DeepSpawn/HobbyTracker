import { useState, useCallback } from 'react';
import { Modal, Button, FileDropZone } from '../ui';
import { ImportPreview } from './ImportPreview';
import { ImportInstructions } from './ImportInstructions';
import { UnitReviewStep } from './UnitReviewStep';
import { ProjectFormStep } from './ProjectFormStep';
import {
  parseArmyListFile,
  getSupportedExtensions,
} from '../../services/armyListParser/battleScribeParser';
import { importProject } from '../../services/import';
import { useAuth } from '../../hooks/useAuth';
import type { NewRecruitParseResult } from '../../types/newRecruit';
import type { CreateProjectFormData } from '../../lib/validation/projectSchemas';

export interface ImportWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated?: (projectId: string) => void;
}

type WizardStep = 1 | 2 | 3;
type InputMode = 'file' | 'paste';
type ValidationState = 'idle' | 'validating' | 'valid' | 'error';

const STEP_TITLES: Record<WizardStep, string> = {
  1: 'Import Army List',
  2: 'Review Units',
  3: 'Create Project',
};

export function ImportWizardModal({
  isOpen,
  onClose,
  onProjectCreated,
}: ImportWizardModalProps) {
  const { user } = useAuth();

  // Step management
  const [step, setStep] = useState<WizardStep>(1);

  // Step 1 state
  const [inputMode, setInputMode] = useState<InputMode>('file');
  const [validationState, setValidationState] = useState<ValidationState>('idle');
  const [parseResult, setParseResult] = useState<NewRecruitParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pasteContent, setPasteContent] = useState('');

  // Step 2 state
  const [ownedUnitIndices, setOwnedUnitIndices] = useState<Set<number>>(new Set());

  // Step 3 state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const supportedExtensions = getSupportedExtensions();

  // Reset functions
  const resetStep1State = useCallback(() => {
    setValidationState('idle');
    setParseResult(null);
    setError(null);
    setPasteContent('');
  }, []);

  const resetAllState = useCallback(() => {
    setStep(1);
    setInputMode('file');
    resetStep1State();
    setOwnedUnitIndices(new Set());
    setIsSubmitting(false);
    setSubmitError(null);
  }, [resetStep1State]);

  const handleClose = useCallback(() => {
    resetAllState();
    onClose();
  }, [resetAllState, onClose]);

  const handleModeChange = useCallback((mode: InputMode) => {
    setInputMode(mode);
    resetStep1State();
  }, [resetStep1State]);

  // Step 1: Validation
  const validateAndParse = useCallback(async (file: File | Blob, fileName: string) => {
    setValidationState('validating');
    setError(null);

    try {
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

    try {
      JSON.parse(trimmed);
    } catch {
      setError('Invalid JSON syntax. Please check your pasted content.');
      setValidationState('error');
      return;
    }

    const blob = new Blob([trimmed], { type: 'application/json' });
    validateAndParse(blob, 'pasted-content.json');
  }, [pasteContent, validateAndParse]);

  // Step 2: Unit ownership
  const handleToggleOwned = useCallback((index: number) => {
    setOwnedUnitIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (parseResult) {
      setOwnedUnitIndices(new Set(parseResult.units.map((_, i) => i)));
    }
  }, [parseResult]);

  const handleDeselectAll = useCallback(() => {
    setOwnedUnitIndices(new Set());
  }, []);

  // Step 3: Project creation
  const handleCreateProject = useCallback(async (data: CreateProjectFormData) => {
    if (!user || !parseResult) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const projectId = await importProject(user.uid, {
        project: {
          name: data.name,
          faction: data.faction,
          gameSystem: data.gameSystem,
          targetPoints: data.targetPoints,
        },
        units: parseResult.units.map((unit, index) => ({
          unit,
          isOwned: ownedUnitIndices.has(index),
        })),
      });

      handleClose();
      onProjectCreated?.(projectId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create project';
      setSubmitError(message);
      setIsSubmitting(false);
    }
  }, [user, parseResult, ownedUnitIndices, handleClose, onProjectCreated]);

  // Navigation
  const handleContinue = useCallback(() => {
    if (step === 1 && validationState === 'valid') {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  }, [step, validationState]);

  const handleBack = useCallback(() => {
    if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    }
  }, [step]);

  // Computed values
  const isValidating = validationState === 'validating';
  const isValid = validationState === 'valid' && parseResult !== null;
  const ownedCount = ownedUnitIndices.size;
  const toBuyCount = parseResult ? parseResult.units.length - ownedCount : 0;

  // Footer based on step
  const footer = (() => {
    switch (step) {
      case 1:
        return (
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
      case 2:
        return (
          <>
            <Button variant="ghost" onClick={handleBack}>
              Back
            </Button>
            <Button variant="primary" onClick={handleContinue}>
              Continue
            </Button>
          </>
        );
      case 3:
        return (
          <>
            <Button variant="ghost" onClick={handleBack} disabled={isSubmitting}>
              Back
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="project-form"
              isLoading={isSubmitting}
            >
              Create Project
            </Button>
          </>
        );
    }
  })();

  // Content based on step
  const content = (() => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <ImportInstructions />

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

            {isValid && parseResult && (
              <ImportPreview result={parseResult} />
            )}
          </div>
        );

      case 2:
        return parseResult ? (
          <UnitReviewStep
            parseResult={parseResult}
            ownedUnitIndices={ownedUnitIndices}
            onToggleOwned={handleToggleOwned}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
          />
        ) : null;

      case 3:
        return parseResult ? (
          <ProjectFormStep
            parseResult={parseResult}
            ownedCount={ownedCount}
            toBuyCount={toBuyCount}
            onSubmit={handleCreateProject}
            isSubmitting={isSubmitting}
            error={submitError}
          />
        ) : null;
    }
  })();

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={STEP_TITLES[step]}
      size="lg"
      footer={footer}
    >
      {/* Step indicator */}
      <div className="mb-4 flex items-center justify-center gap-2">
        {([1, 2, 3] as const).map((s) => (
          <div
            key={s}
            className={`h-2 w-8 rounded-full transition-colors ${
              s === step
                ? 'bg-primary-500'
                : s < step
                  ? 'bg-primary-300'
                  : 'bg-gray-200'
            }`}
            aria-label={`Step ${s}${s === step ? ' (current)' : ''}`}
          />
        ))}
      </div>

      {content}
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
