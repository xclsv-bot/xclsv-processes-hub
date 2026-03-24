'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, Button, Badge } from '@/components/ui';

interface AccessRequest {
  id: string;
  processId: string;
  processTitle: string;
  requesterName: string;
  requestedPermissions: string[];
  reason: string;
  status: string;
  createdAt: string;
}

export default function AccessRequestsPage() {
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['access-requests'],
    queryFn: async () => {
      const { data } = await api.get('/access-requests/pending');
      return data.data as AccessRequest[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/access-requests/${id}/approve`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['access-requests'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/access-requests/${id}/reject`, { reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['access-requests'] }),
  });

  if (isLoading) return <div className="p-8">Loading requests...</div>;

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Access Requests</h1>

        {requests?.length === 0 ? (
          <p className="text-gray-500">No pending access requests</p>
        ) : (
          <div className="space-y-4">
            {requests?.map((req) => (
              <Card key={req.id} variant="bordered">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{req.requesterName}</h3>
                    <p className="text-sm text-gray-600">
                      Requesting access to <span className="font-medium">{req.processTitle}</span>
                    </p>
                    <div className="flex gap-1 mt-2">
                      {req.requestedPermissions.map(p => (
                        <Badge key={p} size="sm">{p}</Badge>
                      ))}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">Reason: {req.reason}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(req.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => rejectMutation.mutate({ id: req.id, reason: 'Request denied' })}
                      loading={rejectMutation.isPending}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => approveMutation.mutate(req.id)}
                      loading={approveMutation.isPending}
                    >
                      Approve
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
