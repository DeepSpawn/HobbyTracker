import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableStepItem, type LocalRecipeStep } from './SortableStepItem';

interface RecipeStepListProps {
  steps: LocalRecipeStep[];
  onReorder: (steps: LocalRecipeStep[]) => void;
  onRemove: (localId: string) => void;
}

/**
 * Drag-and-drop list container for recipe steps
 */
export function RecipeStepList({
  steps,
  onReorder,
  onRemove,
}: RecipeStepListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = steps.findIndex((s) => s.localId === active.id);
      const newIndex = steps.findIndex((s) => s.localId === over.id);
      onReorder(arrayMove(steps, oldIndex, newIndex));
    }
  };

  if (steps.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-200 px-6 py-8 text-center">
        <svg
          className="mx-auto h-10 w-10 text-gray-300"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
          />
        </svg>
        <p className="mt-2 text-sm text-gray-500">
          No paints added yet. Search and select paints to add to your recipe.
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={steps.map((s) => s.localId)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div key={step.localId} className="flex items-center gap-2">
              <span className="w-6 text-center text-sm font-medium text-gray-400">
                {index + 1}
              </span>
              <div className="flex-1">
                <SortableStepItem step={step} onRemove={onRemove} />
              </div>
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
