'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/store/auth';
import { useCourses } from '@/lib/hooks/useCourses';
import Link from 'next/link';
import PageHeader from '@/components/dashboard/PageHeader';
import SurfacePanel from '@/components/dashboard/SurfacePanel';
import EmptyState from '@/components/dashboard/EmptyState';

export default function CoursesPage() {
  const { user } = useAuth();
  const { courses, loading, createCourse, deleteCourse } = useCourses();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  const isLecturer = user?.role === 'lecturer';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await createCourse(form);
      setForm({ name: '', description: '' });
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Course Workspace"
        title={isLecturer ? 'Manage your courses.' : 'Your course spaces.'}
        description={
          isLecturer
            ? 'Create, organize, and enter course workspaces from a single structured surface.'
            : 'Access enrolled courses, sessions, assignments, and weekly course activity.'
        }
        action={
          isLecturer ? (
            <button
              onClick={() => setShowForm((prev) => !prev)}
              className={`inline-flex px-5 py-3 text-xs font-black uppercase tracking-widest transition ${
                showForm
                  ? 'bg-[#e2e2e2] text-black hover:bg-[#d6d4d3]'
                  : 'bg-[linear-gradient(135deg,_#000000,_#3b3b3b)] text-white hover:opacity-90'
              }`}
            >
              {showForm ? 'Close Form' : 'New Course'}
            </button>
          ) : null
        }
      />

      {showForm && isLecturer && (
        <SurfacePanel tone="low" className="mb-4">
          <div className="mb-8 max-w-2xl">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.34em] text-[#777777]">
              Course Creation
            </p>

            <h2 className="text-3xl font-black tracking-[-0.045em] text-black">
              Define a new course space.
            </h2>

            <p className="mt-3 text-sm font-medium leading-6 text-[#5e5e5e]">
              Keep the name clear and the description concise. Course details
              can be expanded later inside the workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-12">
            <div className="space-y-1.5 lg:col-span-5">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#474747]">
                Course Name
              </label>

              <input
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                className="w-full border-0 border-b border-[#777777]/20 bg-[#e8e8e8] px-4 py-3 text-sm font-medium text-black placeholder:text-[#777777] focus:border-black focus:bg-[#e2e2e2] focus:outline-none focus:ring-0"
                placeholder="Advanced Web Architecture"
                required
              />
            </div>

            <div className="space-y-1.5 lg:col-span-5">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#474747]">
                Description
              </label>

              <input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="w-full border-0 border-b border-[#777777]/20 bg-[#e8e8e8] px-4 py-3 text-sm font-medium text-black placeholder:text-[#777777] focus:border-black focus:bg-[#e2e2e2] focus:outline-none focus:ring-0"
                placeholder="Optional short description"
              />
            </div>

            <div className="flex items-end lg:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[linear-gradient(135deg,_#000000,_#3b3b3b)] px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </SurfacePanel>
      )}

      {loading ? (
        <SurfacePanel tone="lowest">
          <div className="flex min-h-[220px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-5 h-8 w-8 animate-spin rounded-full border-2 border-black/20 border-t-black" />
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#777777]">
                Loading Courses
              </p>
            </div>
          </div>
        </SurfacePanel>
      ) : courses.length === 0 ? (
        <EmptyState
          title={isLecturer ? 'No course spaces yet.' : 'No enrolled courses yet.'}
          description={
            isLecturer
              ? 'Create your first course workspace to begin organizing sessions, assignments, and schedules.'
              : 'Join a course using an enrollment code or invitation link from your lecturer.'
          }
          href={isLecturer ? undefined : '/enroll'}
          actionLabel={isLecturer ? undefined : 'Join Course'}
        />
      ) : (
        <section className="space-y-3">
          {courses.map((course, index) => (
            <SurfacePanel
              key={course.id}
              tone="lowest"
              className="group transition hover:bg-[#f9f9f9]"
            >
              <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
                <Link href={`/courses/${course.id}`} className="block min-w-0">
                  <div className="mb-5 flex flex-wrap items-center gap-3">
                    <span className="bg-[#eeeeee] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#474747]">
                      {course.code}
                    </span>

                    <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#999999]">
                      Course {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>

                  <h2 className="text-2xl font-black tracking-[-0.045em] text-black">
                    {course.name}
                  </h2>

                  {course.description ? (
                    <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[#5e5e5e]">
                      {course.description}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm font-medium text-[#999999]">
                      No description provided.
                    </p>
                  )}
                </Link>

                <div className="flex items-center gap-3 md:justify-end">
                  <Link
                    href={`/courses/${course.id}`}
                    className="bg-black px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-[#3b3b3b]"
                  >
                    Open
                  </Link>

                  {isLecturer && (
                    <button
                      onClick={() => deleteCourse(course.id)}
                      className="px-3 py-2.5 text-xs font-black uppercase tracking-widest text-[#777777] transition hover:bg-[#ffdad6] hover:text-[#410002]"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </SurfacePanel>
          ))}
        </section>
      )}
    </>
  );
}