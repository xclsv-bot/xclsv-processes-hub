'use client';

import Link from 'next/link';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui';
import { NotificationBell } from '@/components/notifications';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();

  return (
    <nav className="border-b dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold text-primary-600">
            Process Hub
          </Link>
          <div className="hidden md:flex items-center gap-4">
            <Link href="/processes" className="hover:text-primary-600">
              Processes
            </Link>
            <Link href="/search" className="hover:text-primary-600">
              Search
            </Link>
            {isAuthenticated && (
              <>
                <Link href="/tasks" className="hover:text-primary-600">
                  Tasks
                </Link>
                <Link href="/dashboard" className="hover:text-primary-600">
                  Dashboard
                </Link>
                {user?.role === 'ADMIN' && (
                  <Link href="/admin/users" className="hover:text-primary-600">
                    Users
                  </Link>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <NotificationBell />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {user?.name}
              </span>
              <Button variant="outline" size="sm" onClick={logout}>
                Logout
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button size="sm">Sign In</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
