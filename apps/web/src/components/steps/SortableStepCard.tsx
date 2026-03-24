'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface StepOwner {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface StepTool {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

interface Step {
  id: string;
  sequence: number;
  title: string;
  description?: string;
  owners: StepOwner[];
  tools: StepTool[];
}

interface SortableStepCardProps {
  step: Step;
  onEdit: () => void;
  onDelete: () => void;
}

export function SortableStepCard({ step, onEdit, onDelete }: SortableStepCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        bg-white border border-gray-200 rounded-lg shadow-sm
        ${isDragging ? 'shadow-lg ring-2 ring-blue-500 opacity-90 z-50' : 'hover:shadow-md'}
        transition-shadow
      `}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 p-1 mt-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
          title="Drag to reorder"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
          </svg>
        </button>

        {/* Step Number */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
          {step.sequence}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900">{step.title}</h4>
          {step.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{step.description}</p>
          )}

          {/* Owners */}
          {step.owners.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-gray-400">Owners:</span>
              <div className="flex -space-x-2">
                {step.owners.slice(0, 4).map((owner) => (
                  <div
                    key={owner.id}
                    className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium ring-2 ring-white"
                    title={owner.name}
                  >
                    {owner.avatarUrl ? (
                      <img src={owner.avatarUrl} alt={owner.name} className="w-full h-full rounded-full" />
                    ) : (
                      owner.name.charAt(0).toUpperCase()
                    )}
                  </div>
                ))}
                {step.owners.length > 4 && (
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium ring-2 ring-white">
                    +{step.owners.length - 4}
                  </div>
                )}
              </div>
              <span className="text-xs text-gray-500">{step.owners.map((o) => o.name).join(', ')}</span>
            </div>
          )}

          {/* Tools */}
          {step.tools.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {step.tools.map((tool) => (
                <span
                  key={tool.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: tool.color ? `${tool.color}20` : '#f3f4f6',
                    color: tool.color || '#374151',
                  }}
                >
                  {tool.icon && <span>{tool.icon}</span>}
                  {tool.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex gap-1">
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
            title="Edit step"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
            title="Delete step"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
