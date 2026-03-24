'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import Link from 'next/link';

interface Process {
  id: string;
  title: string;
  description: string;
  area: string;
  status: string;
}

export default function ProcessesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['processes'],
    queryFn: async () => {
      const { data } = await api.get('/processes');
      return data.data as Process[];
    },
  });

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Processes</h1>
          <Link
            href="/processes/new"
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            New Process
          </Link>
        </div>

        {isLoading && (
          <p className="text-gray-600">Loading processes...</p>
        )}

        {error && (
          <p className="text-red-500">Failed to load processes</p>
        )}

        {data && data.length === 0 && (
          <div className="text-center py-12 text-gray-600">
            <p>No processes found.</p>
            <p className="mt-2">
              <Link href="/processes/new" className="text-primary-600 hover:underline">
                Create your first process
              </Link>
            </p>
          </div>
        )}

        {data && data.length > 0 && (
          <div className="grid gap-4">
            {data.map((process) => (
              <Link
                key={process.id}
                href={`/processes/${process.id}`}
                className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold">{process.title}</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      {process.description || 'No description'}
                    </p>
                  </div>
                  <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded">
                    {process.area}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
