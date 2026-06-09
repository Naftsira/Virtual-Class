'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/axios';

const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

interface Schedule {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export default function ScheduleEditor({
  courseId,
  isLecturer,
}: {
  courseId: string;
  isLecturer: boolean;
}) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [enabled, setEnabled] = useState<boolean[]>(Array(7).fill(false));
  const [times, setTimes] = useState<{ start: string; end: string }[]>(
    Array(7)
      .fill(null)
      .map(() => ({ start: '08:00', end: '10:00' }))
  );

  useEffect(() => {
    if (!courseId) {
      setLoading(false);
      setError('Missing course id. Schedule editor cannot be loaded.');
      return;
    }

    let cancelled = false;

    setLoading(true);
    setError('');

    api
      .get(`/courses/${courseId}/schedule`)
      .then((res) => {
        if (cancelled) return;

        const data: Schedule[] = res.data;
        setSchedules(data);

        const newEnabled = Array(7).fill(false);
        const newTimes = Array(7)
          .fill(null)
          .map(() => ({ start: '08:00', end: '10:00' }));

        data.forEach((s) => {
          newEnabled[s.day_of_week] = true;
          newTimes[s.day_of_week] = {
            start: s.start_time.slice(0, 5),
            end: s.end_time.slice(0, 5),
          };
        });

        setEnabled(newEnabled);
        setTimes(newTimes);
      })
      .catch((err) => {
        if (cancelled) return;

        console.error('Failed to load course schedule:', err);
        setError('Course schedule could not be loaded.');
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const handleToggleDay = (index: number, value: boolean) => {
    const next = [...enabled];
    next[index] = value;
    setEnabled(next);
    setSaved(false);
    setError('');
  };

  const handleTimeChange = (
    index: number,
    type: 'start' | 'end',
    value: string
  ) => {
    const next = [...times];
    next[index] = { ...next[index], [type]: value };
    setTimes(next);
    setSaved(false);
    setError('');
  };

  const handleSave = async () => {
    if (!courseId) {
      setError('Missing course id. Schedule cannot be saved.');
      return;
    }

    setSaving(true);
    setSaved(false);
    setError('');

    try {
      const payload = enabled
        .map((on, i) =>
          on
            ? {
                day_of_week: i,
                start_time: times[i].start,
                end_time: times[i].end,
              }
            : null
        )
        .filter(Boolean);

      await api.post(`/courses/${courseId}/schedule`, {
        schedules: payload,
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save course schedule:', err);
      setError('Schedule could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[220px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-5 h-8 w-8 animate-spin rounded-full border-2 border-black/20 border-t-black" />
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#777777]">
            Loading Schedule
          </p>
        </div>
      </div>
    );
  }

  const activeDays = enabled.filter(Boolean).length;

  return (
    <div>
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.34em] text-[#777777]">
            Weekly Structure
          </p>

          <h2 className="text-3xl font-black tracking-[-0.045em] text-black">
            Course schedule.
          </h2>

          <p className="mt-3 text-sm font-medium leading-6 text-[#5e5e5e]">
            {isLecturer
              ? 'Activate class days and define recurring time blocks for this course.'
              : 'Recurring class blocks configured for this course.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-[#f3f3f3] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#777777]">
              Active Days
            </p>
            <p className="mt-1 text-sm font-black text-black">
              {activeDays} / 7
            </p>
          </div>

          {isLecturer && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center justify-center bg-[linear-gradient(135deg,_#000000,_#3b3b3b)] px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,_#1a1c1c,_#5e5e5e)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving...' : saved ? 'Saved' : 'Save Schedule'}
            </button>
          )}
        </div>
      </div>

      {saved && (
        <div className="mb-4 bg-[#e2e2e2] px-4 py-3 text-sm font-bold text-black">
          Schedule updated successfully.
        </div>
      )}

      {error && (
        <div className="mb-4 bg-[#ffdad6] px-4 py-3 text-sm font-bold text-[#410002]">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {DAYS.map((day, i) => {
          const active = enabled[i];

          return (
            <div
              key={day}
              className={`grid gap-4 px-5 py-5 transition md:grid-cols-[1fr_auto] md:items-center ${
                active ? 'bg-[#f3f3f3]' : 'bg-[#eeeeee]'
              }`}
            >
              <div className="flex min-w-0 items-center gap-4">
                {isLecturer ? (
                  <button
                    type="button"
                    onClick={() => handleToggleDay(i, !active)}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-black transition-all duration-200 ${
                      active
                        ? 'bg-black text-white hover:-translate-y-0.5 hover:bg-[#3b3b3b]'
                        : 'bg-white text-[#777777] hover:-translate-y-0.5 hover:bg-[#e2e2e2] hover:text-black'
                    }`}
                    aria-pressed={active}
                    aria-label={`Toggle ${day}`}
                  >
                    {active ? 'ON' : 'OFF'}
                  </button>
                ) : (
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      active ? 'bg-black text-white' : 'bg-white text-[#999999]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[19px]">
                      {active ? 'event_available' : 'event_busy'}
                    </span>
                  </div>
                )}

                <div className="min-w-0">
                  <p
                    className={`text-lg font-black tracking-[-0.035em] ${
                      active ? 'text-black' : 'text-[#999999]'
                    }`}
                  >
                    {day}
                  </p>

                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#777777]">
                    {active ? 'Class Block Active' : 'No Class'}
                  </p>
                </div>
              </div>

              <div className="min-w-0">
                {active ? (
                  isLecturer ? (
                    <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3 sm:min-w-[320px]">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#474747]">
                          Start
                        </label>

                        <input
                          type="time"
                          value={times[i].start}
                          onChange={(e) =>
                            handleTimeChange(i, 'start', e.target.value)
                          }
                          className="w-full border-0 border-b border-[#777777]/20 bg-[#e8e8e8] px-3 py-2.5 text-sm font-bold text-black focus:border-black focus:bg-[#e2e2e2] focus:outline-none focus:ring-0"
                        />
                      </div>

                      <span className="pb-3 text-sm font-bold text-[#777777]">
                        —
                      </span>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#474747]">
                          End
                        </label>

                        <input
                          type="time"
                          value={times[i].end}
                          onChange={(e) =>
                            handleTimeChange(i, 'end', e.target.value)
                          }
                          className="w-full border-0 border-b border-[#777777]/20 bg-[#e8e8e8] px-3 py-2.5 text-sm font-bold text-black focus:border-black focus:bg-[#e2e2e2] focus:outline-none focus:ring-0"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#777777]">
                        Time Block
                      </p>
                      <p className="mt-1 text-sm font-black text-black">
                        {times[i].start} — {times[i].end}
                      </p>
                    </div>
                  )
                ) : (
                  <div className="bg-white/60 px-4 py-3">
                    <p className="text-sm font-bold text-[#999999]">
                      No class scheduled.
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!isLecturer && schedules.length === 0 && (
        <div className="mt-4 bg-[#eeeeee] px-5 py-5">
          <p className="text-sm font-medium leading-6 text-[#5e5e5e]">
            This course does not have a recurring schedule yet.
          </p>
        </div>
      )}
    </div>
  );
}