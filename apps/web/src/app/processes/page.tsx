'use client';

import { useState, useEffect, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

interface Owner {
  id: string;
  name: string;
  email: string;
}

interface Process {
  id: string;
  title: string;
  description: string;
  area: string;
  status: string;
  type: 'PROCESS' | 'DOCUMENT';
  owner: Owner;
}

const AREAS = [
  'AFFILIATE',
  'EVENTS',
  'INFLUENCER',
  'PARTNERS',
  'CRM',
  'OPERATIONS',
  'FINANCE',
  'HR',
  'GENERAL',
];

function ProcessCard({ 
  process, 
  onEdit, 
  onDelete, 
  isDeleting 
}: { 
  process: Process; 
  onEdit: (e: React.MouseEvent, id: string) => void;
  onDelete: (e: React.MouseEvent, id: string, title: string) => void;
  isDeleting: boolean;
}) {
  return (
    <div className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start">
        <Link href={`/processes/${process.id}`} className="flex-1">
          <h3 className="text-lg font-semibold hover:text-primary-600">
            {process.title}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
            {process.description || 'No description'}
          </p>
          {process.owner && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Owner: {process.owner.name}
            </p>
          )}
        </Link>

        <div className="flex items-center gap-2 ml-4">
          <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded">
            {process.area}
          </span>

          <button
            onClick={(e) => onEdit(e, process.id)}
            className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          <button
            onClick={(e) => onDelete(e, process.id, process.title)}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Delete"
            disabled={isDeleting}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function ProcessesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  
  // Initialize filters from URL params
  const [areaFilter, setAreaFilter] = useState<string>(searchParams.get('area') || '');
  const [ownerFilter, setOwnerFilter] = useState<string>(searchParams.get('owner') || '');
  const [typeFilter, setTypeFilter] = useState<string>(searchParams.get('type') || '');

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (areaFilter) params.set('area', areaFilter);
    if (ownerFilter) params.set('owner', ownerFilter);
    if (typeFilter) params.set('type', typeFilter);
    
    const queryString = params.toString();
    const newUrl = queryString ? `/processes?${queryString}` : '/processes';
    
    // Use replaceState to update URL without adding to history
    window.history.replaceState(null, '', newUrl);
  }, [areaFilter, ownerFilter, typeFilter]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['processes', areaFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('limit', '100'); // Get more processes for better filtering
      params.set('type', 'ALL'); // Get both processes and documents
      if (areaFilter) params.set('area', areaFilter);
      const url = `/processes?${params}`;
      const { data } = await api.get(url);
      return data.data as Process[];
    },
  });

  // Fetch all users for the owner filter dropdown
  const { data: allUsers } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get('/users');
      return data.data as Owner[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/processes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] });
    },
  });

  const handleDelete = (e: React.MouseEvent, id: string, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Delete "${title}"? This cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/processes/${id}/edit`);
  };

  // Use all users for the owner filter dropdown (not just owners from current page)
  const uniqueOwners = allUsers || [];

  // Apply filters client-side
  const filteredData = data?.filter((p) => {
    if (ownerFilter && p.owner?.id !== ownerFilter) return false;
    if (typeFilter && p.type !== typeFilter) return false;
    return true;
  });

  // Separate into processes and documents for display
  const processes = filteredData?.filter(p => p.type !== 'DOCUMENT') || [];
  const documents = filteredData?.filter(p => p.type === 'DOCUMENT') || [];

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Processes</h1>
          <Link
            href="/processes/new"
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            New Process
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Department
            </label>
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm min-w-[150px]"
            >
              <option value="">All Departments</option>
              {AREAS.map((area) => (
                <option key={area} value={area}>
                  {area.charAt(0) + area.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Owner
            </label>
            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm min-w-[150px]"
            >
              <option value="">All Team Members</option>
              {uniqueOwners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm min-w-[150px]"
            >
              <option value="">All Types</option>
              <option value="PROCESS">Processes</option>
              <option value="DOCUMENT">Documents</option>
            </select>
          </div>

          {(areaFilter || ownerFilter || typeFilter) && (
            <button
              onClick={() => {
                setAreaFilter('');
                setOwnerFilter('');
                setTypeFilter('');
                // Clear URL params
                window.history.replaceState(null, '', '/processes');
              }}
              className="self-end px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Clear filters
            </button>
          )}
        </div>

        {isLoading && <p className="text-gray-600">Loading processes...</p>}

        {error && <p className="text-red-500">Failed to load processes</p>}

        {filteredData && filteredData.length === 0 && (
          <div className="text-center py-12 text-gray-600">
            <p>No processes found.</p>
            <p className="mt-2">
              <Link href="/processes/new" className="text-primary-600 hover:underline">
                Create your first process
              </Link>
            </p>
          </div>
        )}

        {/* Processes Section */}
        {processes.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-2xl">📋</span> Processes
              <span className="text-sm font-normal text-gray-500">({processes.length})</span>
            </h2>
            <div className="grid gap-4">
              {processes.map((process) => (
                <ProcessCard 
                  key={process.id} 
                  process={process} 
                  onEdit={handleEdit} 
                  onDelete={handleDelete}
                  isDeleting={deleteMutation.isPending}
                />
              ))}
            </div>
          </div>
        )}

        {/* Documents Section */}
        {documents.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-2xl">📄</span> Documents & Policies
              <span className="text-sm font-normal text-gray-500">({documents.length})</span>
            </h2>
            <div className="grid gap-4">
              {documents.map((process) => (
                <ProcessCard 
                  key={process.id} 
                  process={process} 
                  onEdit={handleEdit} 
                  onDelete={handleDelete}
                  isDeleting={deleteMutation.isPending}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function ProcessesPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <ProcessesContent />
    </Suspense>
  );
}
