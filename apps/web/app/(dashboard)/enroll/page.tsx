'use client';

import { useCallback, useEffect, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/store/auth';
import api from '@/lib/axios';
import Link from 'next/link';

function EnrollForm() {
  const { user, loading: authLoading } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleEnroll = useCallback(
    async (enrollCode: string) => {
      const normalizedCode = enrollCode.trim().toUpperCase();

      if (!normalizedCode) {
        setError('Course code is required.');
        return;
      }

      setLoading(true);
      setError('');
      setSuccess('');

      try {
        const res = await api.post('/enroll', { code: normalizedCode });
        setSuccess(`Successfully enrolled in ${res.data.course.name}.`);
        setTimeout(() => router.push('/courses'), 1500);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to enroll.');
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    if (authLoading) return;

    const codeParam = searchParams.get('code');

    if (!user) {
      const redirectPath = codeParam
        ? `/enroll?code=${codeParam.toUpperCase()}`
        : '/enroll';

      router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`);
      return;
    }

    if (user.role !== 'student') return;

    if (codeParam) {
      const normalizedCode = codeParam.toUpperCase();
      setCode(normalizedCode);
      handleEnroll(normalizedCode);
    }
  }, [authLoading, user, router, searchParams, handleEnroll]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleEnroll(code);
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#f9f9f9] text-[#1a1c1c]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#d6d4d3] border-t-black" />
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#777777]">
            Checking Access
          </p>
        </div>
      </div>
    );
  }

  if (user.role !== 'student') {
    return (
      <main className="min-h-dvh bg-[#f9f9f9] px-6 py-8 text-[#1a1c1c]">
        <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-xl items-center justify-center">
          <div className="w-full rounded-xl bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#ffdad6] text-[#410002]">
              <span className="material-symbols-outlined text-3xl">
                block
              </span>
            </div>

            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-[#ba1a1a]">
              Access Denied
            </p>

            <h1 className="mb-3 text-3xl font-black tracking-tight text-black">
              Student access only.
            </h1>

            <p className="mx-auto mb-8 max-w-sm text-sm leading-relaxed text-[#5f5e5e]">
              Only students can enroll in courses. You are currently signed in
              as a{' '}
              <span className="font-bold text-black capitalize">
                {user.role}
              </span>
              .
            </p>

            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 bg-black px-5 py-3 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#3b3b3b]"
            >
              Go to Dashboard
              <span>→</span>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[#f9f9f9] text-[#1a1c1c] selection:bg-black selection:text-white">
      <header className="border-b border-[#e2e2e2] bg-[#f9f9f9]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-lg font-black uppercase tracking-tighter text-black"
            >
              Lectra
            </Link>
            <span className="text-[#c8c6c6]">/</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#777777]">
              Enroll Gateway
            </span>
          </div>

          <Link
            href="/dashboard"
            className="hidden text-[10px] font-bold uppercase tracking-widest text-[#777777] transition-colors hover:text-black sm:block"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-6xl grid-cols-1 gap-8 px-6 py-10 lg:grid-cols-12 lg:items-center lg:py-16">
        <div className="lg:col-span-7">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.35em] text-[#777777]">
            Course Access
          </p>

          <h1 className="mb-5 max-w-3xl text-5xl font-black leading-none tracking-tighter text-black sm:text-6xl lg:text-7xl">
            Join your next classroom.
          </h1>

          <p className="max-w-xl text-sm leading-relaxed text-[#5f5e5e] sm:text-base">
            Enter the enrollment code given by your lecturer. If the code is
            valid, Lectra will attach the course to your workspace and redirect
            you to your course list.
          </p>

          <div className="mt-10 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="bg-white p-5">
              <span className="material-symbols-outlined mb-4 text-[#777777]">
                password
              </span>
              <h3 className="mb-1 text-sm font-black text-black">
                Code Based
              </h3>
              <p className="text-xs leading-relaxed text-[#777777]">
                Access is controlled by lecturer-issued course codes.
              </p>
            </div>

            <div className="bg-white p-5">
              <span className="material-symbols-outlined mb-4 text-[#777777]">
                verified_user
              </span>
              <h3 className="mb-1 text-sm font-black text-black">
                Student Only
              </h3>
              <p className="text-xs leading-relaxed text-[#777777]">
                Enrollment is restricted to student accounts.
              </p>
            </div>

            <div className="bg-white p-5">
              <span className="material-symbols-outlined mb-4 text-[#777777]">
                school
              </span>
              <h3 className="mb-1 text-sm font-black text-black">
                Course Ready
              </h3>
              <p className="text-xs leading-relaxed text-[#777777]">
                Successful enrollment sends you straight to courses.
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-8">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-[#777777]">
                Enrollment Form
              </p>

              <h2 className="mb-2 text-3xl font-black tracking-tight text-black">
                Enter Course Code
              </h2>

              <p className="text-sm leading-relaxed text-[#5f5e5e]">
                Use the code exactly as provided. Spaces are ignored and letters
                are automatically uppercased.
              </p>
            </div>

            {error && (
              <div className="mb-6 border-l-2 border-[#ba1a1a] bg-[#ffdad6] px-4 py-3 text-sm font-medium text-[#410002]">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-6 border-l-2 border-black bg-[#e2e2e2] px-4 py-3 text-sm font-medium text-black">
                {success}
              </div>
            )}

            {loading && !error && !success && (
              <div className="mb-6 flex items-center gap-3 border-l-2 border-black bg-[#f3f3f3] px-4 py-3 text-sm font-medium text-black">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#c8c6c6] border-t-black" />
                Enrolling...
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#474747]">
                  Course Code
                </label>

                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full border-0 border-b border-[#777777]/20 bg-[#f3f3f3] px-4 py-4 font-mono text-xl font-black uppercase tracking-[0.25em] text-black placeholder:text-[#acabab] focus:border-black focus:bg-[#e2e2e2] focus:outline-none focus:ring-0"
                  placeholder="XXXX-XXXX"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-3 bg-black py-4 text-sm font-bold uppercase tracking-widest text-white transition-all hover:bg-[#3b3b3b] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Enrolling...' : 'Enroll Course'}
                <span className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </button>
            </form>

            <div className="mt-8 border-t border-[#eeeeee] pt-6">
              <p className="text-xs leading-relaxed text-[#777777]">
                No code? Ask your lecturer for the enrollment code. Don&apos;t
                brute force random codes — that is just wasting time and will
                make debugging harder.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function EnrollPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-[#f9f9f9] text-[#1a1c1c]">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#d6d4d3] border-t-black" />
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#777777]">
              Loading Enroll Page
            </p>
          </div>
        </div>
      }
    >
      <EnrollForm />
    </Suspense>
  );
}