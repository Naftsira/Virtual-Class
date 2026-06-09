'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store/auth';
import api from '@/lib/axios';
import Link from 'next/link';

type GateStatus =
  | 'checking'
  | 'allowed'
  | 'unauthorized'
  | 'not_enrolled'
  | 'not_found'
  | 'banned';

type GateType = 'course' | 'session';

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

        const enrolled = coursesRes.data.find(
          (c: any) => c.id === course.id
        );

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">
            {status === 'allowed' ? 'Redirecting...' : 'Checking access...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl border p-8 max-w-sm w-full text-center">
        <div className="text-5xl mb-4">
          {status === 'unauthorized'
            ? '🚫'
            : status === 'not_enrolled'
            ? '📋'
            : status === 'banned'
            ? '🔨'
            : '❓'}
        </div>

        <h1 className="text-xl font-bold mb-2">
          {status === 'unauthorized'
            ? 'Access Denied'
            : status === 'not_enrolled'
            ? 'Not Enrolled'
            : status === 'banned'
            ? 'You are Banned'
            : 'Not Found'}
        </h1>

        <p className="text-gray-500 text-sm mb-6">{message}</p>

        <Link
          href="/dashboard"
          className="bg-black text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition inline-block"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}