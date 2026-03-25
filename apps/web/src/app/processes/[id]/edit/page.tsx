'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';

const AREAS = [
  { value: 'EVENTS', label: 'Events' },
  { value: 'INFLUENCER', label: 'Influencer' },
  { value: 'PARTNERS', label: 'Partners' },
  { value: 'CRM', label: 'CRM' },
  { value: 'OPERATIONS', label: 'Operations' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'HR', label: 'HR' },
  { value: 'GENERAL', label: 'General' },
];

const SECTION_TYPES = [
  { value: 'prerequisites', label: '📋 Prerequisites' },
  { value: 'checklist', label: '✅ Checklist' },
  { value: 'troubleshooting', label: '🔧 Troubleshooting' },
  { value: 'faq', label: '❓ FAQ' },
];

interface User {
  id: string;
  name: string;
  email: string;
}

export default function EditProcessPage() {
  const params = useParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    area: 'GENERAL',
    type: 'PROCESS',
    ownerId: '',
  });

  // AI state
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiError, setAiError] = useState('');
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [processRes, usersRes] = await Promise.all([
          api.get(`/processes/${params.id}`),
          api.get('/users').catch(() => ({ data: { data: [] } })),
        ]);
        
        const process = processRes.data.data || processRes.data;
        setFormData({
          title: process.title || '',
          description: process.description || '',
          content: process.content || '',
          area: process.area || 'GENERAL',
          type: process.type || 'PROCESS',
          ownerId: process.ownerId || process.owner?.id || '',
        });
        
        setUsers(usersRes.data.data || usersRes.data || []);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load process');
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchData();
    }
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await api.put(`/processes/${params.id}`, formData);
      router.push(`/processes/${params.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update process');
    } finally {
      setIsSubmitting(false);
    }
  };

  // AI Functions
  const handleImproveContent = async () => {
    if (!formData.content.trim()) {
      setAiError('No content to improve');
      return;
    }
    
    setAiLoading('improve');
    setAiError('');
    
    try {
      const res = await api.post('/ai/improve', { content: formData.content });
      const improved = res.data.content;
      setFormData({ ...formData, content: improved });
    } catch (err: any) {
      setAiError(err.response?.data?.message || 'Failed to improve content');
    } finally {
      setAiLoading(null);
    }
  };

  const handleGetSuggestions = async () => {
    if (!formData.content.trim()) {
      setAiError('No content to analyze');
      return;
    }
    
    setAiLoading('suggestions');
    setAiError('');
    
    try {
      const res = await api.post('/ai/suggest-improvements', { content: formData.content });
      setAiSuggestions(res.data.suggestions || []);
      setShowAiPanel(true);
    } catch (err: any) {
      setAiError(err.response?.data?.message || 'Failed to get suggestions');
    } finally {
      setAiLoading(null);
    }
  };

  const handleGenerateSection = async (sectionType: string) => {
    if (!formData.content.trim()) {
      setAiError('Add some content first');
      return;
    }
    
    setAiLoading(sectionType);
    setAiError('');
    
    try {
      const res = await api.post('/ai/generate-section', { 
        content: formData.content,
        sectionType 
      });
      const section = res.data.section;
      // Append the new section to existing content
      setFormData({ 
        ...formData, 
        content: formData.content + '\n\n' + section 
      });
    } catch (err: any) {
      setAiError(err.response?.data?.message || 'Failed to generate section');
    } finally {
      setAiLoading(null);
    }
  };

  const handleGenerateSummary = async () => {
    if (!formData.content.trim()) {
      setAiError('No content to summarize');
      return;
    }
    
    setAiLoading('summary');
    setAiError('');
    
    try {
      const res = await api.post('/ai/summarize', { content: formData.content });
      const summary = res.data.content;
      setFormData({ ...formData, description: summary });
    } catch (err: any) {
      setAiError(err.response?.data?.message || 'Failed to generate summary');
    } finally {
      setAiLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:underline mb-4 inline-block"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Process</h1>
        </div>

        <div className="flex gap-6">
          {/* Main Form */}
          <form onSubmit={handleSubmit} className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title *
              </label>
              <input
                type="text"
                id="title"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <button
                  type="button"
                  onClick={handleGenerateSummary}
                  disabled={aiLoading === 'summary' || !formData.content.trim()}
                  className="text-xs text-purple-600 hover:text-purple-700 disabled:opacity-50"
                >
                  {aiLoading === 'summary' ? '✨ Generating...' : '✨ Auto-generate from content'}
                </button>
              </div>
              <textarea
                id="description"
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief summary of this process"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="area" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Department
                </label>
                <select
                  id="area"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {AREAS.map((area) => (
                    <option key={area.value} value={area.value}>
                      {area.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PROCESS">Process</option>
                  <option value="DOCUMENT">Document</option>
                </select>
              </div>

              <div>
                <label htmlFor="ownerId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Owner
                </label>
                <select
                  id="ownerId"
                  value={formData.ownerId}
                  onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select owner...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Content (Markdown)
              </label>
              <textarea
                id="content"
                rows={20}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="Write the process content here... (supports Markdown)"
              />
            </div>

            <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>

          {/* AI Sidebar */}
          <div className="w-80 space-y-4">
            <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg shadow p-4 text-white">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <span>✨</span> AI Assistant
              </h3>
              
              {aiError && (
                <div className="bg-red-500/20 border border-red-300/30 text-red-100 px-3 py-2 rounded text-sm mb-3">
                  {aiError}
                </div>
              )}

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleImproveContent}
                  disabled={aiLoading === 'improve'}
                  className="w-full px-3 py-2 bg-white/20 hover:bg-white/30 rounded-md text-left text-sm disabled:opacity-50 transition"
                >
                  {aiLoading === 'improve' ? '🔄 Improving...' : '🪄 Improve Content'}
                  <p className="text-xs text-white/70 mt-0.5">Make it clearer & more structured</p>
                </button>

                <button
                  type="button"
                  onClick={handleGetSuggestions}
                  disabled={aiLoading === 'suggestions'}
                  className="w-full px-3 py-2 bg-white/20 hover:bg-white/30 rounded-md text-left text-sm disabled:opacity-50 transition"
                >
                  {aiLoading === 'suggestions' ? '🔄 Analyzing...' : '💡 Get Suggestions'}
                  <p className="text-xs text-white/70 mt-0.5">AI feedback on your content</p>
                </button>
              </div>
            </div>

            {/* Add Section Panel */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">
                ➕ Generate Section
              </h3>
              <div className="space-y-2">
                {SECTION_TYPES.map((section) => (
                  <button
                    key={section.value}
                    type="button"
                    onClick={() => handleGenerateSection(section.value)}
                    disabled={aiLoading === section.value}
                    className="w-full px-3 py-2 text-left text-sm border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition text-gray-700 dark:text-gray-300"
                  >
                    {aiLoading === section.value ? '🔄 Generating...' : section.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Suggestions Panel */}
            {showAiPanel && aiSuggestions.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg shadow p-4 border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 text-sm">
                    💡 AI Suggestions
                  </h3>
                  <button
                    onClick={() => setShowAiPanel(false)}
                    className="text-yellow-600 hover:text-yellow-800 text-sm"
                  >
                    ✕
                  </button>
                </div>
                <ul className="space-y-2 text-sm text-yellow-900 dark:text-yellow-100">
                  {aiSuggestions.map((suggestion, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-yellow-500">•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
