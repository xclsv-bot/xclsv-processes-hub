'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { StepFlow, StepEditor, StepModal } from '@/components/steps';
import { RelatedDocuments } from '@/components/relations';
import { VersionHistory } from '@/components/versions';

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

interface Process {
  id: string;
  title: string;
  description: string;
  content: string;
  exampleContent?: string;
  sopContent?: string;
  type: 'PROCESS' | 'DOCUMENT';
  area: string;
  status: string;
  currentVersion?: number;
  metadata?: { tags?: string[] };
  owner?: { id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

interface StepsData {
  steps: Step[];
  totalSteps: number;
  handoffPoints: string[];
}

export default function ProcessDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [process, setProcess] = useState<Process | null>(null);
  const [stepsData, setStepsData] = useState<StepsData | null>(null);
  const [tools, setTools] = useState<StepTool[]>([]);
  const [users, setUsers] = useState<StepOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'steps' | 'flowchart' | 'markdown' | 'example' | 'sop' | 'history'>('steps');
  const [showAddStep, setShowAddStep] = useState(false);
  const [selectedStep, setSelectedStep] = useState<Step | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [generatingSop, setGeneratingSop] = useState(false);

  const handleDelete = async () => {
    if (!process) return;
    if (!confirm(`Are you sure you want to delete "${process.title}"? This action cannot be undone.`)) return;
    
    setDeleting(true);
    try {
      await api.delete(`/processes/${params.id}`);
      router.push('/processes');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete process');
      setDeleting(false);
    }
  };

  const handlePublish = async () => {
    if (!process) return;
    setPublishing(true);
    try {
      const res = await api.post(`/processes/${params.id}/publish`);
      setProcess(res.data.data || res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  const handleGenerateSop = async () => {
    if (!process) return;
    setGeneratingSop(true);
    try {
      const res = await api.post('/ai/generate-sop', { processId: process.id });
      setProcess({ ...process, sopContent: res.data.sopContent });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to generate SOP');
    } finally {
      setGeneratingSop(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [processRes, stepsRes, toolsRes, usersRes] = await Promise.all([
          api.get(`/processes/${params.id}`),
          api.get(`/processes/${params.id}/steps`).catch(() => ({ data: { data: { steps: [], totalSteps: 0, handoffPoints: [] } } })),
          api.get('/tools').catch(() => ({ data: { data: [] } })),
          api.get('/users').catch(() => ({ data: { data: [] } })),
        ]);

        const processData = processRes.data.data;
        setProcess(processData);
        setStepsData(stepsRes.data.data);
        setTools(toolsRes.data.data);
        setUsers(usersRes.data.data || []);
        
        // For documents, default to markdown view instead of steps
        if (processData.type === 'DOCUMENT') {
          setViewMode('markdown');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load process');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchData();
    }
  }, [params.id]);

  const handleAddStep = async (data: { title: string; description?: string; ownerIds: string[]; toolIds: string[] }) => {
    await api.post(`/processes/${params.id}/steps`, data);
    // Refresh steps
    const stepsRes = await api.get(`/processes/${params.id}/steps`);
    setStepsData(stepsRes.data.data);
    setShowAddStep(false);
  };

  const handleUpdateStep = async (stepId: string, data: { title: string; description?: string; ownerIds: string[]; toolIds: string[]; isHandoff: boolean }) => {
    await api.put(`/processes/${params.id}/steps/${stepId}`, data);
    // Refresh steps
    const stepsRes = await api.get(`/processes/${params.id}/steps`);
    setStepsData(stepsRes.data.data);
  };

  const handleDeleteStep = async (stepId: string) => {
    await api.delete(`/processes/${params.id}/steps/${stepId}`);
    // Refresh steps
    const stepsRes = await api.get(`/processes/${params.id}/steps`);
    setStepsData(stepsRes.data.data);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error || !process) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error || 'Process not found'}
          </div>
          <button
            onClick={() => router.back()}
            className="mt-4 text-blue-600 hover:underline"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  const tags = process.metadata?.tags || [];
  const hasSteps = stepsData && stepsData.steps.length > 0;
  const hasContent = process.content && process.content.trim().length > 0;
  const hasExample = process.exampleContent && process.exampleContent.trim().length > 0;

  // Download content as .docx (simple HTML wrapper for Word)
  const handleDownload = (content: string, filename: string) => {
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
      <head><meta charset="utf-8"><title>${filename}</title></head>
      <body style="font-family: Arial, sans-serif;">
        ${content
          .replace(/^# (.*$)/gm, '<h1>$1</h1>')
          .replace(/^## (.*$)/gm, '<h2>$1</h2>')
          .replace(/^### (.*$)/gm, '<h3>$1</h3>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/^- (.*$)/gm, '<li>$1</li>')
          .replace(/^(\d+)\. (.*$)/gm, '<li>$2</li>')
          .replace(/\n/g, '<br/>')
        }
      </body></html>
    `;
    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/processes')}
            className="text-blue-600 hover:underline mb-4 inline-block"
          >
            ← Back to Processes
          </button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{process.title}</h1>
              {process.description && (
                <p className="mt-2 text-gray-600">{process.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                process.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' :
                process.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {process.status}
              </span>
              
              {process.status === 'DRAFT' && (
                <button
                  onClick={handlePublish}
                  disabled={publishing}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                >
                  {publishing ? 'Publishing...' : 'Publish'}
                </button>
              )}
              
              <button
                onClick={() => router.push(`/processes/${params.id}/edit`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
              >
                Edit
              </button>
              
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>

          {/* Meta info */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {process.area}
            </span>
            {process.owner && (
              <span>Owner: {process.owner.name}</span>
            )}
            <span>Updated: {new Date(process.updatedAt).toLocaleDateString()}</span>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.map((tag: string) => (
                <span
                  key={tag}
                  className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* View Toggle */}
        <div className="mb-4 flex gap-2 flex-wrap">
          {/* Only show Steps tab for PROCESS type, not DOCUMENT */}
          {process.type !== 'DOCUMENT' && (
            <button
              onClick={() => setViewMode('steps')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'steps'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              📋 Steps {hasSteps ? `(${stepsData?.totalSteps || 0})` : ''}
            </button>
          )}

          {hasContent && (
            <button
              onClick={() => setViewMode('markdown')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'markdown'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              📄 {process.type === 'DOCUMENT' ? 'Template' : 'Document'}
            </button>
          )}
          {/* Example tab for documents with example content */}
          {process.type === 'DOCUMENT' && process.exampleContent && (
            <button
              onClick={() => setViewMode('example')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'example'
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-green-700 border border-green-300 hover:bg-green-50'
              }`}
            >
              📝 Example
            </button>
          )}
          {/* Only show SOP tab for PROCESS type */}
          {process.type !== 'DOCUMENT' && (
            <button
              onClick={() => setViewMode('sop')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'sop'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-purple-700 border border-purple-300 hover:bg-purple-50'
              }`}
            >
              📋 SOP View
            </button>
          )}
          <button
            onClick={() => setViewMode('history')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'history'
                ? 'bg-gray-800 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            📜 History
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow p-6 md:p-8">
          {/* Steps View */}
          {viewMode === 'steps' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Process Steps</h2>
                <button
                  onClick={() => setShowAddStep(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Step
                </button>
              </div>

              {showAddStep && (
                <div className="mb-6 p-4 border border-blue-200 rounded-lg bg-blue-50">
                  <h3 className="font-medium text-gray-900 mb-4">Add New Step</h3>
                  <StepEditor
                    availableOwners={users}
                    availableTools={tools}
                    onSave={handleAddStep}
                    onCancel={() => setShowAddStep(false)}
                    isNew
                  />
                </div>
              )}

              {stepsData && (
                <StepFlow
                  steps={stepsData.steps}
                  handoffPoints={stepsData.handoffPoints}
                  editable
                  onStepClick={(step) => setSelectedStep(step)}
                />
              )}
            </div>
          )}

          {/* Step Edit Modal */}
          {selectedStep && (
            <StepModal
              step={selectedStep}
              availableOwners={users}
              availableTools={tools}
              onClose={() => setSelectedStep(null)}
              onSave={handleUpdateStep}
              onDelete={handleDeleteStep}
            />
          )}

          {/* Markdown/Template View */}
          {viewMode === 'markdown' && hasContent && (
            <div>
              <div className="mb-4 pb-4 border-b border-gray-200 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {process.type === 'DOCUMENT' ? '📄 Template Document' : '📄 Document Content'}
                </span>
                <button
                  onClick={() => handleDownload(process.content, `${process.title} - Template`)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md"
                >
                  ⬇️ Download .doc
                </button>
              </div>
              <article className="prose prose-slate prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900 prose-table:text-sm max-w-none">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                components={{
                  table: ({node, ...props}) => (
                    <div className="overflow-x-auto my-4">
                      <table className="min-w-full border-collapse border border-gray-300" {...props} />
                    </div>
                  ),
                  th: ({node, ...props}) => (
                    <th className="border border-gray-300 bg-gray-100 px-3 py-2 text-left font-semibold" {...props} />
                  ),
                  td: ({node, ...props}) => (
                    <td className="border border-gray-300 px-3 py-2" {...props} />
                  ),
                  h1: ({node, ...props}) => (
                    <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-900" {...props} />
                  ),
                  h2: ({node, ...props}) => (
                    <h2 className="text-xl font-bold mt-6 mb-3 text-gray-900 border-b pb-2" {...props} />
                  ),
                  h3: ({node, ...props}) => (
                    <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-800" {...props} />
                  ),
                  blockquote: ({node, ...props}) => (
                    <blockquote className="border-l-4 border-blue-500 pl-4 my-4 italic bg-blue-50 py-2 rounded-r" {...props} />
                  ),
                  ul: ({node, ...props}) => (
                    <ul className="list-disc pl-6 my-3 space-y-1" {...props} />
                  ),
                  ol: ({node, ...props}) => (
                    <ol className="list-decimal pl-6 my-3 space-y-1" {...props} />
                  ),
                  li: ({node, ...props}) => (
                    <li className="text-gray-700" {...props} />
                  ),
                  hr: ({node, ...props}) => (
                    <hr className="my-6 border-gray-200" {...props} />
                  ),
                  p: ({node, ...props}) => (
                    <p className="my-3 text-gray-700 leading-relaxed" {...props} />
                  ),
                }}
              >
                {process.content}
              </ReactMarkdown>
            </article>
            </div>
          )}

          {/* Example View (for documents with examples) */}
          {viewMode === 'example' && hasExample && (
            <div>
              <div className="mb-4 pb-4 border-b border-gray-200 flex items-center justify-between">
                <span className="text-sm text-gray-500">📝 Example Document</span>
                <button
                  onClick={() => handleDownload(process.exampleContent!, `${process.title} - Example`)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md"
                >
                  ⬇️ Download .doc
                </button>
              </div>
              <article className="prose prose-slate prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900 prose-table:text-sm max-w-none">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table: ({node, ...props}) => (
                      <div className="overflow-x-auto my-4">
                        <table className="min-w-full border-collapse border border-gray-300" {...props} />
                      </div>
                    ),
                    th: ({node, ...props}) => (
                      <th className="border border-gray-300 bg-gray-100 px-3 py-2 text-left font-semibold" {...props} />
                    ),
                    td: ({node, ...props}) => (
                      <td className="border border-gray-300 px-3 py-2" {...props} />
                    ),
                    h1: ({node, ...props}) => (
                      <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-900" {...props} />
                    ),
                    h2: ({node, ...props}) => (
                      <h2 className="text-xl font-bold mt-6 mb-3 text-gray-900 border-b pb-2" {...props} />
                    ),
                    h3: ({node, ...props}) => (
                      <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-800" {...props} />
                    ),
                    blockquote: ({node, ...props}) => (
                      <blockquote className="border-l-4 border-green-500 pl-4 my-4 italic bg-green-50 py-2 rounded-r" {...props} />
                    ),
                    ul: ({node, ...props}) => (
                      <ul className="list-disc pl-6 my-3 space-y-1" {...props} />
                    ),
                    ol: ({node, ...props}) => (
                      <ol className="list-decimal pl-6 my-3 space-y-1" {...props} />
                    ),
                    li: ({node, ...props}) => (
                      <li className="text-gray-700" {...props} />
                    ),
                    hr: ({node, ...props}) => (
                      <hr className="my-6 border-gray-200" {...props} />
                    ),
                    p: ({node, ...props}) => (
                      <p className="my-3 text-gray-700 leading-relaxed" {...props} />
                    ),
                  }}
                >
                  {process.exampleContent}
                </ReactMarkdown>
              </article>
            </div>
          )}

          {/* SOP View */}
          {viewMode === 'sop' && (
            <div>
              {process.sopContent ? (
                <article className="prose prose-slate prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900 prose-table:text-sm max-w-none">
                  <div className="mb-4 pb-4 border-b border-gray-200 flex items-center justify-between">
                    <span className="text-sm text-gray-500">📋 Standard Operating Procedure Format</span>
                    <button
                      onClick={handleGenerateSop}
                      disabled={generatingSop}
                      className="text-sm text-purple-600 hover:text-purple-700 disabled:opacity-50"
                    >
                      {generatingSop ? '🔄 Regenerating...' : '🔄 Regenerate SOP'}
                    </button>
                  </div>
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: ({node, ...props}) => (
                        <div className="overflow-x-auto my-4">
                          <table className="min-w-full border-collapse border border-gray-300" {...props} />
                        </div>
                      ),
                      th: ({node, ...props}) => (
                        <th className="border border-gray-300 bg-gray-100 px-3 py-2 text-left font-semibold text-gray-900" {...props} />
                      ),
                      td: ({node, ...props}) => (
                        <td className="border border-gray-300 px-3 py-2 text-gray-700" {...props} />
                      ),
                      h2: ({node, ...props}) => (
                        <h2 className="text-xl font-bold mt-6 mb-3 text-gray-900 border-b pb-2" {...props} />
                      ),
                      h3: ({node, ...props}) => (
                        <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-800" {...props} />
                      ),
                      h4: ({node, ...props}) => (
                        <h4 className="text-base font-semibold mt-3 mb-1 text-gray-800" {...props} />
                      ),
                      p: ({node, ...props}) => (
                        <p className="my-2 text-gray-700 leading-relaxed" {...props} />
                      ),
                      ul: ({node, ...props}) => (
                        <ul className="list-disc pl-6 my-2 space-y-1 text-gray-700" {...props} />
                      ),
                      ol: ({node, ...props}) => (
                        <ol className="list-decimal pl-6 my-2 space-y-1 text-gray-700" {...props} />
                      ),
                      li: ({node, ...props}) => (
                        <li className="text-gray-700" {...props} />
                      ),
                      strong: ({node, ...props}) => (
                        <strong className="font-semibold text-gray-900" {...props} />
                      ),
                      hr: ({node, ...props}) => (
                        <hr className="my-6 border-gray-200" {...props} />
                      ),
                    }}
                  >
                    {process.sopContent}
                  </ReactMarkdown>
                </article>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📋</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No SOP Generated Yet</h3>
                  <p className="text-gray-500 mb-6">
                    Generate a formal Standard Operating Procedure from the process content.
                  </p>
                  <button
                    onClick={handleGenerateSop}
                    disabled={generatingSop}
                    className="px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 font-medium"
                  >
                    {generatingSop ? '✨ Generating SOP...' : '✨ Generate SOP'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* History View */}
          {viewMode === 'history' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Version History</h2>
                <span className="text-sm text-gray-500">Current version: {process.currentVersion || 1}</span>
              </div>
              <VersionHistory
                processId={process.id}
                currentVersion={process.currentVersion || 1}
                onRestore={() => {
                  // Refresh the page data after restore
                  window.location.reload();
                }}
              />
            </div>
          )}
        </div>

        {/* Related Documents Section */}
        <RelatedDocuments processId={process.id} />
      </div>
    </div>
  );
}
