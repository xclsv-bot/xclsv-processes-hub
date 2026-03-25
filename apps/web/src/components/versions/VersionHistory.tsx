'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface Version {
  id: string;
  version: number;
  title: string;
  changeNotes: string;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
  };
}

interface VersionDetail {
  version: number;
  title: string;
  content: string;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
  };
}

interface ComparisonResult {
  version1: VersionDetail;
  version2: VersionDetail;
  diff: Array<{ type: 'added' | 'removed' | 'unchanged'; line: string }>;
  summary: {
    linesAdded: number;
    linesRemoved: number;
    linesUnchanged: number;
  };
}

interface Props {
  processId: string;
  currentVersion: number;
  onRestore?: () => void;
}

export function VersionHistory({ processId, currentVersion, onRestore }: Props) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedVersions, setSelectedVersions] = useState<number[]>([]);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [comparing, setComparing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [viewingVersion, setViewingVersion] = useState<VersionDetail | null>(null);

  useEffect(() => {
    fetchVersions();
  }, [processId]);

  const fetchVersions = async () => {
    try {
      const res = await api.get(`/processes/${processId}/versions`);
      setVersions(res.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load version history');
    } finally {
      setLoading(false);
    }
  };

  const handleVersionSelect = (version: number) => {
    setSelectedVersions(prev => {
      if (prev.includes(version)) {
        return prev.filter(v => v !== version);
      }
      if (prev.length >= 2) {
        return [prev[1], version];
      }
      return [...prev, version];
    });
  };

  const handleCompare = async () => {
    if (selectedVersions.length !== 2) return;
    
    setComparing(true);
    try {
      const [v1, v2] = selectedVersions.sort((a, b) => a - b);
      const res = await api.get(`/processes/${processId}/versions/${v1}/compare/${v2}`);
      setComparison(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to compare versions');
    } finally {
      setComparing(false);
    }
  };

  const handleViewVersion = async (version: number) => {
    try {
      const res = await api.get(`/processes/${processId}/versions/${version}`);
      setViewingVersion(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load version');
    }
  };

  const handleRestore = async (version: number) => {
    if (!confirm(`Are you sure you want to restore version ${version}? This will replace the current content.`)) {
      return;
    }

    setRestoring(true);
    try {
      await api.post(`/processes/${processId}/versions/${version}/restore`);
      alert('Version restored successfully!');
      onRestore?.();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to restore version');
    } finally {
      setRestoring(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading version history...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  if (versions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">📜</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Version History</h3>
        <p className="text-gray-500">
          Version history is created when you publish a process.<br />
          Publish this process to start tracking changes.
        </p>
      </div>
    );
  }

  // Viewing a specific version
  if (viewingVersion) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setViewingVersion(null)}
            className="text-blue-600 hover:underline"
          >
            ← Back to history
          </button>
          <button
            onClick={() => handleRestore(viewingVersion.version)}
            disabled={restoring}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
          >
            {restoring ? 'Restoring...' : `Restore Version ${viewingVersion.version}`}
          </button>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold">Version {viewingVersion.version}</span>
              <span className="text-gray-500 ml-2">— {viewingVersion.title}</span>
            </div>
            <div className="text-sm text-gray-500">
              {new Date(viewingVersion.createdAt).toLocaleString()} by {viewingVersion.createdBy.name}
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap">
          {viewingVersion.content || '(No content)'}
        </div>
      </div>
    );
  }

  // Comparison view
  if (comparison) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setComparison(null)}
            className="text-blue-600 hover:underline"
          >
            ← Back to history
          </button>
          <div className="text-sm text-gray-500">
            <span className="text-green-600 font-medium">+{comparison.summary.linesAdded} added</span>
            <span className="mx-2">|</span>
            <span className="text-red-600 font-medium">-{comparison.summary.linesRemoved} removed</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-red-50 rounded-lg p-3">
            <div className="font-semibold text-red-800">Version {comparison.version1.version}</div>
            <div className="text-sm text-red-600">
              {new Date(comparison.version1.createdAt).toLocaleDateString()} by {comparison.version1.createdBy.name}
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="font-semibold text-green-800">Version {comparison.version2.version}</div>
            <div className="text-sm text-green-600">
              {new Date(comparison.version2.createdAt).toLocaleDateString()} by {comparison.version2.createdBy.name}
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="max-h-96 overflow-y-auto">
            {comparison.diff.map((d, i) => (
              <div
                key={i}
                className={`px-4 py-1 font-mono text-sm ${
                  d.type === 'added' ? 'bg-green-100 text-green-800' :
                  d.type === 'removed' ? 'bg-red-100 text-red-800' :
                  'bg-white text-gray-700'
                }`}
              >
                <span className="mr-2 text-gray-400">
                  {d.type === 'added' ? '+' : d.type === 'removed' ? '-' : ' '}
                </span>
                {d.line || '\u00A0'}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Main version list
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-500">
          {selectedVersions.length === 2 ? (
            <span>Select 2 versions to compare (selected: {selectedVersions.join(', ')})</span>
          ) : selectedVersions.length === 1 ? (
            <span>Select one more version to compare (selected: {selectedVersions[0]})</span>
          ) : (
            <span>Select 2 versions to compare them</span>
          )}
        </div>
        {selectedVersions.length === 2 && (
          <button
            onClick={handleCompare}
            disabled={comparing}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {comparing ? 'Comparing...' : 'Compare Versions'}
          </button>
        )}
      </div>

      <div className="space-y-2">
        {versions.map((v) => (
          <div
            key={v.id}
            className={`border rounded-lg p-4 transition-colors ${
              selectedVersions.includes(v.version)
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedVersions.includes(v.version)}
                  onChange={() => handleVersionSelect(v.version)}
                  className="mt-1"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Version {v.version}</span>
                    {v.version === currentVersion - 1 && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                        Latest Published
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{v.title}</div>
                  {v.changeNotes && (
                    <div className="text-sm text-gray-500 mt-1 italic">"{v.changeNotes}"</div>
                  )}
                  <div className="text-xs text-gray-400 mt-2">
                    {new Date(v.createdAt).toLocaleString()} by {v.createdBy.name}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleViewVersion(v.version)}
                  className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                >
                  View
                </button>
                <button
                  onClick={() => handleRestore(v.version)}
                  disabled={restoring}
                  className="px-3 py-1 text-sm text-orange-600 hover:bg-orange-50 rounded disabled:opacity-50"
                >
                  Restore
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
