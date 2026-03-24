'use client';

import { useState, useEffect } from 'react';

interface StepOwner {
  id: string;
  name: string;
  email?: string;
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

interface StepEditorProps {
  step?: Step | null;
  availableOwners: StepOwner[];
  availableTools: StepTool[];
  onSave: (data: { title: string; description?: string; ownerIds: string[]; toolIds: string[] }) => Promise<void>;
  onCancel: () => void;
  isNew?: boolean;
}

export default function StepEditor({
  step,
  availableOwners,
  availableTools,
  onSave,
  onCancel,
  isNew = false,
}: StepEditorProps) {
  const [title, setTitle] = useState(step?.title || '');
  const [description, setDescription] = useState(step?.description || '');
  const [selectedOwners, setSelectedOwners] = useState<string[]>(step?.owners.map(o => o.id) || []);
  const [selectedTools, setSelectedTools] = useState<string[]>(step?.tools.map(t => t.id) || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        ownerIds: selectedOwners,
        toolIds: selectedTools,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save step');
    } finally {
      setSaving(false);
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
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Step Title *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Review client requirements"
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
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
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
                ['--tw-ring-color' as any]: tool.color || '#3b82f6',
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
            <p className="text-sm text-gray-500">No tools configured. Seed tools first.</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : isNew ? 'Add Step' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
