'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/store/auth';
import api from '@/lib/axios';
import Link from 'next/link';
import PageHeader from '@/components/dashboard/PageHeader';
import SurfacePanel from '@/components/dashboard/SurfacePanel';
import EmptyState from '@/components/dashboard/EmptyState';

const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface Schedule {
  id: string;
  course_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  course: {
    id: string;
    name: string;
    code: string;
  };
}

function formatTime(time: string) {
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;

  return `${hour12}:${m} ${ampm}`;
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getTodayIndex() {
  const today = new Date().getDay();

  return today === 0 ? 6 : today - 1;
}

export default function SchedulePage() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  const todayIndex = getTodayIndex();

  useEffect(() => {
    api
      .get('/schedule/weekly')
      .then((res) => setSchedules(res.data))
      .finally(() => setLoading(false));
  }, []);

  const byDay = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) =>
        schedules
          .filter((s) => s.day_of_week === i)
          .sort((a, b) => a.start_time.localeCompare(b.start_time))
      ),
    [schedules]
  );

  const todaySchedules = byDay[todayIndex] ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Weekly Rhythm"
        title="Weekly schedule."
        description={`Today is ${formatDate()}. Review your course rhythm across the week without visual noise.`}
        action={
          <Link
            href="/courses"
            className="inline-flex bg-[#e2e2e2] px-5 py-3 text-xs font-black uppercase tracking-widest text-black transition hover:bg-[#d6d4d3]"
          >
            Course Spaces
          </Link>
        }
      />

      {loading ? (
        <SurfacePanel tone="lowest">
          <div className="flex min-h-[260px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-5 h-8 w-8 animate-spin rounded-full border-2 border-black/20 border-t-black" />
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#777777]">
                Loading Schedule
              </p>
            </div>
          </div>
        </SurfacePanel>
      ) : schedules.length === 0 ? (
        <EmptyState
          title="No weekly schedule yet."
          description={
            user?.role === 'lecturer'
              ? 'Schedules can be configured from each course workspace. Once created, the weekly rhythm will appear here.'
              : 'Your enrolled course schedules will appear here once configured by your lecturer.'
          }
          href={user?.role === 'lecturer' ? '/courses' : undefined}
          actionLabel={user?.role === 'lecturer' ? 'Open Courses' : undefined}
        />
      ) : (
        <>
          <div className="mb-4 grid gap-4 lg:grid-cols-12">
            <SurfacePanel tone="inverse" className="lg:col-span-7">
              <div className="flex min-h-[220px] flex-col justify-between">
                <div>
                  <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.34em] text-white/45">
                    Today&apos;s Focus
                  </p>

                  <h2 className="max-w-2xl text-4xl font-black leading-[0.98] tracking-[-0.055em] text-white md:text-5xl">
                    {todaySchedules.length > 0
                      ? `${todaySchedules.length} scheduled course${
                          todaySchedules.length > 1 ? 's' : ''
                        } today.`
                      : 'No scheduled class today.'}
                  </h2>
                </div>

                <div className="mt-10 space-y-2">
                  {todaySchedules.length === 0 ? (
                    <div className="bg-white/8 px-4 py-4">
                      <p className="text-sm font-medium text-white/60">
                        Use the quiet space to review assignments, course
                        notes, or upcoming sessions.
                      </p>
                    </div>
                  ) : (
                    todaySchedules.map((s) => (
                      <Link
                        key={s.id}
                        href={`/courses/${s.course_id}`}
                        className="grid gap-3 bg-white/8 px-4 py-4 transition hover:bg-white/12 sm:grid-cols-[1fr_auto] sm:items-center"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-white">
                            {s.course.name}
                          </p>
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                            {s.course.code}
                          </p>
                        </div>

                        <p className="text-xs font-bold uppercase tracking-widest text-white/55">
                          {formatTime(s.start_time)} —{' '}
                          {formatTime(s.end_time)}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </SurfacePanel>

            <SurfacePanel tone="low" className="lg:col-span-5">
              <div className="flex h-full min-h-[220px] flex-col justify-between">
                <div>
                  <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.34em] text-[#777777]">
                    Schedule Summary
                  </p>

                  <h3 className="text-3xl font-black tracking-[-0.05em] text-black">
                    {schedules.length} weekly block
                    {schedules.length > 1 ? 's' : ''}.
                  </h3>

                  <p className="mt-4 text-sm font-medium leading-6 text-[#5e5e5e]">
                    Course time is grouped by day so sessions stay predictable
                    and easy to scan.
                  </p>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-2">
                  <div className="bg-white px-4 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#777777]">
                      Role
                    </p>
                    <p className="mt-2 text-sm font-black capitalize text-black">
                      {user?.role ?? 'member'}
                    </p>
                  </div>

                  <div className="bg-white px-4 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#777777]">
                      Today
                    </p>
                    <p className="mt-2 text-sm font-black text-black">
                      {todaySchedules.length}
                    </p>
                  </div>
                </div>
              </div>
            </SurfacePanel>
          </div>

          {/* Mobile agenda */}
          <section className="space-y-3 md:hidden">
            {DAYS.map((day, i) => {
              const isToday = i === todayIndex;
              const items = byDay[i];

              return (
                <SurfacePanel
                  key={day}
                  tone={isToday ? 'inverse' : 'lowest'}
                  className="px-5 py-5"
                >
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                      <p
                        className={`text-[10px] font-bold uppercase tracking-[0.24em] ${
                          isToday ? 'text-white/45' : 'text-[#777777]'
                        }`}
                      >
                        {isToday ? 'Today' : `Day ${i + 1}`}
                      </p>

                      <h3
                        className={`mt-1 text-xl font-black tracking-[-0.04em] ${
                          isToday ? 'text-white' : 'text-black'
                        }`}
                      >
                        {day}
                      </h3>
                    </div>

                    <span
                      className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
                        isToday
                          ? 'bg-white/12 text-white'
                          : 'bg-[#eeeeee] text-[#474747]'
                      }`}
                    >
                      {items.length} block{items.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {items.length === 0 ? (
                    <p
                      className={`text-sm font-medium ${
                        isToday ? 'text-white/50' : 'text-[#999999]'
                      }`}
                    >
                      No class scheduled.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {items.map((s) => (
                        <Link
                          key={s.id}
                          href={`/courses/${s.course_id}`}
                          className={`block px-4 py-4 transition ${
                            isToday
                              ? 'bg-white/8 hover:bg-white/12'
                              : 'bg-[#f3f3f3] hover:bg-[#eeeeee]'
                          }`}
                        >
                          <p
                            className={`truncate text-sm font-black ${
                              isToday ? 'text-white' : 'text-black'
                            }`}
                          >
                            {s.course.name}
                          </p>

                          <div className="mt-2 flex items-center justify-between gap-4">
                            <p
                              className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
                                isToday ? 'text-white/40' : 'text-[#777777]'
                              }`}
                            >
                              {s.course.code}
                            </p>

                            <p
                              className={`shrink-0 text-xs font-bold ${
                                isToday ? 'text-white/55' : 'text-[#5e5e5e]'
                              }`}
                            >
                              {formatTime(s.start_time)} —{' '}
                              {formatTime(s.end_time)}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </SurfacePanel>
              );
            })}
          </section>

          {/* Desktop weekly grid */}
          <section className="hidden grid-cols-7 gap-3 md:grid">
            {DAYS.map((day, i) => {
              const isToday = i === todayIndex;
              const items = byDay[i];

              return (
                <div
                  key={day}
                  className={`min-h-[420px] px-3 py-4 ${
                    isToday
                      ? 'bg-[#2f3131] text-white'
                      : 'bg-white text-[#1a1c1c]'
                  }`}
                >
                  <div className="mb-5 text-center">
                    <p
                      className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                        isToday ? 'text-white/45' : 'text-[#777777]'
                      }`}
                    >
                      {DAYS_SHORT[i]}
                    </p>

                    <h3
                      className={`mt-1 text-sm font-black ${
                        isToday ? 'text-white' : 'text-black'
                      }`}
                    >
                      {isToday ? 'Today' : day}
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {items.length === 0 ? (
                      <div
                        className={`px-3 py-6 text-center text-xs font-medium ${
                          isToday ? 'bg-white/8 text-white/35' : 'bg-[#f3f3f3] text-[#999999]'
                        }`}
                      >
                        —
                      </div>
                    ) : (
                      items.map((s) => (
                        <Link
                          key={s.id}
                          href={`/courses/${s.course_id}`}
                          className={`block px-3 py-3 transition ${
                            isToday
                              ? 'bg-white/8 hover:bg-white/12'
                              : 'bg-[#f3f3f3] hover:bg-[#eeeeee]'
                          }`}
                        >
                          <p
                            className={`truncate text-xs font-black ${
                              isToday ? 'text-white' : 'text-black'
                            }`}
                          >
                            {s.course.name}
                          </p>

                          <p
                            className={`mt-1 truncate text-[10px] font-bold uppercase tracking-[0.18em] ${
                              isToday ? 'text-white/40' : 'text-[#777777]'
                            }`}
                          >
                            {s.course.code}
                          </p>

                          <p
                            className={`mt-3 text-[11px] font-bold ${
                              isToday ? 'text-white/55' : 'text-[#5e5e5e]'
                            }`}
                          >
                            {formatTime(s.start_time)}
                          </p>

                          <p
                            className={`text-[11px] font-medium ${
                              isToday ? 'text-white/35' : 'text-[#999999]'
                            }`}
                          >
                            — {formatTime(s.end_time)}
                          </p>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        </>
      )}
    </>
  );
}