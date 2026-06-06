'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store/auth';
import api from '@/lib/axios';
import Link from 'next/link';

export default function EnrollCodePage() {
  const { code } = useParams<{ code: string }>();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'not_student'>('loading');
  const [message, setMessage] = useState('');
  const [courseName, setCourseName] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push(`/login?redirect=/enroll/${code}`);
      return;
    }

    if (user.role !== 'student') {
      setStatus('not_student');
      return;
    }

    const enroll = async () => {
      try {
        const res = await api.post('/enroll', { code: code.toUpperCase() });
        setCourseName(res.data.course.name);
        setStatus('success');
        setTimeout(() => router.push('/courses'), 2000);
      } catch (err: any) {
        setMessage(err.response?.data?.message || 'Failed to enroll.');
        setStatus('error');
      }
    };

    enroll();
  }, [user, authLoading, code, router]);

  if (status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Joining course...</p>
      </div>
    </div>
  );

  if (status === 'not_student') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl border p-8 max-w-sm w-full text-center">
        <div className="text-4xl mb-4">🚫</div>
        <h1 className="text-xl font-bold mb-2">Access Denied</h1>
        <p className="text-gray-500 text-sm mb-6">
          Only students can enroll in courses. You are logged in as a <span className="font-medium">lecturer</span>.
        </p>
        <Link
          href="/dashboard"
          className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition inline-block"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );

  if (status === 'success') return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl border p-8 max-w-sm w-full text-center">
        <div className="text-4xl mb-4">🎉</div>
        <h1 className="text-xl font-bold mb-2">Enrolled!</h1>
        <p className="text-gray-500 text-sm mb-2">
          You have successfully joined <span className="font-medium">{courseName}</span>.
        </p>
        <p className="text-xs text-gray-400">Redirecting to courses...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl border p-8 max-w-sm w-full text-center">
        <div className="text-4xl mb-4">❌</div>
        <h1 className="text-xl font-bold mb-2">Failed to Enroll</h1>
        <p className="text-gray-500 text-sm mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/enroll"
            className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition"
          >
            Try Again
          </Link>
          <Link
            href="/dashboard"
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
