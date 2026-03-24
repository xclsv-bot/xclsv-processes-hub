'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Process {
  id: string;
  title: string;
  description: string;
  content: string;
  area: string;
  status: string;
  metadata?: { tags?: string[] };
  owner?: { name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export default function ProcessDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [process, setProcess] = useState<Process | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProcess = async () => {
      try {
        const { data } = await api.get(`/processes/${params.id}`);
        setProcess(data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load process');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchProcess();
    }
  }, [params.id]);

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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
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
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              process.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' :
              process.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {process.status}
            </span>
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

        {/* Content */}
        <div className="bg-white rounded-lg shadow p-6 md:p-8">
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
      </div>
    </div>
  );
}
