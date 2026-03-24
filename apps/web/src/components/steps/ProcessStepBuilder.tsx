'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableStepCard } from './SortableStepCard';
import { StepEditor } from './StepEditor';

interface StepOwner {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
}

interface StepTool {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
}

interface Step {
  id: string;
  sequence: number;
  title: string;
  description?: string;
  isHandoff: boolean;
  owners: StepOwner[];
  tools: StepTool[];
}

interface ProcessStepBuilderProps {
  processId: string;
  steps: Step[];
  availableOwners: StepOwner[];
  availableTools: StepTool[];
  onStepsChange: (steps: Step[]) => void;
  onCreateStep: (data: { title: string; description?: string; ownerIds: string[]; toolIds: string[] }) => Promise<void>;
  onUpdateStep: (stepId: string, data: { title?: string; description?: string; ownerIds?: string[]; toolIds?: string[] }) => Promise<void>;
  onDeleteStep: (stepId: string) => Promise<void>;
  onReorderSteps: (stepIds: string[]) => Promise<void>;
}

export function ProcessStepBuilder({
  processId,
  steps,
  availableOwners,
  availableTools,
  onStepsChange,
  onCreateStep,
  onUpdateStep,
  onDeleteStep,
  onReorderSteps,
}: ProcessStepBuilderProps) {
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [showAddStep, setShowAddStep] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = steps.findIndex((s) => s.id === active.id);
      const newIndex = steps.findIndex((s) => s.id === over.id);

      // Optimistic update
      const newSteps = arrayMove(steps, oldIndex, newIndex);
      onStepsChange(newSteps);

      // Persist to backend
      setIsReordering(true);
      try {
        await onReorderSteps(newSteps.map((s) => s.id));
      } catch (error) {
        // Revert on error
        onStepsChange(steps);
      } finally {
        setIsReordering(false);
      }
    }
  }, [steps, onStepsChange, onReorderSteps]);

  const handleAddStep = async (data: { title: string; description?: string; ownerIds: string[]; toolIds: string[] }) => {
    await onCreateStep(data);
    setShowAddStep(false);
  };

  const handleUpdateStep = async (stepId: string, data: any) => {
    await onUpdateStep(stepId, data);
    setEditingStepId(null);
  };

  const handleDeleteStep = async (stepId: string) => {
    await onDeleteStep(stepId);
    setDeleteConfirmId(null);
  };

  // Detect handoffs
  const getHandoffStatus = (index: number): boolean => {
    if (index === 0) return false;
    const prevOwners = new Set(steps[index - 1].owners.map((o) => o.id));
    const currOwners = new Set(steps[index].owners.map((o) => o.id));
    if (prevOwners.size === 0 || currOwners.size === 0) return false;
    return !Array.from(prevOwners).some((id) => currOwners.has(id));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Process Steps</h3>
          <p className="text-sm text-gray-500">Drag to reorder • Click to edit</p>
        </div>
        <button
          onClick={() => setShowAddStep(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Step
        </button>
      </div>

      {/* Add Step Form */}
      {showAddStep && (
        <div className="p-4 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50">
          <h4 className="font-medium text-gray-900 mb-4">New Step</h4>
          <StepEditor
            availableOwners={availableOwners}
            availableTools={availableTools}
            onSave={handleAddStep}
            onCancel={() => setShowAddStep(false)}
            isNew
          />
        </div>
      )}

      {/* Steps List with Drag and Drop */}
      {steps.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={steps.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className={`space-y-3 ${isReordering ? 'opacity-70 pointer-events-none' : ''}`}>
              {steps.map((step, index) => (
                <div key={step.id}>
                  {/* Handoff Indicator */}
                  {getHandoffStatus(index) && (
                    <div className="flex items-center gap-2 py-2 px-4 mb-2">
                      <div className="flex-1 h-px bg-amber-300" />
                      <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        Handoff
                      </span>
                      <div className="flex-1 h-px bg-amber-300" />
                    </div>
                  )}

                  {editingStepId === step.id ? (
                    <div className="p-4 border border-blue-200 rounded-lg bg-white shadow-md">
                      <StepEditor
                        step={step}
                        availableOwners={availableOwners}
                        availableTools={availableTools}
                        onSave={(data) => handleUpdateStep(step.id, data)}
                        onCancel={() => setEditingStepId(null)}
                      />
                    </div>
                  ) : deleteConfirmId === step.id ? (
                    <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                      <p className="text-sm text-red-800 mb-3">
                        Delete step "{step.title}"? This cannot be undone.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeleteStep(step.id)}
                          className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-3 py-1.5 bg-white text-gray-700 text-sm border border-gray-300 rounded hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <SortableStepCard
                      step={step}
                      onEdit={() => setEditingStepId(step.id)}
                      onDelete={() => setDeleteConfirmId(step.id)}
                    />
                  )}
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-gray-500 font-medium">No steps yet</p>
          <p className="text-sm text-gray-400 mt-1">Add steps to define your process workflow</p>
        </div>
      )}

      {/* Summary */}
      {steps.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t">
          <span>{steps.length} step{steps.length !== 1 ? 's' : ''}</span>
          <span>
            {steps.filter((_, i) => getHandoffStatus(i)).length} handoff
            {steps.filter((_, i) => getHandoffStatus(i)).length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
