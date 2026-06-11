'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store/auth';
import api from '@/lib/axios';
import Link from 'next/link';
import SurfacePanel from '@/components/dashboard/SurfacePanel';

type EnrollStatus = 'loading' | 'success' | 'error' | 'not_student';

function getStatusContent(
  status: EnrollStatus,
  message: string,
  courseName: string,
  role?: string | null
) {
  if (status === 'success') {
    return {
      icon: 'check',
      eyebrow: 'Enrollment Complete',
      title: 'Course joined.',
      description: `You have successfully joined ${courseName}.`,
      tone: 'success' as const,
    };
  }

  if (status === 'not_student') {
    return {
      icon: 'block',
      eyebrow: 'Access Denied',
      title: 'Student access only.',
      description: `Only students can enroll in courses. You are currently signed in as a ${
        role ?? 'member'
      }.`,
      tone: 'danger' as const,
    };
  }

  if (status === 'error') {
    return {
      icon: 'close',
      eyebrow: 'Enrollment Failed',
      title: 'Could not join course.',
      description: message || 'The enrollment request could not be completed.',
      tone: 'danger' as const,
    };
  }

  return {
    icon: 'progress_activity',
    eyebrow: 'Enrollment Gateway',
    title: 'Joining course.',
    description: 'Lectra is validating the invitation code.',
    tone: 'neutral' as const,
  };
}

export default function EnrollCodePage() {
  const { code } = useParams<{ code: string }>();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<EnrollStatus>('loading');
  const [message, setMessage] = useState('');
  const [courseName, setCourseName] = useState('');
  const router = useRouter();

  const normalizedCode = code?.toUpperCase();

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      sessionStorage.setItem('post_login_redirect', `/enroll/${code}`);
      router.push('/login');
      return;
    }

    if (user.role !== 'student') {
      setStatus('not_student');
      return;
    }

    const enroll = async () => {
      try {
        const res = await api.post('/enroll', {
          code: normalizedCode,
        });

        setCourseName(res.data.course.name);
        setStatus('success');

      } catch (err: any) {
        setMessage(err.response?.data?.message || 'Failed to enroll.');
        setStatus('error');
      }
    };

    enroll();
  }, [user, authLoading, code, normalizedCode, router]);

  const content = getStatusContent(
    status,
    message,
    courseName,
    user?.role
  );

  if (status === 'loading') {
    return (
      <div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center">
        <SurfacePanel tone="lowest" className="w-full max-w-xl text-center">
          <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center bg-[#eeeeee]">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-black/20 border-t-black" />
          </div>

          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.34em] text-[#777777]">
            Enrollment Gateway
          </p>

          <h1 className="text-4xl font-black leading-[0.95] tracking-[-0.055em] text-black md:text-5xl">
            Joining course.
          </h1>

          <p className="mx-auto mt-5 max-w-md text-sm font-medium leading-7 text-[#5e5e5e]">
            Lectra is validating code{' '}
            <span className="font-mono font-black tracking-widest text-black">
              {normalizedCode}
            </span>{' '}
            and attaching the course to your workspace.
          </p>
        </SurfacePanel>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center">
      <div className="grid w-full max-w-5xl gap-4 lg:grid-cols-12">
        <SurfacePanel
          tone={content.tone === 'danger' ? 'inverse' : 'low'}
          className="lg:col-span-5"
        >
          <div className="flex min-h-[360px] flex-col justify-between">
            <div>
              <div
                className={`mb-8 flex h-16 w-16 items-center justify-center ${
                  content.tone === 'danger'
                    ? 'bg-white/10 text-white'
                    : 'bg-white text-black'
                }`}
              >
                <span className="material-symbols-outlined text-[34px]">
                  {content.icon}
                </span>
              </div>

              <p
                className={`mb-4 text-[10px] font-bold uppercase tracking-[0.34em] ${
                  content.tone === 'danger'
                    ? 'text-white/45'
                    : 'text-[#777777]'
                }`}
              >
                {content.eyebrow}
              </p>

              <h1
                className={`text-4xl font-black leading-[0.95] tracking-[-0.055em] md:text-5xl ${
                  content.tone === 'danger' ? 'text-white' : 'text-black'
                }`}
              >
                {content.title}
              </h1>
            </div>

            <p
              className={`mt-10 text-sm font-medium leading-7 ${
                content.tone === 'danger' ? 'text-white/60' : 'text-[#5e5e5e]'
              }`}
            >
              Course enrollment connects your account to the correct learning
              workspace.
            </p>
          </div>
        </SurfacePanel>

        <SurfacePanel tone="lowest" className="lg:col-span-7">
          <div className="flex min-h-[360px] flex-col justify-between">
            <div>
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.34em] text-[#777777]">
                Enrollment Result
              </p>

              <h2 className="max-w-xl text-3xl font-black tracking-[-0.045em] text-black">
                {content.description}
              </h2>

              <div className="mt-8 space-y-2">
                <div className="flex items-center justify-between bg-[#f3f3f3] px-4 py-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#777777]">
                    Code
                  </span>
                  <span className="font-mono text-sm font-black text-black">
                    {normalizedCode}
                  </span>
                </div>

                <div className="flex items-center justify-between bg-[#f3f3f3] px-4 py-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#777777]">
                    Status
                  </span>
                  <span className="text-sm font-black capitalize text-black">
                    {status.replace('_', ' ')}
                  </span>
                </div>

                {user && (
                  <div className="flex items-center justify-between bg-[#f3f3f3] px-4 py-3">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#777777]">
                      Account
                    </span>
                    <span className="max-w-[12rem] truncate text-sm font-black text-black">
                      {user.name}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              {status === 'success' ? (
                <Link
                  href="/courses"
                  className="inline-flex justify-center bg-[linear-gradient(135deg,_#000000,_#3b3b3b)] px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,_#1a1c1c,_#5e5e5e)] active:translate-y-0"
                >
                  Open Courses
                </Link>
              ) : (
                <Link
                  href="/enroll"
                  className="inline-flex justify-center bg-[linear-gradient(135deg,_#000000,_#3b3b3b)] px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,_#1a1c1c,_#5e5e5e)] active:translate-y-0"
                >
                  Try Again
                </Link>
              )}

              <Link
                href="/dashboard"
                className="inline-flex justify-center bg-[#eeeeee] px-5 py-3 text-xs font-black uppercase tracking-widest text-black transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#e2e2e2] active:translate-y-0"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </SurfacePanel>
      </div>
    </div>
  );
}