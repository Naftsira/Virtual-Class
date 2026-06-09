'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/store/auth';
import { useAssignments } from '@/lib/hooks/useAssignments';
import ScheduleEditor from '@/components/ScheduleEditor';
import api from '@/lib/axios';
import Link from 'next/link';

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

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [gateChecked, setGateChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<'sessions' | 'assignments' | 'schedule'>('sessions');
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [sessionForm, setSessionForm] = useState({ title: '', description: '', scheduled_at: '' });
  const [assignmentForm, setAssignmentForm] = useState({ title: '', description: '', due_at: '' });
  const [submitting, setSubmitting] = useState(false);
  const [bannedSessions, setBannedSessions] = useState<Set<string>>(new Set());
  const { assignments, createAssignment, deleteAssignment } = useAssignments(id);
  const router = useRouter();
  const pathname = usePathname();

// Gate checker untuk halaman /courses/[id]
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

  const handleSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post(`/courses/${id}/sessions`, {
        ...sessionForm,
        scheduled_at: sessionForm.scheduled_at ? new Date(sessionForm.scheduled_at).toISOString() : '',
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

  const statusColor = (status: string) => {
    if (status === 'active') return 'bg-green-100 text-green-700';
    if (status === 'closed') return 'bg-gray-100 text-gray-500';
    return 'bg-yellow-100 text-yellow-700';
  };

  if (authLoading || !gateChecked || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400 text-sm">Loading...</p>
    </div>
  );

  if (!course) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="font-bold tracking-tight">LECTRA</Link>
        <span className="text-gray-300">/</span>
        <Link href="/courses" className="text-sm text-gray-500 hover:text-black">Courses</Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium">{course.name}</span>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xs text-gray-400 font-mono">{course.code}</span>
            {user?.role === 'lecturer' && (
              <button
                onClick={() => {
                  const link = `${window.location.origin}/enroll/${course.code}`;
                  navigator.clipboard.writeText(link);
                  alert("Enroll link copied!");
                }}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-200 transition"
              >
                Share Link
              </button>
            )}
          </div>
          <h1 className="text-2xl font-bold">{course.name}</h1>
          {course.description && (
            <p className="text-gray-500 text-sm mt-1">{course.description}</p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
          {(['sessions', 'assignments', 'schedule'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition ${
                activeTab === tab ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-black'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Sessions</h2>
              {user?.role === 'lecturer' && (
                <button
                  onClick={() => setShowSessionForm(!showSessionForm)}
                  className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition"
                >
                  {showSessionForm ? 'Cancel' : '+ New Session'}
                </button>
              )}
            </div>

            {showSessionForm && (
              <form onSubmit={handleSessionSubmit} className="bg-white rounded-2xl border p-6 mb-6 space-y-4">
                <h3 className="font-semibold">Create New Session</h3>
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input
                    value={sessionForm.title}
                    onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={sessionForm.description}
                    onChange={(e) => setSessionForm({ ...sessionForm, description: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Scheduled At</label>
                  <input
                    type="datetime-local"
                    value={sessionForm.scheduled_at}
                    onChange={(e) => setSessionForm({ ...sessionForm, scheduled_at: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition"
                >
                  {submitting ? 'Creating...' : 'Create Session'}
                </button>
              </form>
            )}

            {sessions.length === 0 ? (
              <p className="text-gray-400 text-sm">No sessions yet.</p>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div key={session.id} className="bg-white rounded-2xl border p-6 flex items-center justify-between hover:shadow-md transition">
                    <Link href={`/session/${session.id}`} className="flex-1">
                      <h3 className="font-semibold">{session.title}</h3>
                      {session.description && (
                        <p className="text-sm text-gray-500 mt-1">{session.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(session.scheduled_at).toLocaleString('en-US', { timeZone: 'Asia/Jakarta', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                      </p>
                    </Link>
                    <div className="flex items-center gap-3 ml-4">
  {bannedSessions.has(session.id) && (
    <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-medium">
      🔨 Banned
    </span>
  )}
  <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusColor(session.status)}`}>
    {session.status}
  </span>
                      {user?.role === 'lecturer' && (
                        <button
                          onClick={() => handleDeleteSession(session.id)}
                          className="text-red-400 hover:text-red-600 text-xs transition"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Assignments Tab */}
        {activeTab === 'assignments' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Assignments</h2>
              {user?.role === 'lecturer' && (
                <button
                  onClick={() => setShowAssignmentForm(!showAssignmentForm)}
                  className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition"
                >
                  {showAssignmentForm ? 'Cancel' : '+ New Assignment'}
                </button>
              )}
            </div>

            {showAssignmentForm && (
              <form onSubmit={handleAssignmentSubmit} className="bg-white rounded-2xl border p-6 mb-6 space-y-4">
                <h3 className="font-semibold">Create New Assignment</h3>
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input
                    value={assignmentForm.title}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={assignmentForm.description}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Due Date</label>
                  <input
                    type="datetime-local"
                    value={assignmentForm.due_at}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, due_at: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition"
                >
                  {submitting ? 'Creating...' : 'Create Assignment'}
                </button>
              </form>
            )}

            {assignments.length === 0 ? (
              <p className="text-gray-400 text-sm">No assignments yet.</p>
            ) : (
              <div className="space-y-3">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="bg-white rounded-2xl border p-6 flex items-center justify-between hover:shadow-md transition">
                    <Link href={`/assignments/${assignment.id}`} className="flex-1">
                      <h3 className="font-semibold">{assignment.title}</h3>
                      {assignment.description && (
                        <p className="text-sm text-gray-500 mt-1">{assignment.description}</p>
                      )}
                      {assignment.due_at && (
                        <p className="text-xs text-gray-400 mt-2">
                          Due: {new Date(assignment.due_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
                        </p>
                      )}
                    </Link>
                    {user?.role === 'lecturer' && (
                      <button
                        onClick={() => deleteAssignment(assignment.id)}
                        className="text-red-400 hover:text-red-600 text-xs ml-4 transition"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {activeTab === 'schedule' && (
  <ScheduleEditor courseId={id} isLecturer={user?.role === 'lecturer'} />
)}
      </main>
    </div>
  );
}
