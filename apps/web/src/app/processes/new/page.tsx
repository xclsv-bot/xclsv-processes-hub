'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { FileUpload } from '@/components/upload';

interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}

export default function NewProcessPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    category: '',
    tags: '',
  });

  const handleFileUpload = (file: UploadedFile) => {
    setUploadedFiles((prev) => [...prev, file]);
  };

  const handleFileRemove = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Build content with file references if any
      let content = formData.content || '<p></p>';
      
      // Append uploaded files as attachments section
      if (uploadedFiles.length > 0) {
        const attachmentsList = uploadedFiles
          .map((f) => `<li><a href="${f.url}" target="_blank">${f.originalName}</a></li>`)
          .join('\n');
        content += `\n\n<h3>Attachments</h3>\n<ul>\n${attachmentsList}\n</ul>`;
      }

      const payload = {
        title: formData.title,
        description: formData.description,
        content,
        category: formData.category || 'General',
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
        mediaIds: uploadedFiles.map((f) => f.id),
      };

      await api.post('/processes', payload);
      router.push('/processes');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create process');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-8">
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
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a category</option>
              <option value="Operations">Operations</option>
              <option value="Marketing">Marketing</option>
              <option value="Sales">Sales</option>
              <option value="Finance">Finance</option>
              <option value="HR">HR</option>
              <option value="Engineering">Engineering</option>
              <option value="General">General</option>
            </select>
          </div>

          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., onboarding, client, setup"
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <textarea
              id="content"
              rows={10}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="Write the process steps here... (supports HTML)"
            />
          </div>

          {/* File Upload Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attachments
            </label>
            <FileUpload
              onUpload={handleFileUpload}
              onRemove={handleFileRemove}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.markdown"
              maxSize={10}
              multiple
            />
            <p className="mt-1 text-xs text-gray-500">
              Upload documents, images, or spreadsheets related to this process
            </p>
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
              onClick={() => router.back()}
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
