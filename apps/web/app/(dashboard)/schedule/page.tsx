'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/store/auth';
import api from '@/lib/axios';
import Link from 'next/link';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
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

const COLORS = [
  'bg-indigo-100 text-indigo-700 border-indigo-200',
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-green-100 text-green-700 border-green-200',
  'bg-yellow-100 text-yellow-700 border-yellow-200',
  'bg-pink-100 text-pink-700 border-pink-200',
  'bg-purple-100 text-purple-700 border-purple-200',
  'bg-orange-100 text-orange-700 border-orange-200',
];

function formatTime(time: string) {
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

export default function SchedulePage() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().getDay(); // 0=Sunday
  // Convert to 0=Monday
  const todayIndex = today === 0 ? 6 : today - 1;

  useEffect(() => {
    api.get('/schedule/weekly')
      .then((res) => setSchedules(res.data))
      .finally(() => setLoading(false));
  }, []);

  // Group by course for color assignment
  const courseColors = new Map<string, string>();
  schedules.forEach((s) => {
    if (!courseColors.has(s.course_id)) {
      courseColors.set(s.course_id, COLORS[courseColors.size % COLORS.length]);
    }
  });

  // Group by day
  const byDay = Array.from({ length: 7 }, (_, i) =>
    schedules.filter((s) => s.day_of_week === i)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="font-bold tracking-tight">LECTRA</Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium">Schedule</span>
        </div>
        <span className="text-xs text-gray-400 capitalize">{user?.role}</span>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold mb-2">Weekly Schedule</h1>
        <p className="text-gray-500 text-sm mb-8">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : schedules.length === 0 ? (
          <div className="bg-white rounded-2xl border p-10 text-center">
            <p className="text-gray-400 text-sm">No schedule yet.</p>
            {user?.role === 'lecturer' && (
              <p className="text-xs text-gray-400 mt-2">
                Add schedules from your <Link href="/courses" className="text-black underline">course settings</Link>.
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Mobile — vertical list */}
            <div className="md:hidden space-y-4">
              {DAYS.map((day, i) => (
                <div key={i} className={`bg-white rounded-2xl border overflow-hidden ${i === todayIndex ? 'ring-2 ring-black' : ''}`}>
                  <div className={`px-4 py-2 flex items-center justify-between ${i === todayIndex ? 'bg-black text-white' : 'bg-gray-50 border-b'}`}>
                    <span className="text-sm font-semibold">{day}</span>
                    {i === todayIndex && <span className="text-xs bg-white text-black px-2 py-0.5 rounded-full font-medium">Today</span>}
                  </div>
                  {byDay[i].length === 0 ? (
                    <p className="px-4 py-3 text-xs text-gray-400">No classes</p>
                  ) : (
                    <div className="divide-y">
                      {byDay[i].map((s) => (
                        <Link key={s.id} href={`/courses/${s.course_id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition">
                          <div className={`w-1.5 h-10 rounded-full ${courseColors.get(s.course_id)?.split(' ')[0]}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{s.course.name}</p>
                            <p className="text-xs text-gray-400 font-mono">{s.course.code}</p>
                          </div>
                          <p className="text-xs text-gray-500 shrink-0">
                            {formatTime(s.start_time)} – {formatTime(s.end_time)}
                          </p>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop — grid */}
            <div className="hidden md:grid grid-cols-7 gap-3">
              {DAYS.map((day, i) => (
                <div key={i} className={`bg-white rounded-2xl border overflow-hidden flex flex-col ${i === todayIndex ? 'ring-2 ring-black' : ''}`}>
                  <div className={`px-3 py-2 text-center ${i === todayIndex ? 'bg-black text-white' : 'bg-gray-50 border-b'}`}>
                    <p className="text-xs font-semibold">{DAYS_SHORT[i]}</p>
                    {i === todayIndex && <p className="text-[10px] text-gray-300">Today</p>}
                  </div>
                  <div className="flex-1 p-2 space-y-2">
                    {byDay[i].length === 0 ? (
                      <p className="text-[10px] text-gray-300 text-center py-2">—</p>
                    ) : (
                      byDay[i].map((s) => (
                        <Link
                          key={s.id}
                          href={`/courses/${s.course_id}`}
                          className={`block p-2 rounded-xl border text-xs hover:opacity-80 transition ${courseColors.get(s.course_id)}`}
                        >
                          <p className="font-semibold truncate">{s.course.name}</p>
                          <p className="font-mono opacity-70 text-[10px]">{s.course.code}</p>
                          <p className="mt-1 opacity-80">{formatTime(s.start_time)}</p>
                          <p className="opacity-60">– {formatTime(s.end_time)}</p>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
