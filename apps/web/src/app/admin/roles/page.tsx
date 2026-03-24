'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, Button, Input, Badge, Modal } from '@/components/ui';

interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
  userCount: number;
}

const ALL_PERMISSIONS = [
  'process:read', 'process:create', 'process:update', 'process:delete', 'process:publish', 'process:manage',
  'role:read', 'role:create', 'role:update', 'role:delete', 'role:assign',
  'audit:read', 'audit:export',
  'user:read', 'user:create', 'user:update', 'user:delete',
];

export default function RolesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', description: '', permissions: [] as string[] });
  const queryClient = useQueryClient();

  const { data: roles, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await api.get('/roles');
      return data.data as Role[];
    },
  });

  const createMutation = useMutation({
    mutationFn: (role: typeof newRole) => api.post('/roles', role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setIsCreateOpen(false);
      setNewRole({ name: '', description: '', permissions: [] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/roles/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  });

  const togglePermission = (perm: string) => {
    setNewRole(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  if (isLoading) return <div className="p-8">Loading roles...</div>;

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Role Management</h1>
          <Button onClick={() => setIsCreateOpen(true)}>Create Role</Button>
        </div>

        <div className="space-y-4">
          {roles?.map((role) => (
            <Card key={role.id} variant="bordered">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{role.name}</h3>
                    {role.isSystem && <Badge size="sm" variant="info">System</Badge>}
                  </div>
                  {role.description && <p className="text-gray-600 text-sm mt-1">{role.description}</p>}
                  <p className="text-sm text-gray-500 mt-2">{role.userCount} users · {role.permissions.length} permissions</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {role.permissions.slice(0, 5).map(p => (
                      <Badge key={p} size="sm" variant="default">{p}</Badge>
                    ))}
                    {role.permissions.length > 5 && (
                      <Badge size="sm" variant="default">+{role.permissions.length - 5} more</Badge>
                    )}
                  </div>
                </div>
                {!role.isSystem && role.userCount === 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate(role.id)}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>

        <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Role">
          <div className="space-y-4">
            <Input
              label="Name"
              value={newRole.name}
              onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Role name"
            />
            <Input
              label="Description"
              value={newRole.description}
              onChange={(e) => setNewRole(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description"
            />
            <div>
              <label className="block text-sm font-medium mb-2">Permissions</label>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                {ALL_PERMISSIONS.map(perm => (
                  <Badge
                    key={perm}
                    variant={newRole.permissions.includes(perm) ? 'success' : 'default'}
                    className="cursor-pointer"
                    onClick={() => togglePermission(perm)}
                  >
                    {perm}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate(newRole)}
                loading={createMutation.isPending}
                disabled={!newRole.name || newRole.permissions.length === 0}
              >
                Create
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </main>
  );
}
