'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { TranscriptUpload } from '@/components/upload';

const AREAS = [
  { value: 'AFFILIATE', label: 'Affiliate' },
  { value: 'EVENTS', label: 'Events' },
  { value: 'INFLUENCER', label: 'Influencer' },
  { value: 'PARTNERS', label: 'Partners' },
  { value: 'CRM', label: 'CRM' },
  { value: 'OPERATIONS', label: 'Operations' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'HR', label: 'HR' },
  { value: 'GENERAL', label: 'General' },
];

type CreateMode = 'manual' | 'transcript';

export default function NewProcessPage() {
  const router = useRouter();
  const [mode, setMode] = useState<CreateMode | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    area: 'GENERAL',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const res = await api.post('/processes', {
        title: formData.title,
        description: formData.description,
        content: formData.content,
        area: formData.area,
      });
      router.push(`/processes/${res.data.id}/edit`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create process');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTranscriptSuccess = (processId: string) => {
    router.push(`/processes/${processId}/edit`);
  };

  // Mode selection screen
  if (!mode) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="text-blue-600 hover:underline mb-4 inline-block"
            >
              ← Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Create New Process</h1>
            <p className="mt-2 text-gray-600">Choose how you want to create your process</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Manual Creation */}
            <button
              onClick={() => setMode('manual')}
              className="bg-white rounded-lg shadow p-6 text-left hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-500"
            >
              <div className="text-4xl mb-4">✍️</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Write Manually
              </h3>
              <p className="text-sm text-gray-500">
                Create a process from scratch by typing the steps and details yourself.
              </p>
              <div className="mt-4 text-blue-600 font-medium text-sm">
                Best for: New processes, quick documentation
              </div>
            </button>

            {/* Document Upload */}
            <button
              onClick={() => setMode('transcript')}
              className="bg-white rounded-lg shadow p-6 text-left hover:shadow-lg transition-shadow border-2 border-transparent hover:border-purple-500"
            >
              <div className="text-4xl mb-4">📄</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Upload Document
              </h3>
              <p className="text-sm text-gray-500">
                Upload a transcript, PDF, or Word doc and let AI generate a structured process.
              </p>
              <div className="mt-4 text-purple-600 font-medium text-sm">
                Best for: Existing SOPs, meeting transcripts, PDF docs
              </div>
            </button>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">💡 Supported file formats</h4>
            <div className="text-sm text-blue-700">
              <span className="font-mono bg-blue-100 px-1 rounded">.txt</span>{' '}
              <span className="font-mono bg-blue-100 px-1 rounded">.vtt</span>{' '}
              <span className="font-mono bg-blue-100 px-1 rounded">.srt</span>{' '}
              <span className="font-mono bg-blue-100 px-1 rounded">.doc</span>{' '}
              <span className="font-mono bg-blue-100 px-1 rounded">.docx</span>{' '}
              <span className="font-mono bg-blue-100 px-1 rounded">.pdf</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Transcript upload mode
  if (mode === 'transcript') {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="mb-6">
            <button
              onClick={() => setMode(null)}
              className="text-blue-600 hover:underline mb-4 inline-block"
            >
              ← Back to options
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Create from Transcript</h1>
          </div>

          <TranscriptUpload
            onSuccess={handleTranscriptSuccess}
            onCancel={() => setMode(null)}
          />
        </div>
      </div>
    );
  }

  // Manual creation mode
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-8">
          <button
            onClick={() => setMode(null)}
            className="text-blue-600 hover:underline mb-4 inline-block"
          >
            ← Back to options
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create New Process</h1>
          <p className="mt-2 text-gray-600">Document a new process for your team</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              id="title"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., How to onboard a new client"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Brief summary of this process"
            />
          </div>

          <div>
            <label htmlFor="area" className="block text-sm font-medium text-gray-700 mb-1">
              Department
            </label>
            <select
              id="area"
              value={formData.area}
              onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {AREAS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
              Content (Markdown)
            </label>
            <textarea
              id="content"
              rows={15}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder={`## Process Name

### Owner
[Name]

### Procedure
1. First step
2. Second step
3. Third step

### Notes
- Important note here`}
            />
          </div>

          <div className="flex gap-4 pt-4 border-t">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Process'}
            </button>
            <button
              type="button"
              onClick={() => setMode(null)}
              className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
