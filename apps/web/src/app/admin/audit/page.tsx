'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, Input, Button, Badge } from '@/components/ui';

interface AuditEntry {
  id: string;
  userId: string;
  userName: string;
  processId: string;
  processTitle: string;
  action: string;
  timestamp: string;
  ipAddress?: string;
}

export default function AuditPage() {
  const [filters, setFilters] = useState({ userId: '', processId: '', startDate: '', endDate: '' });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['audit', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.processId) params.append('processId', filters.processId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      const { data } = await api.get(`/access-audit?${params}`);
      return data;
    },
  });

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Access Audit Log</h1>

        {/* Filters */}
        <Card className="mb-6">
          <div className="grid grid-cols-4 gap-4">
            <Input
              label="User ID"
              value={filters.userId}
              onChange={(e) => setFilters(f => ({ ...f, userId: e.target.value }))}
              placeholder="Filter by user"
            />
            <Input
              label="Process ID"
              value={filters.processId}
              onChange={(e) => setFilters(f => ({ ...f, processId: e.target.value }))}
              placeholder="Filter by process"
            />
            <Input
              label="Start Date"
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value }))}
            />
            <Input
              label="End Date"
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value }))}
            />
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => refetch()}>Apply Filters</Button>
          </div>
        </Card>

        {/* Results */}
        {isLoading ? (
          <p>Loading audit log...</p>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">{data?.total || 0} entries</p>
            <div className="space-y-2">
              {data?.data?.map((entry: AuditEntry) => (
                <Card key={entry.id} variant="bordered" className="py-3">
                  <div className="flex items-center gap-4">
                    <Badge variant="info">{entry.action}</Badge>
                    <span className="font-medium">{entry.userName}</span>
                    <span className="text-gray-500">accessed</span>
                    <span className="font-medium">{entry.processTitle}</span>
                    <span className="ml-auto text-sm text-gray-400">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
