'use client';

import { useState, useEffect } from 'react';

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

interface StepModalProps {
  step: Step;
  availableOwners: StepOwner[];
  availableTools: StepTool[];
  onClose: () => void;
  onSave: (stepId: string, data: { title: string; description?: string; ownerIds: string[]; toolIds: string[]; isHandoff: boolean }) => Promise<void>;
  onDelete?: (stepId: string) => Promise<void>;
}

export default function StepModal({
  step,
  availableOwners,
  availableTools,
  onClose,
  onSave,
  onDelete,
}: StepModalProps) {
  const [title, setTitle] = useState(step.title);
  const [description, setDescription] = useState(step.description || '');
  const [selectedOwners, setSelectedOwners] = useState<string[]>(step.owners.map(o => o.id));
  const [selectedTools, setSelectedTools] = useState<string[]>(step.tools.map(t => t.id));
  const [isHandoff, setIsHandoff] = useState(step.isHandoff);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await onSave(step.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        ownerIds: selectedOwners,
        toolIds: selectedTools,
        isHandoff,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save step');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm('Are you sure you want to delete this step?')) return;

    setDeleting(true);
    try {
      await onDelete(step.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete step');
    } finally {
      setDeleting(false);
    }
  };

  const toggleOwner = (ownerId: string) => {
    setSelectedOwners(prev =>
      prev.includes(ownerId)
        ? prev.filter(id => id !== ownerId)
        : [...prev, ownerId]
    );
  };

  const toggleTool = (toolId: string) => {
    setSelectedTools(prev =>
      prev.includes(toolId)
        ? prev.filter(id => id !== toolId)
        : [...prev, toolId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <span className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold">
                {step.sequence}
              </span>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {isEditing ? 'Edit Step' : 'Step Details'}
                </h2>
                <p className="text-sm text-gray-500">Step {step.sequence} of process</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}

            {isEditing ? (
              /* Edit Mode */
              <div className="space-y-5">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Step Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detailed instructions for this step..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Handoff Toggle */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isHandoff"
                    checked={isHandoff}
                    onChange={(e) => setIsHandoff(e.target.checked)}
                    className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                  />
                  <label htmlFor="isHandoff" className="text-sm text-gray-700">
                    <span className="font-medium">Mark as handoff point</span>
                    <span className="text-gray-500 ml-1">(transitions between teams/roles)</span>
                  </label>
                </div>

                {/* Owners */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Step Owners
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableOwners.map((owner) => (
                      <button
                        key={owner.id}
                        type="button"
                        onClick={() => toggleOwner(owner.id)}
                        className={`
                          inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors
                          ${selectedOwners.includes(owner.id)
                            ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-500'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }
                        `}
                      >
                        <span className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs">
                          {owner.name.charAt(0)}
                        </span>
                        {owner.name}
                        {selectedOwners.includes(owner.id) && (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                    {availableOwners.length === 0 && (
                      <p className="text-sm text-gray-500">No team members available</p>
                    )}
                  </div>
                </div>

                {/* Tools */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tools Used
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableTools.map((tool) => (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => toggleTool(tool.id)}
                        className={`
                          inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors
                          ${selectedTools.includes(tool.id)
                            ? 'ring-2 ring-offset-1'
                            : 'hover:opacity-80'
                          }
                        `}
                        style={{
                          backgroundColor: tool.color ? `${tool.color}20` : '#f3f4f6',
                          color: tool.color || '#374151',
                        }}
                      >
                        {tool.icon && <span>{tool.icon}</span>}
                        {tool.name}
                        {selectedTools.includes(tool.id) && (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                    {availableTools.length === 0 && (
                      <p className="text-sm text-gray-500">No tools configured</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* View Mode */
              <div className="space-y-5">
                {/* Title */}
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{step.title}</h3>
                  {step.isHandoff && (
                    <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      Handoff Point
                    </span>
                  )}
                </div>

                {/* Description */}
                {step.description ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Description</label>
                    <p className="text-gray-700 whitespace-pre-wrap">{step.description}</p>
                  </div>
                ) : (
                  <div className="text-gray-400 italic">No description provided</div>
                )}

                {/* Owners */}
                {step.owners.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">Owners</label>
                    <div className="flex flex-wrap gap-2">
                      {step.owners.map((owner) => (
                        <div
                          key={owner.id}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-sm"
                        >
                          <span className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                            {owner.avatarUrl ? (
                              <img src={owner.avatarUrl} alt={owner.name} className="w-full h-full rounded-full" />
                            ) : (
                              owner.name.charAt(0).toUpperCase()
                            )}
                          </span>
                          {owner.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tools */}
                {step.tools.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">Tools</label>
                    <div className="flex flex-wrap gap-2">
                      {step.tools.map((tool) => (
                        <a
                          key={tool.id}
                          href={tool.url || '#'}
                          target={tool.url ? '_blank' : undefined}
                          rel="noopener noreferrer"
                          className={`
                            inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm
                            ${tool.url ? 'hover:opacity-80 cursor-pointer' : ''}
                          `}
                          style={{
                            backgroundColor: tool.color ? `${tool.color}20` : '#f3f4f6',
                            color: tool.color || '#374151',
                          }}
                        >
                          {tool.icon && <span>{tool.icon}</span>}
                          {tool.name}
                          {tool.url && (
                            <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="pt-4 border-t border-gray-200 text-xs text-gray-400">
                  <p>Created: {new Date(step.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(step.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
            {isEditing ? (
              <>
                <div>
                  {onDelete && (
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                    >
                      {deleting ? 'Deleting...' : 'Delete Step'}
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div />
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Edit Step
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
