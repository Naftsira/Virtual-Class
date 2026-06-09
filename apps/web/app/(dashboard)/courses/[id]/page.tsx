'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/store/auth';
import { useAssignments } from '@/lib/hooks/useAssignments';
import ScheduleEditor from '@/components/ScheduleEditor';
import api from '@/lib/axios';
import Link from 'next/link';
import PageHeader from '@/components/dashboard/PageHeader';
import SurfacePanel from '@/components/dashboard/SurfacePanel';
import StatusBadge from '@/components/dashboard/StatusBadge';

interface Session {
  id: string;
  title: string;
  description: string | null;
  status: 'waiting' | 'active' | 'closed';
  scheduled_at: string;
}

interface Course {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

type ActiveTab = 'sessions' | 'assignments' | 'schedule';

const tabs: ActiveTab[] = ['sessions', 'assignments', 'schedule'];

const inputClass =
  'w-full border-0 border-b border-[#777777]/20 bg-[#e8e8e8] px-4 py-3 text-sm font-medium text-black placeholder:text-[#777777] focus:border-black focus:bg-[#e2e2e2] focus:outline-none focus:ring-0';

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getSessionVariant(status: Session['status']) {
  if (status === 'active') return 'inverse' as const;
  if (status === 'closed') return 'neutral' as const;
  return 'warning' as const;
}

function getTabDescription(tab: ActiveTab) {
  if (tab === 'sessions') {
    return 'Live classroom spaces connected to this course.';
  }

  if (tab === 'assignments') {
    return 'Course tasks, deadlines, and submission surfaces.';
  }

  return 'Weekly rhythm and recurring class structure.';
}

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [gateChecked, setGateChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('sessions');
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    title: '',
    description: '',
    scheduled_at: '',
  });
  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    description: '',
    due_at: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [bannedSessions, setBannedSessions] = useState<Set<string>>(
    new Set()
  );
  const [copied, setCopied] = useState(false);

  const {
    assignments,
    loading: assignmentsLoading,
    createAssignment,
    deleteAssignment,
  } = useAssignments(id);

  const router = useRouter();
  const pathname = usePathname();

  const isLecturer = user?.role === 'lecturer';

  useEffect(() => {
    if (!id) return;

    setGateChecked(false);

    const gatePassed = sessionStorage.getItem(`gate_passed_course_${id}`);

    if (!gatePassed) {
      sessionStorage.setItem('gate_type', 'course');
      sessionStorage.setItem('gate_access_id', id);
      sessionStorage.setItem('gate_destination', pathname);

      router.replace('/gate');
      return;
    }

    setGateChecked(true);
  }, [id, pathname, router]);

  useEffect(() => {
    if (authLoading || !user || !gateChecked || !id) return;

    let cancelled = false;

    const fetchCourseDetail = async () => {
      setLoading(true);

      try {
        const [courseRes, sessionsRes] = await Promise.all([
          api.get(`/courses/${id}`),
          api.get(`/courses/${id}/sessions`),
        ]);

        if (cancelled) return;

        setCourse(courseRes.data);
        setSessions(sessionsRes.data);

        if (user.role === 'student') {
          const banChecks = await Promise.all(
            sessionsRes.data.map(async (s: any) => {
              try {
                const res = await api.get(`/sessions/${s.id}/ban-status`);
                return res.data.banned ? s.id : null;
              } catch {
                return null;
              }
            })
          );

          if (!cancelled) {
            setBannedSessions(new Set(banChecks.filter(Boolean)));
          }
        }
      } catch (err: any) {
        console.error('Failed to fetch course detail:', err);

        if (err.response?.status === 404) {
          router.push('/courses');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchCourseDetail();

    return () => {
      cancelled = true;
    };
  }, [id, user, authLoading, gateChecked, router]);

  const handleShareCourse = async () => {
    if (!course) return;

    try {
      const link = `${window.location.origin}/enroll/${course.code}`;
      await navigator.clipboard.writeText(link);

      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      alert('Failed to copy enroll link.');
    }
  };

  const handleSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await api.post(`/courses/${id}/sessions`, {
        ...sessionForm,
        scheduled_at: sessionForm.scheduled_at
          ? new Date(sessionForm.scheduled_at).toISOString()
          : '',
      });

      setSessions((prev) => [...prev, res.data]);
      setSessionForm({ title: '', description: '', scheduled_at: '' });
      setShowSessionForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await createAssignment(assignmentForm);
      setAssignmentForm({ title: '', description: '', due_at: '' });
      setShowAssignmentForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Delete this session?')) return;

    try {
      await api.delete(`/courses/${id}/sessions/${sessionId}`);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch {
      alert('Failed to delete session.');
    }
  };

  if (authLoading || !gateChecked || loading) {
    return (
      <div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center">
        <SurfacePanel tone="lowest" className="w-full max-w-md text-center">
          <div className="mx-auto mb-5 h-8 w-8 animate-spin rounded-full border-2 border-black/20 border-t-black" />
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#777777]">
            Loading Course Workspace
          </p>
        </SurfacePanel>
      </div>
    );
  }

  if (!course) return null;

  return (
    <>
      <PageHeader
        eyebrow={course.code}
        title={course.name}
        description={
          course.description ||
          'Course workspace for sessions, assignments, and weekly structure.'
        }
        action={
          <div className="flex flex-wrap gap-3">
            <Link
              href="/courses"
              className="inline-flex bg-[#e2e2e2] px-5 py-3 text-xs font-black uppercase tracking-widest text-black transition hover:bg-[#d6d4d3]"
            >
              Courses
            </Link>

            {isLecturer && (
              <button
                onClick={handleShareCourse}
                className="inline-flex bg-[linear-gradient(135deg,_#000000,_#3b3b3b)] px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:opacity-90"
              >
                {copied ? 'Copied' : 'Share Access'}
              </button>
            )}
          </div>
        }
      />

      <div className="mb-4 grid gap-4 lg:grid-cols-12">
        <SurfacePanel tone="inverse" className="lg:col-span-7">
          <div className="flex min-h-[260px] flex-col justify-between">
            <div>
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.34em] text-white/45">
                Course Command
              </p>

              <h2 className="max-w-2xl text-4xl font-black leading-[0.98] tracking-[-0.055em] text-white md:text-5xl">
                {isLecturer
                  ? 'Prepare the learning space before students arrive.'
                  : 'Enter the right learning surface with less friction.'}
              </h2>

              <p className="mt-5 max-w-xl text-sm font-medium leading-7 text-white/60">
                Sessions, assignments, and schedules stay grouped here so the
                course remains structured without visual clutter.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-2">
              <div className="bg-white/8 px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                  Sessions
                </p>
                <p className="mt-2 text-2xl font-black text-white">
                  {sessions.length}
                </p>
              </div>

              <div className="bg-white/8 px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                  Tasks
                </p>
                <p className="mt-2 text-2xl font-black text-white">
                  {assignments.length}
                </p>
              </div>

              <div className="bg-white/8 px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                  Role
                </p>
                <p className="mt-2 text-sm font-black capitalize text-white">
                  {user?.role}
                </p>
              </div>
            </div>
          </div>
        </SurfacePanel>

        <SurfacePanel tone="low" className="lg:col-span-5">
          <div className="flex h-full min-h-[260px] flex-col justify-between">
            <div>
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.34em] text-[#777777]">
                Active Surface
              </p>

              <h3 className="text-3xl font-black capitalize tracking-[-0.05em] text-black">
                {activeTab}
              </h3>

              <p className="mt-4 text-sm font-medium leading-6 text-[#5e5e5e]">
                {getTabDescription(activeTab)}
              </p>
            </div>

            <div className="mt-8 bg-white p-1">
              <div className="grid grid-cols-3 gap-1">
                {tabs.map((tab) => {
                  const active = activeTab === tab;

                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-3 text-[10px] font-black uppercase tracking-widest transition ${
                        active
                          ? 'bg-black text-white'
                          : 'text-[#5e5e5e] hover:bg-[#eeeeee] hover:text-black'
                      }`}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </SurfacePanel>
      </div>

      {activeTab === 'sessions' && (
        <section className="space-y-4">
          <div className="flex flex-col gap-4 bg-[#f3f3f3] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#777777]">
                Live Learning
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.045em] text-black">
                Sessions
              </h2>
            </div>

            {isLecturer && (
              <button
                onClick={() => setShowSessionForm((prev) => !prev)}
                className={`px-5 py-3 text-xs font-black uppercase tracking-widest transition ${
                  showSessionForm
                    ? 'bg-[#e2e2e2] text-black hover:bg-[#d6d4d3]'
                    : 'bg-[linear-gradient(135deg,_#000000,_#3b3b3b)] text-white hover:opacity-90'
                }`}
              >
                {showSessionForm ? 'Close Form' : 'New Session'}
              </button>
            )}
          </div>

          {showSessionForm && isLecturer && (
            <SurfacePanel tone="low">
              <div className="mb-8 max-w-2xl">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.34em] text-[#777777]">
                  Session Creation
                </p>

                <h3 className="text-3xl font-black tracking-[-0.045em] text-black">
                  Define a live classroom moment.
                </h3>
              </div>

              <form
                onSubmit={handleSessionSubmit}
                className="grid gap-5 lg:grid-cols-12"
              >
                <div className="space-y-1.5 lg:col-span-4">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#474747]">
                    Title
                  </label>

                  <input
                    value={sessionForm.title}
                    onChange={(e) =>
                      setSessionForm({
                        ...sessionForm,
                        title: e.target.value,
                      })
                    }
                    className={inputClass}
                    placeholder="Introduction Session"
                    required
                  />
                </div>

                <div className="space-y-1.5 lg:col-span-4">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#474747]">
                    Description
                  </label>

                  <input
                    value={sessionForm.description}
                    onChange={(e) =>
                      setSessionForm({
                        ...sessionForm,
                        description: e.target.value,
                      })
                    }
                    className={inputClass}
                    placeholder="Optional short context"
                  />
                </div>

                <div className="space-y-1.5 lg:col-span-3">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#474747]">
                    Scheduled At
                  </label>

                  <input
                    type="datetime-local"
                    value={sessionForm.scheduled_at}
                    onChange={(e) =>
                      setSessionForm({
                        ...sessionForm,
                        scheduled_at: e.target.value,
                      })
                    }
                    className={inputClass}
                    required
                  />
                </div>

                <div className="flex items-end lg:col-span-1">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-black px-4 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-[#3b3b3b] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? '...' : 'Create'}
                  </button>
                </div>
              </form>
            </SurfacePanel>
          )}

          {sessions.length === 0 ? (
            <SurfacePanel tone="lowest" className="text-center">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.34em] text-[#777777]">
                Empty Session Surface
              </p>

              <h3 className="text-2xl font-black tracking-[-0.045em] text-black">
                No sessions yet.
              </h3>

              <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-6 text-[#5e5e5e]">
                {isLecturer
                  ? 'Create a session to open a live classroom workspace for this course.'
                  : 'Sessions will appear here once your lecturer schedules them.'}
              </p>
            </SurfacePanel>
          ) : (
            <div className="space-y-3">
              {sessions.map((session, index) => {
                const banned = bannedSessions.has(session.id);

                return (
                  <SurfacePanel
                    key={session.id}
                    tone="lowest"
                    className="transition hover:bg-[#f9f9f9]"
                  >
                    <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
                      <Link
                        href={`/session/${session.id}`}
                        className={`block min-w-0 ${
                          banned ? 'pointer-events-none opacity-45' : ''
                        }`}
                      >
                        <div className="mb-5 flex flex-wrap items-center gap-3">
                          <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#999999]">
                            Session {String(index + 1).padStart(2, '0')}
                          </span>

                          <StatusBadge
                            variant={getSessionVariant(session.status)}
                          >
                            {session.status}
                          </StatusBadge>

                          {banned && (
                            <StatusBadge variant="danger">
                              <span className="material-symbols-outlined mr-1 text-[14px]">
                                block
                              </span>
                              Restricted
                            </StatusBadge>
                          )}
                        </div>

                        <h3 className="text-2xl font-black tracking-[-0.045em] text-black">
                          {session.title}
                        </h3>

                        {session.description && (
                          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[#5e5e5e]">
                            {session.description}
                          </p>
                        )}

                        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-[#777777]">
                          {formatDateTime(session.scheduled_at)}
                        </p>
                      </Link>

                      <div className="flex items-center gap-3 md:justify-end">
                        {!banned && (
                          <Link
                            href={`/session/${session.id}`}
                            className="bg-black px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-[#3b3b3b]"
                          >
                            Open
                          </Link>
                        )}

                        {isLecturer && (
                          <button
                            onClick={() => handleDeleteSession(session.id)}
                            className="px-3 py-2.5 text-xs font-black uppercase tracking-widest text-[#777777] transition hover:bg-[#ffdad6] hover:text-[#410002]"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </SurfacePanel>
                );
              })}
            </div>
          )}
        </section>
      )}

      {activeTab === 'assignments' && (
        <section className="space-y-4">
          <div className="flex flex-col gap-4 bg-[#f3f3f3] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#777777]">
                Assessment Flow
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.045em] text-black">
                Assignments
              </h2>
            </div>

            {isLecturer && (
              <button
                onClick={() => setShowAssignmentForm((prev) => !prev)}
                className={`px-5 py-3 text-xs font-black uppercase tracking-widest transition ${
                  showAssignmentForm
                    ? 'bg-[#e2e2e2] text-black hover:bg-[#d6d4d3]'
                    : 'bg-[linear-gradient(135deg,_#000000,_#3b3b3b)] text-white hover:opacity-90'
                }`}
              >
                {showAssignmentForm ? 'Close Form' : 'New Assignment'}
              </button>
            )}
          </div>

          {showAssignmentForm && isLecturer && (
            <SurfacePanel tone="low">
              <div className="mb-8 max-w-2xl">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.34em] text-[#777777]">
                  Assignment Creation
                </p>

                <h3 className="text-3xl font-black tracking-[-0.045em] text-black">
                  Define a focused course task.
                </h3>
              </div>

              <form
                onSubmit={handleAssignmentSubmit}
                className="grid gap-5 lg:grid-cols-12"
              >
                <div className="space-y-1.5 lg:col-span-4">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#474747]">
                    Title
                  </label>

                  <input
                    value={assignmentForm.title}
                    onChange={(e) =>
                      setAssignmentForm({
                        ...assignmentForm,
                        title: e.target.value,
                      })
                    }
                    className={inputClass}
                    placeholder="Written Reflection"
                    required
                  />
                </div>

                <div className="space-y-1.5 lg:col-span-5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#474747]">
                    Description
                  </label>

                  <input
                    value={assignmentForm.description}
                    onChange={(e) =>
                      setAssignmentForm({
                        ...assignmentForm,
                        description: e.target.value,
                      })
                    }
                    className={inputClass}
                    placeholder="Optional assignment context"
                  />
                </div>

                <div className="space-y-1.5 lg:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#474747]">
                    Due Date
                  </label>

                  <input
                    type="datetime-local"
                    value={assignmentForm.due_at}
                    onChange={(e) =>
                      setAssignmentForm({
                        ...assignmentForm,
                        due_at: e.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </div>

                <div className="flex items-end lg:col-span-1">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-black px-4 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-[#3b3b3b] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? '...' : 'Create'}
                  </button>
                </div>
              </form>
            </SurfacePanel>
          )}

          {assignmentsLoading ? (
            <SurfacePanel tone="lowest">
              <div className="flex min-h-[180px] items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-5 h-8 w-8 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#777777]">
                    Loading Assignments
                  </p>
                </div>
              </div>
            </SurfacePanel>
          ) : assignments.length === 0 ? (
            <SurfacePanel tone="lowest" className="text-center">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.34em] text-[#777777]">
                Empty Assignment Surface
              </p>

              <h3 className="text-2xl font-black tracking-[-0.045em] text-black">
                No assignments yet.
              </h3>

              <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-6 text-[#5e5e5e]">
                {isLecturer
                  ? 'Create the first assignment to structure student work for this course.'
                  : 'Assignments will appear here once your lecturer publishes them.'}
              </p>
            </SurfacePanel>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment, index) => (
                <SurfacePanel
                  key={assignment.id}
                  tone="lowest"
                  className="transition hover:bg-[#f9f9f9]"
                >
                  <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
                    <Link
                      href={`/assignments/${assignment.id}`}
                      className="block min-w-0"
                    >
                      <div className="mb-5 flex flex-wrap items-center gap-3">
                        <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#999999]">
                          Task {String(index + 1).padStart(2, '0')}
                        </span>

                        {assignment.due_at ? (
                          <StatusBadge variant="warning">Due Set</StatusBadge>
                        ) : (
                          <StatusBadge variant="neutral">No Due</StatusBadge>
                        )}
                      </div>

                      <h3 className="text-2xl font-black tracking-[-0.045em] text-black">
                        {assignment.title}
                      </h3>

                      {assignment.description && (
                        <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[#5e5e5e]">
                          {assignment.description}
                        </p>
                      )}

                      {assignment.due_at && (
                        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-[#777777]">
                          Due:{' '}
                          {new Date(assignment.due_at).toLocaleString(
                            'id-ID',
                            {
                              timeZone: 'Asia/Jakarta',
                            }
                          )}
                        </p>
                      )}
                    </Link>

                    <div className="flex items-center gap-3 md:justify-end">
                      <Link
                        href={`/assignments/${assignment.id}`}
                        className="bg-black px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-[#3b3b3b]"
                      >
                        Open
                      </Link>

                      {isLecturer && (
                        <button
                          onClick={() => deleteAssignment(assignment.id)}
                          className="px-3 py-2.5 text-xs font-black uppercase tracking-widest text-[#777777] transition hover:bg-[#ffdad6] hover:text-[#410002]"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </SurfacePanel>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'schedule' && (
        <SurfacePanel tone="lowest">
          <ScheduleEditor courseId={id} isLecturer={user?.role === 'lecturer'} />
        </SurfacePanel>
      )}
    </>
  );
}