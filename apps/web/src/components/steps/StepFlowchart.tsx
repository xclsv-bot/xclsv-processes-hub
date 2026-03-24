'use client';

import { useRef, useEffect, useState } from 'react';

interface StepOwner {
  id: string;
  name: string;
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
  isHandoff: boolean;
  owners: StepOwner[];
  tools: StepTool[];
}

interface StepFlowchartProps {
  steps: Step[];
  handoffPoints: string[];
  title?: string;
}

export default function StepFlowchart({ steps, handoffPoints, title }: StepFlowchartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (containerRef.current) {
      const { width } = containerRef.current.getBoundingClientRect();
      const height = Math.max(400, steps.length * 120 + 100);
      setDimensions({ width, height });
    }
  }, [steps.length]);

  if (!steps.length) {
    return (
      <div className="text-center py-12 text-gray-500">
        No steps to visualize
      </div>
    );
  }

  const nodeWidth = 280;
  const nodeHeight = 80;
  const verticalSpacing = 100;
  const startY = 60;
  const centerX = dimensions.width / 2;

  // Group steps by owner for swim lanes (optional future enhancement)
  const getNodeColor = (step: Step) => {
    if (step.isHandoff) return '#fef3c7'; // amber-100
    return '#eff6ff'; // blue-50
  };

  const getBorderColor = (step: Step) => {
    if (step.isHandoff) return '#f59e0b'; // amber-500
    return '#3b82f6'; // blue-500
  };

  return (
    <div ref={containerRef} className="w-full overflow-x-auto bg-gray-50 rounded-lg border border-gray-200">
      <svg
        width={dimensions.width}
        height={dimensions.height}
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        className="min-w-full"
      >
        {/* Title */}
        {title && (
          <text
            x={centerX}
            y={25}
            textAnchor="middle"
            className="text-lg font-semibold fill-gray-700"
          >
            {title}
          </text>
        )}

        {/* Connections */}
        {steps.slice(0, -1).map((step, index) => {
          const nextStep = steps[index + 1];
          const isHandoff = handoffPoints.includes(nextStep.id);
          const y1 = startY + index * (nodeHeight + verticalSpacing) + nodeHeight;
          const y2 = startY + (index + 1) * (nodeHeight + verticalSpacing);

          return (
            <g key={`connector-${step.id}`}>
              {/* Arrow line */}
              <line
                x1={centerX}
                y1={y1}
                x2={centerX}
                y2={y2 - 10}
                stroke={isHandoff ? '#f59e0b' : '#94a3b8'}
                strokeWidth={isHandoff ? 3 : 2}
                strokeDasharray={isHandoff ? '5,5' : 'none'}
              />
              {/* Arrow head */}
              <polygon
                points={`${centerX},${y2} ${centerX - 6},${y2 - 10} ${centerX + 6},${y2 - 10}`}
                fill={isHandoff ? '#f59e0b' : '#94a3b8'}
              />
              {/* Handoff label */}
              {isHandoff && (
                <g>
                  <rect
                    x={centerX + 15}
                    y={(y1 + y2) / 2 - 10}
                    width={60}
                    height={20}
                    rx={4}
                    fill="#fef3c7"
                    stroke="#f59e0b"
                  />
                  <text
                    x={centerX + 45}
                    y={(y1 + y2) / 2 + 4}
                    textAnchor="middle"
                    className="text-xs fill-amber-800 font-medium"
                  >
                    Handoff
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {steps.map((step, index) => {
          const y = startY + index * (nodeHeight + verticalSpacing);
          const x = centerX - nodeWidth / 2;

          return (
            <g key={step.id}>
              {/* Node rectangle */}
              <rect
                x={x}
                y={y}
                width={nodeWidth}
                height={nodeHeight}
                rx={8}
                fill={getNodeColor(step)}
                stroke={getBorderColor(step)}
                strokeWidth={2}
                className="cursor-pointer hover:opacity-90 transition-opacity"
              />

              {/* Step number badge */}
              <circle
                cx={x + 24}
                cy={y + nodeHeight / 2}
                r={16}
                fill={getBorderColor(step)}
              />
              <text
                x={x + 24}
                y={y + nodeHeight / 2 + 5}
                textAnchor="middle"
                className="text-sm font-bold fill-white"
              >
                {step.sequence}
              </text>

              {/* Title */}
              <text
                x={x + 50}
                y={y + 28}
                className="text-sm font-semibold fill-gray-800"
              >
                {step.title.length > 30 ? step.title.slice(0, 30) + '...' : step.title}
              </text>

              {/* Owners */}
              {step.owners.length > 0 && (
                <text
                  x={x + 50}
                  y={y + 48}
                  className="text-xs fill-gray-600"
                >
                  👤 {step.owners.map(o => o.name.split(' ')[0]).join(', ')}
                </text>
              )}

              {/* Tools */}
              {step.tools.length > 0 && (
                <text
                  x={x + 50}
                  y={y + 66}
                  className="text-xs fill-gray-500"
                >
                  🔧 {step.tools.slice(0, 3).map(t => t.icon || t.name).join(' ')}
                </text>
              )}
            </g>
          );
        })}

        {/* Start indicator */}
        <g>
          <circle cx={centerX} cy={startY - 30} r={12} fill="#10b981" />
          <text x={centerX} y={startY - 26} textAnchor="middle" className="text-xs font-bold fill-white">▶</text>
        </g>

        {/* End indicator */}
        <g>
          <circle
            cx={centerX}
            cy={startY + (steps.length - 1) * (nodeHeight + verticalSpacing) + nodeHeight + 30}
            r={12}
            fill="#6b7280"
          />
          <text
            x={centerX}
            y={startY + (steps.length - 1) * (nodeHeight + verticalSpacing) + nodeHeight + 34}
            textAnchor="middle"
            className="text-xs font-bold fill-white"
          >
            ■
          </text>
        </g>
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 py-3 border-t border-gray-200 bg-white">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <div className="w-4 h-4 rounded bg-blue-50 border-2 border-blue-500" />
          <span>Standard Step</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <div className="w-4 h-4 rounded bg-amber-100 border-2 border-amber-500" />
          <span>Handoff Point</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <div className="w-4 h-0.5 bg-amber-500" style={{ strokeDasharray: '5,5' }} />
          <span className="border-b-2 border-dashed border-amber-500 w-4" />
          <span>Ownership Change</span>
        </div>
      </div>
    </div>
  );
}
