'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store/auth';
import api from '@/lib/axios';
import Link from 'next/link';

export default function EnrollCodePage() {
  const { code } = useParams<{ code: string }>();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<
    'loading' | 'success' | 'error' | 'not_student'
  >('loading');
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

  const normalizedCode = code?.toUpperCase();

  if (status === 'loading') {
    return (
      <main className="min-h-dvh bg-[#f9f9f9] px-6 py-8 text-[#1a1c1c]">
        <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-xl items-center justify-center">
          <div className="w-full rounded-xl bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#f3f3f3]">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#d6d4d3] border-t-black" />
            </div>

            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-[#777777]">
              Enrollment Gateway
            </p>

            <h1 className="mb-3 text-3xl font-black tracking-tight text-black">
              Joining course...
            </h1>

            <p className="mx-auto max-w-sm text-sm leading-relaxed text-[#5f5e5e]">
              Lectra is validating code{' '}
              <span className="font-mono font-black tracking-widest text-black">
                {normalizedCode}
              </span>{' '}
              and attaching the course to your workspace.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (status === 'not_student') {
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
                {user?.role}
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

  if (status === 'success') {
    return (
      <main className="min-h-dvh bg-[#f9f9f9] px-6 py-8 text-[#1a1c1c]">
        <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-xl items-center justify-center">
          <div className="w-full rounded-xl bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#e2e2e2] text-black">
              <span className="material-symbols-outlined text-3xl">
                check
              </span>
            </div>

            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-[#777777]">
              Enrollment Complete
            </p>

            <h1 className="mb-3 text-3xl font-black tracking-tight text-black">
              Course joined.
            </h1>

            <p className="mx-auto mb-4 max-w-sm text-sm leading-relaxed text-[#5f5e5e]">
              You have successfully joined{' '}
              <span className="font-bold text-black">{courseName}</span>.
            </p>

            <p className="text-[10px] font-bold uppercase tracking-widest text-[#acabab]">
              Redirecting to courses...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[#f9f9f9] px-6 py-8 text-[#1a1c1c]">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-xl items-center justify-center">
        <div className="w-full rounded-xl bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#ffdad6] text-[#410002]">
            <span className="material-symbols-outlined text-3xl">close</span>
          </div>

          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-[#ba1a1a]">
            Enrollment Failed
          </p>

          <h1 className="mb-3 text-3xl font-black tracking-tight text-black">
            Could not join course.
          </h1>

          <p className="mx-auto mb-8 max-w-sm text-sm leading-relaxed text-[#5f5e5e]">
            {message}
          </p>

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/enroll"
              className="inline-flex items-center justify-center bg-black px-5 py-3 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#3b3b3b]"
            >
              Try Again
            </Link>

            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center bg-[#f3f3f3] px-5 py-3 text-xs font-bold uppercase tracking-widest text-[#474747] transition-colors hover:bg-[#e2e2e2] hover:text-black"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}