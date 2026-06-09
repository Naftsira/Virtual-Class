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

  const lecturerCards = [
    { label: 'Courses', href: '/courses', desc: 'Manage your courses' },
    { label: 'Sessions', href: '/courses', desc: 'View active sessions' },
    { label: 'Assignments', href: '/courses', desc: 'Create assignments' },
    { label: 'Schedule', href: '/schedule', desc: 'View weekly schedule' },
  ];

  const studentCards = [
    { label: 'My Courses', href: '/courses', desc: 'View enrolled courses' },
    { label: 'Assignments', href: '/courses', desc: 'Submit assignments' },
    { label: 'Schedule', href: '/schedule', desc: 'View weekly schedule' },
    { label: 'Join Course', href: '/enroll', desc: 'Enroll with course code' },
  ];

  const cards = user.role === 'lecturer' ? lecturerCards : studentCards;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <span className="font-bold text-lg tracking-tight">LECTRA</span>
          <span className="text-xs text-gray-400 ml-2">Think, Draw, Learn.</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition">
            {user.avatar ? (
              <img src={user.avatar} alt="avatar" className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center">
                {user.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm text-gray-600">{user.name}</span>
          </Link>
          <span className="text-xs bg-black text-white px-2 py-1 rounded-full capitalize">
            {user.role}
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
          Good morning, {user.name?.split(' ')[0]}.
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          {user.role === 'lecturer'
            ? 'Manage your courses and sessions from here.'
            : 'Check your courses and upcoming sessions.'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="bg-white rounded-2xl border p-6 hover:shadow-md transition cursor-pointer"
            >
              <h2 className="font-semibold text-sm text-gray-400 uppercase tracking-wide mb-2">
                {card.label}
              </h2>
              <p className="text-sm text-gray-600">{card.desc}</p>
              <p className="text-2xl font-bold mt-3">→</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
