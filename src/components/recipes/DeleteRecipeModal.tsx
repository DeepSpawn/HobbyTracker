import { Modal, Button } from '../ui';

interface DeleteRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  recipeName: string;
  isDeleting: boolean;
}

/**
 * Confirmation modal for deleting a recipe
 */
export function DeleteRecipeModal({
  isOpen,
  onClose,
  onConfirm,
  recipeName,
  isDeleting,
}: DeleteRecipeModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Recipe"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            isLoading={isDeleting}
            className="bg-error hover:bg-error/90"
          >
            Delete
          </Button>
        </>
      }
    >
      <p className="text-gray-600">
        Are you sure you want to delete <strong>"{recipeName}"</strong>? This action
        cannot be undone and all steps in this recipe will be permanently removed.
      </p>
    </Modal>
  );
}
