'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { Card, Button, Badge, Input } from '@/components/ui';

const STATUS_COLORS = {
  PENDING: 'warning',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'default',
} as const;

const PRIORITY_COLORS = {
  LOW: 'default',
  MEDIUM: 'info',
  HIGH: 'warning',
  URGENT: 'error',
} as const;

interface Task {
  id: string;
  title: string;
  description?: string;
  status: keyof typeof STATUS_COLORS;
  priority: keyof typeof PRIORITY_COLORS;
  dueDate?: string;
  completedAt?: string;
  assignee: { id: string; name: string; email: string };
  createdBy: { id: string; name: string; email: string };
  process?: { id: string; title: string; slug: string };
  step?: { id: string; title: string };
  createdAt: string;
}

export default function TasksPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'my'>('my');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Get current user
  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await api.get('/auth/me');
      return data.data;
    },
  });

  // Get tasks
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks', filter],
    queryFn: async () => {
      const endpoint = filter === 'my' ? '/tasks/my' : '/tasks';
      const { data } = await api.get(endpoint);
      return data.data as Task[];
    },
  });

  // Get stats
  const { data: stats } = useQuery({
    queryKey: ['task-stats'],
    queryFn: async () => {
      const { data } = await api.get('/tasks/stats');
      return data.data;
    },
  });

  // Update task status
  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await api.put(`/tasks/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-stats'] });
    },
  });

  const tasks = tasksData || [];

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Tasks</h1>
            <p className="text-gray-500">Manage your assigned work</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>+ New Task</Button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.pending}</div>
              <div className="text-sm text-gray-500">Pending</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-500">{stats.inProgress}</div>
              <div className="text-sm text-gray-500">In Progress</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
              <div className="text-sm text-gray-500">Completed</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-red-500">{stats.overdue}</div>
              <div className="text-sm text-gray-500">Overdue</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-gray-500">Total</div>
            </Card>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={filter === 'my' ? 'primary' : 'ghost'}
            onClick={() => setFilter('my')}
          >
            My Tasks
          </Button>
          <Button
            variant={filter === 'all' ? 'primary' : 'ghost'}
            onClick={() => setFilter('all')}
          >
            All Tasks
          </Button>
        </div>

        {/* Tasks list */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : tasks.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-gray-500 mb-4">No tasks found</p>
            <Button onClick={() => setShowCreateModal(true)}>Create your first task</Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <Card key={task.id} variant="bordered" className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{task.title}</h3>
                      <Badge variant={PRIORITY_COLORS[task.priority]} size="sm">
                        {task.priority}
                      </Badge>
                      <Badge variant={STATUS_COLORS[task.status]} size="sm">
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    {task.description && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                        {task.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span>Assigned to: <strong>{task.assignee.name}</strong></span>
                      {task.process && (
                        <Link href={`/processes/${task.process.id}`} className="text-blue-500 hover:underline">
                          📄 {task.process.title}
                        </Link>
                      )}
                      {task.dueDate && (
                        <span className={new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED' ? 'text-red-500' : ''}>
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quick status buttons */}
                  <div className="flex gap-2 ml-4">
                    {task.status === 'PENDING' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateMutation.mutate({ id: task.id, status: 'IN_PROGRESS' })}
                      >
                        Start
                      </Button>
                    )}
                    {task.status === 'IN_PROGRESS' && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => updateMutation.mutate({ id: task.id, status: 'COMPLETED' })}
                      >
                        Complete
                      </Button>
                    )}
                    {task.status === 'COMPLETED' && (
                      <span className="text-green-500 text-sm">✓ Done</span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Create Task Modal - simplified inline for now */}
        {showCreateModal && (
          <CreateTaskModal 
            onClose={() => setShowCreateModal(false)} 
            onSuccess={() => {
              setShowCreateModal(false);
              queryClient.invalidateQueries({ queryKey: ['tasks'] });
            }}
          />
        )}
      </div>
    </main>
  );
}

function CreateTaskModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDate, setDueDate] = useState('');

  // Get users for assignee dropdown
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get('/users');
      return data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post('/tasks', {
        title,
        description: description || undefined,
        assigneeId,
        priority,
        dueDate: dueDate || undefined,
      });
    },
    onSuccess,
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Create Task</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Assign To *</label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="">Select user...</option>
              {usersData?.map((user: any) => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Due Date</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={() => createMutation.mutate()}
            disabled={!title || !assigneeId || createMutation.isPending}
            loading={createMutation.isPending}
          >
            Create Task
          </Button>
        </div>
      </Card>
    </div>
  );
}
