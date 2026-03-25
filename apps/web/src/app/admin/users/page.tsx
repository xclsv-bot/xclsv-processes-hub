'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, Button, Badge, Input } from '@/components/ui';

const ROLE_COLORS = {
  ADMIN: 'error',
  MANAGER: 'warning',
  EDITOR: 'info',
  VIEWER: 'default',
} as const;

interface User {
  id: string;
  name: string;
  email: string;
  role: keyof typeof ROLE_COLORS;
  isActive: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  // Get all users
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get('/users');
      return data.data as User[];
    },
  });

  // Generate invite for existing user
  const generateInviteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await api.post(`/users/${userId}/invite`);
      return data.data;
    },
    onSuccess: (data) => {
      const fullUrl = `${window.location.origin}${data.inviteUrl}`;
      setInviteLink(fullUrl);
    },
  });

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      alert('Invite link copied!');
    }
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-gray-500">Manage team members and send invites</p>
          </div>
          <Button onClick={() => setShowInviteModal(true)}>+ Invite User</Button>
        </div>

        {/* Invite Link Modal */}
        {inviteLink && (
          <Card className="p-4 mb-6 bg-green-50 dark:bg-green-900/20 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-green-700 dark:text-green-400">Invite Link Generated!</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 break-all">{inviteLink}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={copyInviteLink}>Copy</Button>
                <Button size="sm" variant="ghost" onClick={() => setInviteLink(null)}>✕</Button>
              </div>
            </div>
          </Card>
        )}

        {/* Users list */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : (
          <div className="space-y-4">
            {users?.map((user) => (
              <Card key={user.id} variant="bordered" className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{user.name}</span>
                        <Badge variant={ROLE_COLORS[user.role]} size="sm">
                          {user.role}
                        </Badge>
                        {!user.isActive && (
                          <Badge variant="default" size="sm">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => generateInviteMutation.mutate(user.id)}
                      disabled={generateInviteMutation.isPending}
                    >
                      {generateInviteMutation.isPending ? '...' : 'Send Invite'}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Create User Modal */}
        {showInviteModal && (
          <InviteUserModal
            onClose={() => setShowInviteModal(false)}
            onSuccess={(data) => {
              setShowInviteModal(false);
              const fullUrl = `${window.location.origin}${data.inviteUrl}`;
              setInviteLink(fullUrl);
              queryClient.invalidateQueries({ queryKey: ['users'] });
            }}
          />
        )}
      </div>
    </main>
  );
}

function InviteUserModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (data: any) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('EDITOR');

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/users/invite', { name, email, role });
      return data.data;
    },
    onSuccess,
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to create invite');
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Invite New User</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@xclsvmedia.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="VIEWER">Viewer (read only)</option>
              <option value="EDITOR">Editor (can edit processes)</option>
              <option value="MANAGER">Manager (can manage team)</option>
              <option value="ADMIN">Admin (full access)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => inviteMutation.mutate()}
            disabled={!name || !email || inviteMutation.isPending}
            loading={inviteMutation.isPending}
          >
            Create & Generate Invite
          </Button>
        </div>
      </Card>
    </div>
  );
}
