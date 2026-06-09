'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/axios';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface Schedule {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export default function ScheduleEditor({ courseId, isLecturer }: { courseId: string; isLecturer: boolean }) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Track which days are enabled
  const [enabled, setEnabled] = useState<boolean[]>(Array(7).fill(false));
  const [times, setTimes] = useState<{ start: string; end: string }[]>(
    Array(7).fill(null).map(() => ({ start: '08:00', end: '10:00' }))
  );

  useEffect(() => {
    api.get(`/courses/${courseId}/schedule`)
      .then((res) => {
        const data: Schedule[] = res.data;
        setSchedules(data);

        const newEnabled = Array(7).fill(false);
        const newTimes = Array(7).fill(null).map(() => ({ start: '08:00', end: '10:00' }));

        data.forEach((s) => {
          newEnabled[s.day_of_week] = true;
          newTimes[s.day_of_week] = { start: s.start_time.slice(0, 5), end: s.end_time.slice(0, 5) };
        });

        setEnabled(newEnabled);
        setTimes(newTimes);
      })
      .finally(() => setLoading(false));
  }, [courseId]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const payload = enabled
        .map((on, i) => on ? { day_of_week: i, start_time: times[i].start, end_time: times[i].end } : null)
        .filter(Boolean);

      await api.post(`/courses/${courseId}/schedule`, { schedules: payload });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      alert('Failed to save schedule.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-gray-400 text-sm">Loading schedule...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Weekly Schedule</h2>
        {isLecturer && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition"
          >
            {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Schedule'}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {DAYS.map((day, i) => (
          <div key={i} className={`bg-white rounded-2xl border p-4 flex items-center gap-4 transition ${enabled[i] ? 'border-black' : ''}`}>
            {isLecturer ? (
              <input
                type="checkbox"
                checked={enabled[i]}
                onChange={(e) => {
                  const next = [...enabled];
                  next[i] = e.target.checked;
                  setEnabled(next);
                }}
                className="w-4 h-4 accent-black shrink-0"
              />
            ) : (
              <div className={`w-2 h-2 rounded-full shrink-0 ${enabled[i] ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}

            <span className={`text-sm font-medium w-24 shrink-0 ${enabled[i] ? 'text-black' : 'text-gray-400'}`}>
              {day}
            </span>

            {enabled[i] ? (
              <div className="flex items-center gap-2 flex-1">
                {isLecturer ? (
                  <>
                    <input
                      type="time"
                      value={times[i].start}
                      onChange={(e) => {
                        const next = [...times];
                        next[i] = { ...next[i], start: e.target.value };
                        setTimes(next);
                      }}
                      className="border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    />
                    <span className="text-gray-400 text-sm">—</span>
                    <input
                      type="time"
                      value={times[i].end}
                      onChange={(e) => {
                        const next = [...times];
                        next[i] = { ...next[i], end: e.target.value };
                        setTimes(next);
                      }}
                      className="border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </>
                ) : (
                  <span className="text-sm text-gray-600">
                    {times[i].start} — {times[i].end}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-sm text-gray-300 flex-1">No class</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
