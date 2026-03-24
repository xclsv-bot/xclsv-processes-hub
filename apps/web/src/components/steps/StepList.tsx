'use client';

interface Step {
  id: string;
  sequence: number;
  title: string;
  owners: { id: string; name: string }[];
  tools: { id: string; name: string; icon?: string }[];
  isHandoff: boolean;
}

interface StepListProps {
  steps: Step[];
  activeStepId?: string;
  onStepSelect?: (stepId: string) => void;
}

export default function StepList({ steps, activeStepId, onStepSelect }: StepListProps) {
  return (
    <nav className="space-y-1">
      {steps.map((step, index) => {
        const isActive = step.id === activeStepId;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="relative">
            {/* Handoff badge */}
            {step.isHandoff && (
              <div className="absolute -top-1 left-8 z-10">
                <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                  HANDOFF
                </span>
              </div>
            )}

            <button
              onClick={() => onStepSelect?.(step.id)}
              className={`
                w-full flex items-start gap-3 px-3 py-2 rounded-md text-left transition-colors
                ${isActive 
                  ? 'bg-blue-100 text-blue-900' 
                  : 'hover:bg-gray-100 text-gray-700'
                }
                ${step.isHandoff ? 'mt-3' : ''}
              `}
            >
              {/* Step number */}
              <span className={`
                flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}
              `}>
                {step.sequence}
              </span>

              {/* Step info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{step.title}</p>
                
                {/* Quick owner/tool indicators */}
                <div className="flex items-center gap-2 mt-0.5">
                  {step.owners.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {step.owners[0].name.split(' ')[0]}
                      {step.owners.length > 1 && ` +${step.owners.length - 1}`}
                    </span>
                  )}
                  {step.tools.length > 0 && (
                    <span className="text-xs text-gray-400">
                      {step.tools.slice(0, 2).map(t => t.icon || t.name.charAt(0)).join(' ')}
                    </span>
                  )}
                </div>
              </div>
            </button>

            {/* Connector */}
            {!isLast && (
              <div className="absolute left-[22px] top-10 bottom-0 w-0.5 bg-gray-200" style={{ height: '12px' }} />
            )}
          </div>
        );
      })}
    </nav>
  );
}
