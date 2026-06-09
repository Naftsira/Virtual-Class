'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store/auth';
import PageHeader from '@/components/dashboard/PageHeader';
import SurfacePanel from '@/components/dashboard/SurfacePanel';
import StatusBadge from '@/components/dashboard/StatusBadge';

type ModuleCard = {
  label: string;
  href: string;
  desc: string;
  meta: string;
};

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-sm font-medium text-[#777777]">
          Loading workspace...
        </p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const firstName = user.name?.split(' ')[0] ?? 'there';
  const isLecturer = user.role === 'lecturer';

  const lecturerCards: ModuleCard[] = [
    {
      label: 'Courses',
      href: '/courses',
      desc: 'Manage course spaces, enrollment, sessions, and assignments.',
      meta: 'Course Control',
    },
    {
      label: 'Sessions',
      href: '/courses',
      desc: 'Open live classroom sessions from your course workspace.',
      meta: 'Live Learning',
    },
    {
      label: 'Assignments',
      href: '/courses',
      desc: 'Create, monitor, and organize course assignments.',
      meta: 'Assessment',
    },
    {
      label: 'Schedule',
      href: '/schedule',
      desc: 'Review weekly teaching rhythm and active course blocks.',
      meta: 'Time Structure',
    },
  ];

  const studentCards: ModuleCard[] = [
    {
      label: 'My Courses',
      href: '/courses',
      desc: 'Enter enrolled course spaces and continue classroom work.',
      meta: 'Learning Space',
    },
    {
      label: 'Assignments',
      href: '/courses',
      desc: 'Review upcoming tasks and submit your course work.',
      meta: 'Submission',
    },
    {
      label: 'Schedule',
      href: '/schedule',
      desc: 'See your weekly learning rhythm and class agenda.',
      meta: 'Time Structure',
    },
    {
      label: 'Join Course',
      href: '/enroll',
      desc: 'Use an enrollment code or course invitation link.',
      meta: 'Enrollment',
    },
  ];

  const cards = isLecturer ? lecturerCards : studentCards;

  return (
    <>
      <PageHeader
        eyebrow="Workspace Overview"
        title={`${getGreeting()}, ${firstName}.`}
        description={
          isLecturer
            ? 'Manage your teaching workspace through calm, structured modules designed for courses, sessions, assignments, and schedules.'
            : 'Continue your learning workspace through courses, assignments, schedules, and guided classroom access.'
        }
        action={
          <Link
            href={isLecturer ? '/courses' : '/enroll'}
            className="inline-flex bg-[linear-gradient(135deg,_#000000,_#3b3b3b)] px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:opacity-90"
          >
            {isLecturer ? 'Manage Courses' : 'Join Course'}
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-12">
        <SurfacePanel tone="inverse" className="lg:col-span-7">
          <div className="flex min-h-[280px] flex-col justify-between">
            <div>
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.34em] text-white/45">
                Current Focus
              </p>

              <h3 className="max-w-xl text-4xl font-black leading-[0.98] tracking-[-0.055em] text-white md:text-5xl">
                {isLecturer
                  ? 'Shape the classroom before the session begins.'
                  : 'Enter the right course space with less friction.'}
              </h3>

              <p className="mt-5 max-w-lg text-sm font-medium leading-7 text-white/60">
                {isLecturer
                  ? 'Lectra keeps teaching actions close: course setup, live sessions, assignment flow, and weekly structure.'
                  : 'Lectra keeps learning actions focused: course entry, session access, assignment flow, and weekly rhythm.'}
              </p>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {cards.map((card) => (
                <Link
                  key={card.label}
                  href={card.href}
                  className="bg-white/8 px-4 py-4 transition hover:bg-white/12"
                >
                  <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
                    {card.meta}
                  </span>
                  <span className="mt-2 block text-sm font-black text-white">
                    {card.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </SurfacePanel>

        <SurfacePanel tone="low" className="lg:col-span-5">
          <div className="flex h-full min-h-[280px] flex-col justify-between">
            <div>
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.34em] text-[#777777]">
                Account State
              </p>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-black tracking-[-0.04em] text-black">
                    {user.name}
                  </h3>
                  <p className="mt-2 text-sm font-medium text-[#5e5e5e]">
                    {user.email ?? 'No email available'}
                  </p>
                </div>

                <StatusBadge variant="inverse">{user.role}</StatusBadge>
              </div>
            </div>

            <div className="mt-10 space-y-2">
              <Link
                href="/profile"
                className="flex items-center justify-between bg-white px-4 py-3 text-sm font-bold text-black transition hover:bg-[#e8e8e8]"
              >
                <span>Edit Profile</span>
                <span>→</span>
              </Link>

              <Link
                href="/schedule"
                className="flex items-center justify-between bg-white px-4 py-3 text-sm font-bold text-black transition hover:bg-[#e8e8e8]"
              >
                <span>View Schedule</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </SurfacePanel>
      </div>

      <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="group block">
            <SurfacePanel
              tone="lowest"
              className="min-h-[220px] transition group-hover:bg-[#f9f9f9]"
            >
              <div className="flex h-full flex-col justify-between">
                <div>
                  <p className="mb-5 text-[10px] font-black uppercase tracking-[0.28em] text-[#777777]">
                    {card.meta}
                  </p>

                  <h3 className="text-2xl font-black tracking-[-0.045em] text-black">
                    {card.label}
                  </h3>

                  <p className="mt-4 text-sm font-medium leading-6 text-[#5e5e5e]">
                    {card.desc}
                  </p>
                </div>

                <div className="mt-8 flex items-center justify-between text-xs font-black uppercase tracking-widest text-black">
                  <span>Open</span>
                  <span className="transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </div>
            </SurfacePanel>
          </Link>
        ))}
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <SurfacePanel tone="mid" className="lg:col-span-8">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.34em] text-[#777777]">
            System Principle
          </p>

          <h3 className="text-2xl font-black tracking-[-0.04em] text-black">
            Quiet interface, focused classroom.
          </h3>

          <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-[#5e5e5e]">
            Lectra prioritizes clarity over decoration. Course work, live
            sessions, and assignments stay visually calm so educational content
            remains the center of attention.
          </p>
        </SurfacePanel>

        <SurfacePanel tone="lowest" className="lg:col-span-4">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.34em] text-[#777777]">
            Workspace Mode
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between bg-[#f3f3f3] px-4 py-3">
              <span className="text-xs font-bold uppercase tracking-widest text-[#5e5e5e]">
                Role
              </span>
              <span className="text-sm font-black capitalize text-black">
                {user.role}
              </span>
            </div>

            <div className="flex items-center justify-between bg-[#f3f3f3] px-4 py-3">
              <span className="text-xs font-bold uppercase tracking-widest text-[#5e5e5e]">
                Modules
              </span>
              <span className="text-sm font-black text-black">
                {cards.length}
              </span>
            </div>

            <div className="flex items-center justify-between bg-[#f3f3f3] px-4 py-3">
              <span className="text-xs font-bold uppercase tracking-widest text-[#5e5e5e]">
                Access
              </span>
              <span className="text-sm font-black text-black">Active</span>
            </div>
          </div>
        </SurfacePanel>
      </div>
    </>
  );
}