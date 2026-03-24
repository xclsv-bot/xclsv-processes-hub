'use client';

import { useState } from 'react';

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
  url?: string;
}

interface Step {
  id: string;
  processId: string;
  sequence: number;
  title: string;
  description?: string;
  isHandoff: boolean;
  owners: StepOwner[];
  tools: StepTool[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface StepFlowProps {
  steps: Step[];
  handoffPoints: string[];
  onStepClick?: (step: Step) => void;
  editable?: boolean;
}

export default function StepFlow({ steps, handoffPoints, onStepClick, editable = false }: StepFlowProps) {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  if (!steps.length) {
    return (
      <div className="text-center py-12 text-gray-500">
        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="font-medium">No steps defined</p>
        <p className="text-sm mt-1">Add steps to build your process workflow</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical connector line */}
      <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gray-200" />

      <div className="space-y-4">
        {steps.map((step, index) => {
          const isHandoff = handoffPoints.includes(step.id);
          const isExpanded = expandedStep === step.id;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="relative">
              {/* Handoff indicator */}
              {isHandoff && (
                <div className="absolute -top-3 left-0 right-0 flex items-center justify-center">
                  <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Handoff
                  </span>
                </div>
              )}

              <div
                className={`
                  relative flex items-start gap-4 p-4 rounded-lg border transition-all
                  ${isExpanded ? 'bg-blue-50 border-blue-200 shadow-md' : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'}
                  ${editable ? 'cursor-pointer' : ''}
                  ${isHandoff ? 'mt-6' : ''}
                `}
                onClick={() => {
                  setExpandedStep(isExpanded ? null : step.id);
                  if (onStepClick) onStepClick(step);
                }}
              >
                {/* Step number circle */}
                <div className={`
                  flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold
                  ${isExpanded ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}
                  z-10
                `}>
                  {step.sequence}
                </div>

                {/* Step content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900">{step.title}</h3>
                    {editable && (
                      <button className="text-gray-400 hover:text-gray-600 p-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {step.description && (
                    <p className={`mt-1 text-sm text-gray-600 ${!isExpanded && 'line-clamp-2'}`}>
                      {step.description}
                    </p>
                  )}

                  {/* Owners */}
                  {step.owners.length > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-gray-500">Owners:</span>
                      <div className="flex -space-x-2">
                        {step.owners.slice(0, 3).map((owner) => (
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
                        {step.owners.length > 3 && (
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium ring-2 ring-white">
                            +{step.owners.length - 3}
                          </div>
                        )}
                      </div>
                      {isExpanded && (
                        <span className="text-xs text-gray-600">
                          {step.owners.map(o => o.name).join(', ')}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Tools */}
                  {step.tools.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {step.tools.map((tool) => (
                        <span
                          key={tool.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: tool.color ? `${tool.color}20` : '#f3f4f6',
                            color: tool.color || '#374151',
                          }}
                          title={tool.url ? `Open ${tool.name}` : tool.name}
                        >
                          {tool.icon && <span>{tool.icon}</span>}
                          {tool.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Arrow connector to next step */}
              {!isLast && (
                <div className="absolute left-6 -bottom-2 transform -translate-x-1/2">
                  <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{steps.length} steps total</span>
          {handoffPoints.length > 0 && (
            <span className="text-amber-600">
              {handoffPoints.length} handoff{handoffPoints.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
