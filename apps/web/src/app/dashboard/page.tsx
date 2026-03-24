'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { Card, Badge } from '@/components/ui';

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard');
      return data.data;
    },
  });

  if (isLoading) {
    return <div className="p-8">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">Failed to load dashboard</div>;
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="text-center">
            <p className="text-4xl font-bold text-primary-600">{data?.totalProcesses || 0}</p>
            <p className="text-gray-600 dark:text-gray-400">Total Processes</p>
          </Card>
          <Card className="text-center">
            <p className="text-4xl font-bold text-green-600">{data?.publishedProcesses || 0}</p>
            <p className="text-gray-600 dark:text-gray-400">Published</p>
          </Card>
          <Card className="text-center">
            <p className="text-4xl font-bold text-yellow-600">{data?.draftProcesses || 0}</p>
            <p className="text-gray-600 dark:text-gray-400">Drafts</p>
          </Card>
          <Card className="text-center">
            <p className="text-4xl font-bold text-blue-600">{data?.myProcesses || 0}</p>
            <p className="text-gray-600 dark:text-gray-400">My Processes</p>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Processes by Area */}
          <Card>
            <h2 className="text-xl font-semibold mb-4">By Area</h2>
            <div className="space-y-2">
              {data?.processesByArea?.map((item: any) => (
                <div key={item.area} className="flex justify-between items-center">
                  <span>{item.area}</span>
                  <Badge>{item.count}</Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* Upcoming Verifications */}
          <Card>
            <h2 className="text-xl font-semibold mb-4">Upcoming Verifications</h2>
            {data?.upcomingVerifications?.length === 0 ? (
              <p className="text-gray-500">No upcoming verifications</p>
            ) : (
              <div className="space-y-2">
                {data?.upcomingVerifications?.map((item: any) => (
                  <Link 
                    key={item.id} 
                    href={`/processes/${item.id}`}
                    className="block p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded"
                  >
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-gray-500">
                      Due: {new Date(item.dueDate).toLocaleDateString()}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          {data?.recentActivity?.length === 0 ? (
            <p className="text-gray-500">No recent activity</p>
          ) : (
            <div className="space-y-2">
              {data?.recentActivity?.map((item: any) => (
                <div key={item.id} className="flex items-center gap-4 p-2">
                  <Badge variant={
                    item.type === 'published' ? 'success' :
                    item.type === 'created' ? 'info' : 'default'
                  }>
                    {item.type}
                  </Badge>
                  <div className="flex-1">
                    <Link href={`/processes/${item.processId}`} className="font-medium hover:underline">
                      {item.processTitle}
                    </Link>
                    <span className="text-gray-500 text-sm ml-2">by {item.userName}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(item.timestamp).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
