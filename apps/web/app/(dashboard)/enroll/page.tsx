'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/store/auth';
import api from '@/lib/axios';
import Link from 'next/link';

function EnrollForm() {
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const codeParam = searchParams.get('code');
    if (codeParam) {
      setCode(codeParam.toUpperCase());
      // Auto submit kalau ada code dari URL
      handleEnroll(codeParam.toUpperCase());
    }
  }, []);

  const handleEnroll = async (enrollCode: string) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.post('/enroll', { code: enrollCode });
      setSuccess(`Successfully enrolled in ${res.data.course.name}!`);
      setTimeout(() => router.push('/courses'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to enroll.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleEnroll(code);
  };

  if (user?.role !== 'student') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Only students can enroll.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="font-bold tracking-tight">LECTRA</Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium">Enroll</span>
      </nav>

      <main className="max-w-md mx-auto px-6 py-20">
        <h1 className="text-2xl font-bold mb-2">Join a Course</h1>
        <p className="text-gray-500 text-sm mb-8">Enter the course code given by your lecturer.</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-lg text-sm">{success}</div>
        )}

        {loading && !error && !success && (
          <div className="mb-4 p-3 bg-blue-50 text-blue-600 rounded-lg text-sm">Enrolling...</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Course Code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black font-mono"
              placeholder="XXXX-XXXX"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition"
          >
            {loading ? 'Enrolling...' : 'Enroll'}
          </button>
        </form>
      </main>
    </div>
  );
}

export default function EnrollPage() {
  return (
    <Suspense>
      <EnrollForm />
    </Suspense>
  );
}
