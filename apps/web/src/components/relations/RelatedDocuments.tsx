'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

interface RelatedProcess {
  id: string;
  title: string;
  description?: string;
  area: string;
  status: string;
  slug?: string;
}

interface Relation {
  id: string;
  fromProcessId: string;
  toProcessId: string;
  relationType: string;
  createdAt: string;
  relatedProcess: RelatedProcess;
}

interface Process {
  id: string;
  title: string;
  description?: string;
  area: string;
  status: string;
  slug?: string;
}

interface RelatedDocumentsProps {
  processId: string;
}

export function RelatedDocuments({ processId }: RelatedDocumentsProps) {
  const [relations, setRelations] = useState<Relation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Process[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('supports');
  const [adding, setAdding] = useState(false);

  const fetchRelations = async () => {
    try {
      const res = await api.get(`/processes/${processId}/relations`);
      setRelations(res.data.data.relations || []);
    } catch (err) {
      console.error('Failed to load relations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRelations();
  }, [processId]);

  const searchProcesses = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await api.get(`/search?q=${encodeURIComponent(query)}&limit=10`);
      // Filter out current process and already linked processes
      const linkedIds = new Set([processId, ...relations.map(r => r.relatedProcess.id)]);
      const filtered = (res.data.data.results || res.data.data || []).filter(
        (p: Process) => !linkedIds.has(p.id)
      );
      setSearchResults(filtered);
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchProcesses(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAddRelation = async (relatedProcessId: string) => {
    setAdding(true);
    try {
      await api.post(`/processes/${processId}/relations`, {
        relatedProcessId,
        relationType: selectedType,
      });
      await fetchRelations();
      setShowModal(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add relation');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveRelation = async (relationId: string) => {
    if (!confirm('Remove this link?')) return;
    
    try {
      await api.delete(`/processes/${processId}/relations/${relationId}`);
      setRelations(relations.filter(r => r.id !== relationId));
    } catch (err) {
      console.error('Failed to remove relation:', err);
    }
  };

  const getRelationBadge = (type: string) => {
    const colors: Record<string, string> = {
      supports: 'bg-green-100 text-green-700',
      references: 'bg-blue-100 text-blue-700',
      parent: 'bg-purple-100 text-purple-700',
      child: 'bg-orange-100 text-orange-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return 'bg-green-100 text-green-800';
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="mt-8 p-6 bg-white rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-20 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          🔗 Related Documents
          {relations.length > 0 && (
            <span className="text-sm font-normal text-gray-500">
              ({relations.length})
            </span>
          )}
        </h2>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          Link Document
        </button>
      </div>

      {relations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <p className="text-sm">No related documents yet</p>
          <p className="text-xs text-gray-400 mt-1">Link other processes to create connections</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {relations.map((relation) => (
            <div
              key={relation.id}
              className="group flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Link
                    href={`/processes/${relation.relatedProcess.id}`}
                    className="font-medium text-gray-900 hover:text-blue-600 truncate"
                  >
                    {relation.relatedProcess.title}
                  </Link>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRelationBadge(relation.relationType)}`}>
                    {relation.relationType}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(relation.relatedProcess.status)}`}>
                    {relation.relatedProcess.status}
                  </span>
                </div>
                {relation.relatedProcess.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {relation.relatedProcess.description}
                  </p>
                )}
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                  <span className="bg-gray-100 px-1.5 py-0.5 rounded">
                    {relation.relatedProcess.area}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleRemoveRelation(relation.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                title="Remove link"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Link Document Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/30" onClick={() => setShowModal(false)} />
            
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Link Related Document</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Relation Type */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Relationship Type
                </label>
                <div className="flex gap-2 flex-wrap">
                  {['supports', 'references', 'parent', 'child'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        selectedType === type
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Documents
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type to search..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              {/* Results */}
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
                {searching ? (
                  <div className="p-4 text-center text-gray-500">Searching...</div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    {searchQuery.length >= 2 
                      ? 'No matching documents found' 
                      : 'Type at least 2 characters to search'}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {searchResults.map((process) => (
                      <button
                        key={process.id}
                        onClick={() => handleAddRelation(process.id)}
                        disabled={adding}
                        className="w-full text-left p-3 hover:bg-blue-50 transition-colors disabled:opacity-50"
                      >
                        <div className="font-medium text-gray-900">{process.title}</div>
                        {process.description && (
                          <div className="text-sm text-gray-500 line-clamp-1 mt-0.5">
                            {process.description}
                          </div>
                        )}
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                            {process.area}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusColor(process.status)}`}>
                            {process.status}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
