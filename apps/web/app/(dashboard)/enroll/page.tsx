'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store/auth';
import api from '@/lib/axios';
import Link from 'next/link';
import PageHeader from '@/components/dashboard/PageHeader';
import SurfacePanel from '@/components/dashboard/SurfacePanel';

export default function EnrollPage() {
  const { user, loading: authLoading } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

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

        setTimeout(() => {
          router.push('/courses');
        }, 1500);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to enroll.');
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleEnroll(code);
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center">
        <SurfacePanel tone="lowest" className="w-full max-w-md text-center">
          <div className="mx-auto mb-5 h-8 w-8 animate-spin rounded-full border-2 border-black/20 border-t-black" />
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#777777]">
            Checking Access
          </p>
        </SurfacePanel>
      </div>
    );
  }

  if (user.role !== 'student') {
    return (
      <div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center">
        <div className="grid w-full max-w-5xl gap-4 lg:grid-cols-12">
          <SurfacePanel tone="inverse" className="lg:col-span-5">
            <div className="flex min-h-[360px] flex-col justify-between">
              <div>
                <div className="mb-8 flex h-16 w-16 items-center justify-center bg-white/10 text-white">
                  <span className="material-symbols-outlined text-[34px]">
                    block
                  </span>
                </div>

                <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.34em] text-white/45">
                  Access Denied
                </p>

                <h1 className="text-4xl font-black leading-[0.95] tracking-[-0.055em] text-white md:text-5xl">
                  Student access only.
                </h1>
              </div>

              <p className="mt-10 text-sm font-medium leading-7 text-white/60">
                Course enrollment is restricted to student accounts.
              </p>
            </div>
          </SurfacePanel>

          <SurfacePanel tone="lowest" className="lg:col-span-7">
            <div className="flex min-h-[360px] flex-col justify-between">
              <div>
                <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.34em] text-[#777777]">
                  Current Account
                </p>

                <h2 className="max-w-xl text-3xl font-black tracking-[-0.045em] text-black">
                  You are currently signed in as a{' '}
                  <span className="capitalize">{user.role}</span>.
                </h2>

                <p className="mt-5 max-w-xl text-sm font-medium leading-7 text-[#5e5e5e]">
                  Lecturers manage course spaces directly from the Courses
                  workspace. Students use this gateway to attach a course to
                  their account.
                </p>
              </div>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/dashboard"
                  className="inline-flex justify-center bg-[linear-gradient(135deg,_#000000,_#3b3b3b)] px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,_#1a1c1c,_#5e5e5e)] active:translate-y-0"
                >
                  Dashboard
                </Link>

                <Link
                  href="/courses"
                  className="inline-flex justify-center bg-[#eeeeee] px-5 py-3 text-xs font-black uppercase tracking-widest text-black transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#e2e2e2] active:translate-y-0"
                >
                  Courses
                </Link>
              </div>
            </div>
          </SurfacePanel>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Course Access"
        title="Join your next classroom."
        description="Enter the enrollment code given by your lecturer. If valid, Lectra will attach the course to your workspace."
        action={
          <Link
            href="/courses"
            className="inline-flex bg-[#e2e2e2] px-5 py-3 text-xs font-black uppercase tracking-widest text-black transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#d6d4d3] active:translate-y-0"
          >
            Course Spaces
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-12">
        <SurfacePanel tone="inverse" className="lg:col-span-7">
          <div className="flex min-h-[440px] flex-col justify-between">
            <div>
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.34em] text-white/45">
                Enrollment Gateway
              </p>

              <h2 className="max-w-2xl text-4xl font-black leading-[0.98] tracking-[-0.055em] text-white md:text-5xl">
                Attach a course to your learning workspace.
              </h2>

              <p className="mt-5 max-w-xl text-sm font-medium leading-7 text-white/60">
                Enrollment codes are issued by lecturers. Once accepted, the
                course becomes available in your Courses workspace.
              </p>
            </div>

            <div className="mt-10 grid gap-2 sm:grid-cols-3">
              <div className="bg-white/8 px-4 py-4">
                <span className="material-symbols-outlined mb-4 block text-[22px] text-white/45">
                  password
                </span>
                <h3 className="text-sm font-black text-white">Code Based</h3>
                <p className="mt-2 text-xs font-medium leading-5 text-white/45">
                  Access is controlled by lecturer-issued codes.
                </p>
              </div>

              <div className="bg-white/8 px-4 py-4">
                <span className="material-symbols-outlined mb-4 block text-[22px] text-white/45">
                  verified_user
                </span>
                <h3 className="text-sm font-black text-white">Student Only</h3>
                <p className="mt-2 text-xs font-medium leading-5 text-white/45">
                  Enrollment is restricted to student accounts.
                </p>
              </div>

              <div className="bg-white/8 px-4 py-4">
                <span className="material-symbols-outlined mb-4 block text-[22px] text-white/45">
                  school
                </span>
                <h3 className="text-sm font-black text-white">Course Ready</h3>
                <p className="mt-2 text-xs font-medium leading-5 text-white/45">
                  Successful access redirects you to courses.
                </p>
              </div>
            </div>
          </div>
        </SurfacePanel>

        <SurfacePanel tone="lowest" className="lg:col-span-5">
          <div className="mb-8">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.34em] text-[#777777]">
              Enrollment Form
            </p>

            <h2 className="text-3xl font-black tracking-[-0.045em] text-black">
              Enter course code.
            </h2>

            <p className="mt-3 text-sm font-medium leading-6 text-[#5e5e5e]">
              Spaces are ignored and letters are automatically uppercased.
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-[#ffdad6] px-4 py-3 text-sm font-bold text-[#410002]">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 bg-[#e2e2e2] px-4 py-3 text-sm font-bold text-black">
              {success}
            </div>
          )}

          {loading && !error && !success && (
            <div className="mb-6 flex items-center gap-3 bg-[#f3f3f3] px-4 py-3 text-sm font-bold text-black">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
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
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setError('');
                  setSuccess('');
                }}
                className="w-full border-0 border-b border-[#777777]/20 bg-[#f3f3f3] px-4 py-4 font-mono text-xl font-black uppercase tracking-[0.25em] text-black placeholder:text-[#acabab] focus:border-black focus:bg-[#e2e2e2] focus:outline-none focus:ring-0"
                placeholder="XXXX-XXXX"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group flex w-full items-center justify-center gap-3 bg-[linear-gradient(135deg,_#000000,_#3b3b3b)] py-4 text-sm font-black uppercase tracking-widest text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,_#1a1c1c,_#5e5e5e)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Enrolling...' : 'Enroll Course'}
              <span className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </button>
          </form>

          <div className="mt-8 bg-[#f3f3f3] px-4 py-4">
            <p className="text-xs font-medium leading-6 text-[#777777]">
              No code? Ask your lecturer for the enrollment code. Do not brute
              force random codes; it only makes debugging harder.
            </p>
          </div>
        </SurfacePanel>
      </div>
    </>
  );
}