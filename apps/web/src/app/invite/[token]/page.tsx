'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, Button, Input } from '@/components/ui';

export default function AcceptInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  // Validate the invite token
  const { data: inviteData, isLoading, error: fetchError } = useQuery({
    queryKey: ['invite', token],
    queryFn: async () => {
      const { data } = await api.get(`/users/invite/${token}`);
      return data.data;
    },
  });

  // Accept invite mutation
  const acceptMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/users/invite/${token}/accept`, { password });
      return data.data;
    },
    onSuccess: (data) => {
      // Redirect to login
      router.push(`/login?email=${encodeURIComponent(data.email)}&message=Account created! Please log in.`);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to create account');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    acceptMutation.mutate();
  };

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <Card className="w-full max-w-md p-8 text-center">
          <p className="text-gray-500">Validating invite link...</p>
        </Card>
      </main>
    );
  }

  if (fetchError || !inviteData) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <Card className="w-full max-w-md p-8 text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Invalid Invite</h1>
          <p className="text-gray-600 mb-4">
            This invite link is invalid or has expired. Please contact your administrator for a new invite.
          </p>
          <Button onClick={() => router.push('/login')}>Go to Login</Button>
        </Card>
      </main>
    );
  }

  if (inviteData.hasPassword) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <Card className="w-full max-w-md p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Already Registered</h1>
          <p className="text-gray-600 mb-4">
            You already have an account. Please log in with your existing password.
          </p>
          <Button onClick={() => router.push(`/login?email=${encodeURIComponent(inviteData.email)}`)}>
            Go to Login
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Welcome to Process Hub!</h1>
          <p className="text-gray-500">Create your account to get started</p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6">
          <p className="text-sm">
            <span className="font-medium">Name:</span> {inviteData.name}
          </p>
          <p className="text-sm">
            <span className="font-medium">Email:</span> {inviteData.email}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              minLength={8}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Confirm Password</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            loading={acceptMutation.isPending}
            disabled={acceptMutation.isPending}
          >
            Create Account
          </Button>
        </form>
      </Card>
    </main>
  );
}
