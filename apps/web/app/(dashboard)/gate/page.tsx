'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store/auth';
import api from '@/lib/axios';
import Link from 'next/link';
import SurfacePanel from '@/components/dashboard/SurfacePanel';

type GateStatus =
  | 'checking'
  | 'allowed'
  | 'unauthorized'
  | 'not_enrolled'
  | 'not_found'
  | 'banned';

type GateType = 'course' | 'session';

function getStatusContent(status: GateStatus, message: string) {
  if (status === 'unauthorized') {
    return {
      icon: 'lock',
      eyebrow: 'Access Denied',
      title: 'Access cannot be granted.',
      description:
        message || 'You do not have permission to open this workspace.',
      tone: 'danger' as const,
    };
  }

  if (status === 'not_enrolled') {
    return {
      icon: 'school',
      eyebrow: 'Enrollment Required',
      title: 'You are not enrolled.',
      description:
        message || 'This course is not attached to your current account.',
      tone: 'neutral' as const,
    };
  }

  if (status === 'banned') {
    return {
      icon: 'block',
      eyebrow: 'Session Restricted',
      title: 'You cannot rejoin this session.',
      description:
        message || 'Your access to this live session has been restricted.',
      tone: 'danger' as const,
    };
  }

  return {
    icon: 'error',
    eyebrow: 'Resource Unavailable',
    title: 'Workspace not found.',
    description:
      message || 'The requested course or session could not be verified.',
    tone: 'neutral' as const,
  };
}

