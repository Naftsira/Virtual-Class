'use client';

import { useAuth } from '@/lib/store/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <span className="font-bold text-lg tracking-tight">LECTRA</span>
          <span className="text-xs text-gray-400 ml-2">Think, Draw, Learn.</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.name}</span>
          <span className="text-xs bg-black text-white px-2 py-1 rounded-full capitalize">
            {user?.role}
          </span>
          <button
            onClick={logout}
            className="text-sm text-gray-500 hover:text-black transition"
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold mb-1">
          Good morning, {user?.name?.split(' ')[0]}.
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          {user?.role === 'lecturer'
            ? 'Manage your courses and sessions from here.'
            : 'Check your courses and upcoming sessions.'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Courses', href: '/courses' },
            { label: 'Sessions', href: '/courses' },
            { label: 'Assignments', href: '/courses' },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="bg-white rounded-2xl border p-6 hover:shadow-md transition cursor-pointer"
            >
              <h2 className="font-semibold text-sm text-gray-400 uppercase tracking-wide mb-2">
                {item.label}
              </h2>
              <p className="text-3xl font-bold">→</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
