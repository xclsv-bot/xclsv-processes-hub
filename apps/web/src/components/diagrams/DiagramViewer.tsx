'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';

interface DiagramViewerProps {
  mermaidSyntax: string;
  diagramType: 'numbered-flow' | 'flowchart';
  processId: string;
  processTitle?: string;
  onNodeClick?: (nodeId: string) => void;
  onExport?: (format: 'png' | 'svg') => void;
  onRegenerate?: () => void;
  hasManualEdits?: boolean;
}

export function DiagramViewer({
  mermaidSyntax,
  diagramType,
  processId,
  processTitle,
  onNodeClick,
  onExport,
  onRegenerate,
  hasManualEdits = false,
}: DiagramViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  // Initialize Mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
      },
    });
  }, []);

  // Render diagram
  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current || !mermaidSyntax) return;

      setIsLoading(true);
      setError(null);

      try {
        // Clear previous content
        containerRef.current.innerHTML = '';

        // Generate unique ID
        const id = `mermaid-${processId}-${Date.now()}`;

        // Render Mermaid
        const { svg } = await mermaid.render(id, mermaidSyntax);
        containerRef.current.innerHTML = svg;

        // Make nodes clickable
        if (onNodeClick) {
          const nodes = containerRef.current.querySelectorAll('.node');
          nodes.forEach((node) => {
            node.classList.add('cursor-pointer', 'hover:opacity-80', 'transition-opacity');
            node.addEventListener('click', () => {
              const nodeId = node.id || node.getAttribute('data-id');
              if (nodeId) onNodeClick(nodeId);
            });
          });
        }
      } catch (err: any) {
        setError(err.message || 'Failed to render diagram');
        console.error('Mermaid render error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    renderDiagram();
  }, [mermaidSyntax, processId, onNodeClick]);

  // Zoom controls
  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.25));
  const handleZoomReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };
  const handleFitToScreen = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = () => setIsDragging(false);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Regenerate with confirmation
  const handleRegenerate = () => {
    if (hasManualEdits) {
      setShowRegenerateConfirm(true);
    } else {
      onRegenerate?.();
    }
  };

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'relative'}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-white border rounded-md">
            <button
              onClick={handleZoomOut}
              className="p-1.5 hover:bg-gray-100 rounded-l-md"
              title="Zoom out"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <span className="px-2 text-sm text-gray-600 min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 hover:bg-gray-100 rounded-r-md"
              title="Zoom in"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          <button
            onClick={handleZoomReset}
            className="p-1.5 hover:bg-gray-100 border rounded-md"
            title="Reset zoom"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <button
            onClick={handleFitToScreen}
            className="p-1.5 hover:bg-gray-100 border rounded-md"
            title="Fit to screen"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Diagram Type Label */}
          <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
            {diagramType === 'numbered-flow' ? 'Numbered Flow' : 'Flowchart'}
          </span>

          {/* Regenerate Button */}
          {onRegenerate && (
            <button
              onClick={handleRegenerate}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 border rounded-md"
              title="Regenerate diagram"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Regenerate
            </button>
          )}

          {/* Export Buttons */}
          {onExport && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onExport('png')}
                className="px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 border rounded-l-md"
                title="Export as PNG"
              >
                PNG
              </button>
              <button
                onClick={() => onExport('svg')}
                className="px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 border-t border-b border-r rounded-r-md"
                title="Export as SVG"
              >
                SVG
              </button>
            </div>
          )}

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 hover:bg-gray-100 border rounded-md"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Diagram Container */}
      <div
        className={`overflow-hidden bg-gray-50 ${isFullscreen ? 'h-[calc(100vh-50px)]' : 'h-[500px]'} ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-red-600 font-medium">Failed to render diagram</p>
              <p className="text-sm text-gray-500 mt-1">{error}</p>
            </div>
          </div>
        )}

        <div
          ref={containerRef}
          className="inline-block origin-top-left transition-transform"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        />
      </div>

      {/* Metadata Footer */}
      <div className="flex items-center justify-between px-3 py-2 text-xs text-gray-500 border-t bg-gray-50">
        <span>{processTitle || 'Untitled Process'}</span>
        <span>Generated at {new Date().toLocaleString()}</span>
      </div>

      {/* Regenerate Confirmation Modal */}
      {showRegenerateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Regenerate Diagram?</h3>
            <p className="text-gray-600 mb-4">
              This diagram has manual edits. Regenerating will overwrite your changes.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRegenerateConfirm(false)}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowRegenerateConfirm(false);
                  onRegenerate?.();
                }}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Regenerate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