export default function GatePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [status, setStatus] = useState<GateStatus>('checking');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (authLoading || !user) return;

    const currentUser = user;

    const clearGatePayload = () => {
      sessionStorage.removeItem('gate_type');
      sessionStorage.removeItem('gate_access_id');
      sessionStorage.removeItem('gate_destination');
    };

    const allowCourseAccess = (courseId: string, destination: string) => {
      setStatus('allowed');

      sessionStorage.setItem(`gate_passed_course_${courseId}`, '1');
      clearGatePayload();

      router.replace(destination);
    };

    const allowSessionAccess = (
      sessionId: string,
      courseId: string,
      destination: string
    ) => {
      setStatus('allowed');

      sessionStorage.setItem(`gate_passed_session_${sessionId}`, '1');
      sessionStorage.setItem(`gate_passed_course_${courseId}`, '1');
      clearGatePayload();

      router.replace(destination);
    };

    const checkCourseAccess = async (
      courseId: string,
      destination: string
    ) => {
      const courseRes = await api.get(`/courses/${courseId}`);
      const course = courseRes.data;

      if (currentUser.role === 'lecturer') {
        if (course.lecturer_id !== currentUser.id) {
          setMessage('You are not the owner of this course.');
          setStatus('unauthorized');
          return;
        }
      }

      if (currentUser.role === 'student') {
        const coursesRes = await api.get('/courses');

        const enrolled = coursesRes.data.find((c: any) => c.id === course.id);

        if (!enrolled) {
          setMessage('You are not enrolled in this course.');
          setStatus('not_enrolled');
          return;
        }
      }

      allowCourseAccess(courseId, destination);
    };

    const checkSessionAccess = async (
      sessionId: string,
      destination: string
    ) => {
      const sessionRes = await api.get(`/sessions/${sessionId}`);
      const session = sessionRes.data;

      const courseRes = await api.get(`/courses/${session.course_id}`);
      const course = courseRes.data;

      if (currentUser.role === 'lecturer') {
        if (course.lecturer_id !== currentUser.id) {
          setMessage('You are not the owner of this course.');
          setStatus('unauthorized');
          return;
        }
      }

      if (currentUser.role === 'student') {
        const coursesRes = await api.get('/courses');

        const enrolled = coursesRes.data.find(
          (c: any) => c.id === session.course_id
        );

        if (!enrolled) {
          setMessage('You are not enrolled in this course.');
          setStatus('not_enrolled');
          return;
        }

        const banRes = await api.get(`/sessions/${sessionId}/ban-status`);

        if (banRes.data.banned) {
          setMessage('You have been banned from this session.');
          setStatus('banned');
          return;
        }
      }

      allowSessionAccess(sessionId, session.course_id, destination);
    };

    const check = async () => {
      const gateType = sessionStorage.getItem('gate_type') as GateType | null;
      const accessId = sessionStorage.getItem('gate_access_id');
      const destination = sessionStorage.getItem('gate_destination');

      if (!gateType || !accessId || !destination) {
        setMessage('Missing gate data.');
        setStatus('not_found');
        return;
      }

      if (gateType !== 'course' && gateType !== 'session') {
        setMessage('Invalid gate type.');
        setStatus('not_found');
        return;
      }

      if (!destination.startsWith('/') || destination.startsWith('//')) {
        setMessage('Invalid destination.');
        setStatus('not_found');
        return;
      }

      try {
        if (gateType === 'course') {
          await checkCourseAccess(accessId, destination);
          return;
        }

        if (gateType === 'session') {
          await checkSessionAccess(accessId, destination);
          return;
        }
      } catch (err: any) {
        console.error('Gate check error:', err);
        console.error('Response:', err?.response?.data);
        console.error('Status:', err?.response?.status);

        setStatus('not_found');
        setMessage(
          err?.response?.data?.message ??
            'Resource not found or access denied.'
        );
      }
    };

    check();
  }, [authLoading, user, router]);

  if (status === 'checking' || status === 'allowed') {
    return (
      <div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center">
        <SurfacePanel tone="lowest" className="w-full max-w-xl text-center">
          <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center bg-[#eeeeee]">
            {status === 'allowed' ? (
              <span className="material-symbols-outlined text-[32px] text-black">
                verified_user
              </span>
            ) : (
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-black/20 border-t-black" />
            )}
          </div>

          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.34em] text-[#777777]">
            {status === 'allowed' ? 'Access Granted' : 'Access Checkpoint'}
          </p>

          <h1 className="text-4xl font-black leading-[0.95] tracking-[-0.055em] text-black md:text-5xl">
            {status === 'allowed'
              ? 'Opening workspace.'
              : 'Verifying workspace access.'}
          </h1>

          <p className="mx-auto mt-5 max-w-md text-sm font-medium leading-7 text-[#5e5e5e]">
            {status === 'allowed'
              ? 'Your permission has been confirmed. Redirecting to the requested workspace.'
              : 'Lectra is checking course membership, session ownership, and access restrictions.'}
          </p>
        </SurfacePanel>
      </div>
    );
  }

  const content = getStatusContent(status, message);

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
              The access gate prevents unauthorized entry into course and
              session workspaces.
            </p>
          </div>
        </SurfacePanel>

        <SurfacePanel tone="lowest" className="lg:col-span-7">
          <div className="flex min-h-[360px] flex-col justify-between">
            <div>
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.34em] text-[#777777]">
                Verification Result
              </p>

              <h2 className="max-w-xl text-3xl font-black tracking-[-0.045em] text-black">
                {content.description}
              </h2>

              <div className="mt-8 space-y-2">
                <div className="flex items-center justify-between bg-[#f3f3f3] px-4 py-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#777777]">
                    Status
                  </span>
                  <span className="text-sm font-black capitalize text-black">
                    {status.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center justify-between bg-[#f3f3f3] px-4 py-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#777777]">
                    Account
                  </span>
                  <span className="max-w-[12rem] truncate text-sm font-black text-black">
                    {user?.name ?? 'Lectra User'}
                  </span>
                </div>

                <div className="flex items-center justify-between bg-[#f3f3f3] px-4 py-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#777777]">
                    Role
                  </span>
                  <span className="text-sm font-black capitalize text-black">
                    {user?.role ?? 'member'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex justify-center bg-[linear-gradient(135deg,_#000000,_#3b3b3b)] px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:opacity-90"
              >
                Back to Dashboard
              </Link>

              <Link
                href="/courses"
                className="inline-flex justify-center bg-[#eeeeee] px-5 py-3 text-xs font-black uppercase tracking-widest text-black transition hover:bg-[#e2e2e2]"
              >
                Open Courses
              </Link>
            </div>
          </div>
        </SurfacePanel>
      </div>
    </div>
  );
}