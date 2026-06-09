'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store/auth';
import api from '@/lib/axios';
import Link from 'next/link';

interface Assignment {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  due_at: string | null;
}

interface Submission {
  id: string;
  student_id: string;
  content: string | null;
  file_url: string | null;
  status: 'draft' | 'submitted' | 'graded';
  grade: number | null;
  feedback: string | null;
  submitted_at: string | null;
  is_late: boolean;
  student?: {
    id: string;
    name: string;
    email: string;
  };
}

type StatusTone = 'neutral' | 'submitted' | 'graded' | 'late' | 'danger';

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function toDatetimeLocalValue(dateStr: string | null) {
  if (!dateStr) return '';

  const date = new Date(dateStr);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 16);
}

function isPastDue(dueAt: string) {
  return new Date() > new Date(dueAt);
}

function StatusPill({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: StatusTone;
}) {
  const toneClass: Record<StatusTone, string> = {
    neutral: 'bg-[#eeeeee] text-[#5e5e5e]',
    submitted: 'bg-[#e9edf3] text-[#303946]',
    graded: 'bg-[#e8f0ea] text-[#2f4a37]',
    late: 'bg-[#f3ece5] text-[#7a4a20]',
    danger: 'bg-[#f2e8e8] text-[#7a2929]',
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${toneClass[tone]}`}
    >
      {children}
    </span>
  );
}

function Panel({
  children,
  className = '',
  tone = 'default',
}: {
  children: React.ReactNode;
  className?: string;
  tone?: 'default' | 'low' | 'inverse';
}) {
  const toneClass = {
    default: 'bg-white',
    low: 'bg-[#f3f3f3]',
    inverse: 'bg-black text-white',
  };

  return (
    <section className={`${toneClass[tone]} p-6 md:p-8 ${className}`}>
      {children}
    </section>
  );
}

export default function AssignmentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [grading, setGrading] = useState<string | null>(null);
  const [gradeForm, setGradeForm] = useState({
    grade: '',
    feedback: '',
  });

  const [editingDue, setEditingDue] = useState(false);
  const [newDueAt, setNewDueAt] = useState('');
  const [savingDue, setSavingDue] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (!id) return;

    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);

      try {
        const assignmentRes = await api.get(`/assignments/${id}`);

        if (cancelled) return;

        setAssignment(assignmentRes.data);
        setNewDueAt(toDatetimeLocalValue(assignmentRes.data.due_at));

        if (user.role === 'student') {
          const subRes = await api.get(`/assignments/${id}/submissions/my`);

          if (cancelled) return;

          if (subRes.data) {
            setSubmission(subRes.data);
            setContent(subRes.data.content || '');
          }
        }

        if (user.role === 'lecturer') {
          const subsRes = await api.get(`/assignments/${id}/submissions`);

          if (cancelled) return;

          setSubmissions(subsRes.data);
        }
      } catch (err) {
        console.error('Failed to load assignment:', err);
        router.push('/courses');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [id, user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() && !file && !submission?.file_url) {
      alert('Write an answer or attach a file first.');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();

      if (content.trim()) {
        formData.append('content', content.trim());
      }

      if (file) {
        formData.append('file', file);
      }

      const res = await api.post(`/assignments/${id}/submit`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSubmission(res.data);
      setFile(null);

      if (fileRef.current) {
        fileRef.current.value = '';
      }
    } catch (err) {
      console.error('Failed to submit assignment:', err);
      alert('Failed to submit.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGrade = async (submissionId: string) => {
    const parsedGrade = Number(gradeForm.grade);

    if (Number.isNaN(parsedGrade) || parsedGrade < 0 || parsedGrade > 100) {
      alert('Grade must be a number between 0 and 100.');
      return;
    }

    try {
      const res = await api.post(
        `/assignments/${id}/submissions/${submissionId}/grade`,
        {
          grade: parsedGrade,
          feedback: gradeForm.feedback,
        }
      );

      setSubmissions((prev) =>
        prev.map((s) => (s.id === submissionId ? res.data : s))
      );

      setGrading(null);
      setGradeForm({
        grade: '',
        feedback: '',
      });
    } catch (err) {
      console.error('Failed to grade submission:', err);
      alert('Failed to grade.');
    }
  };

  const saveDueDate = async () => {
    if (!assignment) return;

    if (!newDueAt) {
      alert('Choose a due date first.');
      return;
    }

    setSavingDue(true);

    try {
      const res = await api.put(
        `/courses/${assignment.course_id}/assignments/${id}`,
        {
          due_at: new Date(newDueAt).toISOString(),
        }
      );

      setAssignment(res.data);
      setNewDueAt(toDatetimeLocalValue(res.data.due_at));
      setEditingDue(false);
    } catch (err) {
      console.error('Failed to update due date:', err);
      alert('Failed to update due date.');
    } finally {
      setSavingDue(false);
    }
  };

  const getStatusTone = (status: Submission['status']): StatusTone => {
    if (status === 'graded') return 'graded';
    if (status === 'submitted') return 'submitted';
    return 'neutral';
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#eeeeee] flex items-center justify-center">
        <p className="text-sm font-medium text-[#777777]">
          Loading assignment...
        </p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!assignment) {
    return null;
  }

  const overdue = assignment.due_at ? isPastDue(assignment.due_at) : false;
  const isLecturer = user.role === 'lecturer';
  const isStudent = user.role === 'student';
  const lateCount = submissions.filter((s) => s.is_late).length;
  const gradedCount = submissions.filter((s) => s.status === 'graded').length;

  return (
    <div className="min-h-screen bg-[#eeeeee] text-black">
      <nav className="px-6 py-5">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <Link href="/dashboard" className="text-sm font-black tracking-tight">
            LECTRA
          </Link>

          <span className="text-[#b0b0b0]">/</span>

          <Link
            href="/courses"
            className="text-xs font-bold uppercase tracking-[0.22em] text-[#777777] transition hover:text-black"
          >
            Courses
          </Link>

          <span className="text-[#b0b0b0]">/</span>

          <span className="truncate text-xs font-bold uppercase tracking-[0.22em] text-black">
            Assignment
          </span>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 pb-12">
        <div className="grid gap-4 lg:grid-cols-12">
          <Panel tone="inverse" className="lg:col-span-8">
            <p className="mb-5 text-[10px] font-black uppercase tracking-[0.34em] text-white/45">
              Assignment Brief
            </p>

            <h1 className="max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.055em] text-white md:text-6xl">
              {assignment.title}
            </h1>

            {assignment.description && (
              <p className="mt-6 max-w-2xl whitespace-pre-wrap text-sm font-medium leading-7 text-white/60">
                {assignment.description}
              </p>
            )}

            <div className="mt-10 flex flex-wrap gap-2">
              {assignment.due_at ? (
                <StatusPill tone={overdue ? 'danger' : 'neutral'}>
                  Due {formatDateTime(assignment.due_at)}
                </StatusPill>
              ) : (
                <StatusPill>No due date</StatusPill>
              )}

              {overdue && <StatusPill tone="danger">Past due</StatusPill>}

              <StatusPill tone={isLecturer ? 'submitted' : 'neutral'}>
                {user.role}
              </StatusPill>
            </div>
          </Panel>

          <Panel tone="low" className="lg:col-span-4">
            <p className="mb-5 text-[10px] font-black uppercase tracking-[0.34em] text-[#777777]">
              Assignment State
            </p>

            {isStudent && (
              <div className="space-y-3">
                <div className="bg-white px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#777777]">
                    Status
                  </p>
                  <p className="mt-2 text-2xl font-black tracking-[-0.04em] capitalize">
                    {submission?.status ?? 'Not submitted'}
                  </p>
                </div>

                <div className="bg-white px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#777777]">
                    Grade
                  </p>
                  <p className="mt-2 text-2xl font-black tracking-[-0.04em]">
                    {submission?.grade != null ? `${submission.grade}/100` : '—'}
                  </p>
                </div>

                <div className="bg-white px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#777777]">
                    Submitted
                  </p>
                  <p className="mt-2 text-sm font-bold text-[#5e5e5e]">
                    {submission?.submitted_at
                      ? formatDateTime(submission.submitted_at)
                      : 'No submission yet'}
                  </p>
                </div>
              </div>
            )}

            {isLecturer && (
              <div className="space-y-3">
                <div className="bg-white px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#777777]">
                    Submissions
                  </p>
                  <p className="mt-2 text-3xl font-black tracking-[-0.05em]">
                    {submissions.length}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white px-4 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#777777]">
                      Graded
                    </p>
                    <p className="mt-2 text-2xl font-black">{gradedCount}</p>
                  </div>

                  <div className="bg-white px-4 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#777777]">
                      Late
                    </p>
                    <p className="mt-2 text-2xl font-black">{lateCount}</p>
                  </div>
                </div>

                <div className="bg-white px-4 py-4">
                  <p className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-[#777777]">
                    Due Date
                  </p>

                  {editingDue ? (
                    <div className="space-y-3">
                      <input
                        type="datetime-local"
                        value={newDueAt}
                        onChange={(e) => setNewDueAt(e.target.value)}
                        className="w-full bg-[#f3f3f3] px-3 py-3 text-sm font-medium text-black outline-none"
                      />

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={saveDueDate}
                          disabled={savingDue}
                          className="bg-black px-3 py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-40"
                        >
                          {savingDue ? 'Saving' : 'Save'}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingDue(false);
                            setNewDueAt(toDatetimeLocalValue(assignment.due_at));
                          }}
                          className="bg-[#eeeeee] px-3 py-3 text-xs font-black uppercase tracking-widest text-black"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm font-bold text-[#5e5e5e]">
                        {assignment.due_at
                          ? formatDateTime(assignment.due_at)
                          : 'No due date'}
                      </p>

                      <button
                        type="button"
                        onClick={() => setEditingDue(true)}
                        className="text-xs font-black uppercase tracking-widest text-black underline underline-offset-4"
                      >
                        Edit due date
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Panel>
        </div>

        {isStudent && (
          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <Panel className="lg:col-span-8">
              <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <p className="mb-3 text-[10px] font-black uppercase tracking-[0.34em] text-[#777777]">
                    Student Submission
                  </p>

                  <h2 className="text-3xl font-black tracking-[-0.045em]">
                    {submission ? 'Revise your work.' : 'Submit your work.'}
                  </h2>

                  <p className="mt-3 max-w-xl text-sm font-medium leading-7 text-[#5e5e5e]">
                    Write your response, attach supporting files when needed,
                    then submit. Updates are allowed while the assignment remains
                    accessible.
                  </p>
                </div>

                {submission && (
                  <div className="flex flex-wrap gap-2">
                    <StatusPill tone={getStatusTone(submission.status)}>
                      {submission.status}
                    </StatusPill>

                    {submission.is_late && (
                      <StatusPill tone="late">Late</StatusPill>
                    )}
                  </div>
                )}
              </div>

              {overdue && !submission && (
                <div className="mb-6 bg-[#f2e8e8] px-4 py-4">
                  <p className="text-sm font-bold text-[#7a2929]">
                    This assignment is past due. Your submission will be marked
                    as late.
                  </p>
                </div>
              )}

              {submission?.status === 'graded' && (
                <div className="mb-6 bg-[#e8f0ea] px-5 py-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#55705c]">
                    Grade Released
                  </p>

                  <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#2f4a37]">
                    {submission.grade}/100
                  </p>

                  {submission.feedback && (
                    <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-6 text-[#2f4a37]">
                      {submission.feedback}
                    </p>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-[#777777]">
                    Answer
                  </label>

                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={8}
                    placeholder="Write your answer here..."
                    className="w-full resize-none bg-[#f3f3f3] px-4 py-4 text-sm font-medium leading-7 text-black outline-none placeholder:text-[#9a9a9a]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-[#777777]">
                    Attachment
                  </label>

                  <input
                    ref={fileRef}
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="block w-full bg-[#f3f3f3] px-4 py-4 text-sm font-medium text-[#5e5e5e] file:mr-4 file:border-0 file:bg-black file:px-4 file:py-2 file:text-xs file:font-black file:uppercase file:tracking-widest file:text-white"
                  />

                  <p className="mt-2 text-xs font-medium text-[#777777]">
                    Optional file attachment, max 10MB.
                  </p>

                  {submission?.file_url && !file && (
                    <a
                      href={submission.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-block text-xs font-black uppercase tracking-widest text-black underline underline-offset-4"
                    >
                      View current attachment
                    </a>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[linear-gradient(135deg,_#000000,_#3b3b3b)] px-6 py-4 text-xs font-black uppercase tracking-widest text-white transition hover:opacity-90 disabled:opacity-40"
                >
                  {submitting
                    ? 'Submitting'
                    : submission
                    ? 'Update Submission'
                    : 'Submit Assignment'}
                </button>
              </form>
            </Panel>

            <Panel tone="low" className="lg:col-span-4">
              <p className="mb-5 text-[10px] font-black uppercase tracking-[0.34em] text-[#777777]">
                Submission Record
              </p>

              <div className="space-y-3">
                <div className="bg-white px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#777777]">
                    Status
                  </p>
                  <p className="mt-2 text-sm font-black capitalize">
                    {submission?.status ?? 'Not submitted'}
                  </p>
                </div>

                <div className="bg-white px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#777777]">
                    Timing
                  </p>
                  <p className="mt-2 text-sm font-bold text-[#5e5e5e]">
                    {submission?.is_late
                      ? 'Submitted late'
                      : submission
                      ? 'Submitted on time'
                      : overdue
                      ? 'Past due'
                      : 'Open'}
                  </p>
                </div>

                {submission?.submitted_at && (
                  <div className="bg-white px-4 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#777777]">
                      Submitted At
                    </p>
                    <p className="mt-2 text-sm font-bold text-[#5e5e5e]">
                      {formatDateTime(submission.submitted_at)}
                    </p>
                  </div>
                )}
              </div>
            </Panel>
          </div>
        )}

        {isLecturer && (
          <div className="mt-4">
            <Panel>
              <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <p className="mb-3 text-[10px] font-black uppercase tracking-[0.34em] text-[#777777]">
                    Lecturer Review
                  </p>

                  <h2 className="text-3xl font-black tracking-[-0.045em]">
                    Submissions
                  </h2>

                  <p className="mt-3 max-w-xl text-sm font-medium leading-7 text-[#5e5e5e]">
                    Review student answers, inspect attachments, and publish
                    grades with feedback.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <StatusPill>{submissions.length} total</StatusPill>
                  {lateCount > 0 && <StatusPill tone="late">{lateCount} late</StatusPill>}
                </div>
              </div>

              {submissions.length === 0 ? (
                <div className="bg-[#f3f3f3] px-6 py-12 text-center">
                  <p className="text-sm font-bold text-[#777777]">
                    No submissions yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {submissions.map((sub) => (
                    <article key={sub.id} className="bg-[#f3f3f3] p-5 md:p-6">
                      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                        <div>
                          <p className="text-lg font-black tracking-[-0.03em]">
                            {sub.student?.name ?? 'Unknown student'}
                          </p>

                          <p className="mt-1 text-xs font-bold text-[#777777]">
                            {sub.student?.email ?? 'No email available'}
                          </p>

                          {sub.submitted_at && (
                            <p className="mt-3 text-xs font-medium text-[#777777]">
                              Submitted {formatDateTime(sub.submitted_at)}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 md:justify-end">
                          {sub.status === 'graded' && (
                            <StatusPill tone="graded">{sub.grade}/100</StatusPill>
                          )}

                          <StatusPill tone={getStatusTone(sub.status)}>
                            {sub.status}
                          </StatusPill>

                          {sub.is_late && <StatusPill tone="late">Late</StatusPill>}
                        </div>
                      </div>

                      {sub.content && (
                        <div className="mt-5 bg-white px-4 py-4">
                          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-[#777777]">
                            Answer
                          </p>

                          <p className="whitespace-pre-wrap text-sm font-medium leading-7 text-[#3a3a3a]">
                            {sub.content}
                          </p>
                        </div>
                      )}

<div className="mt-6 flex flex-wrap items-center gap-3">
  {sub.file_url && (
    <a
      href={sub.file_url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-black transition hover:bg-[#e8e8e8]"
    >
      View Attachment
    </a>
  )}

  {grading !== sub.id && (
    <button
      type="button"
      onClick={() => {
        setGrading(sub.id);
        setGradeForm({
          grade: sub.grade?.toString() || '',
          feedback: sub.feedback || '',
        });
      }}
      className="inline-flex bg-black px-4 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:opacity-90"
    >
      {sub.status === 'graded' ? 'Edit Grade' : 'Grade'}
    </button>
  )}
</div>

{sub.feedback && grading !== sub.id && (
  <div className="mt-5 bg-white px-4 py-4">
    <p className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-[#777777]">
      Feedback
    </p>

    <p className="whitespace-pre-wrap text-sm font-medium leading-7 text-[#5e5e5e]">
      {sub.feedback}
    </p>
  </div>
)}

{grading === sub.id && (
  <div className="mt-6 bg-white px-4 py-4">
    <div className="grid gap-4 md:grid-cols-3">
      <div>
        <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-[#777777]">
          Grade
        </label>

        <input
          type="number"
          min="0"
          max="100"
          value={gradeForm.grade}
          onChange={(e) =>
            setGradeForm({
              ...gradeForm,
              grade: e.target.value,
            })
          }
          className="w-full bg-[#f3f3f3] px-4 py-3 text-sm font-bold outline-none"
          placeholder="0-100"
        />
      </div>

      <div className="md:col-span-2">
        <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-[#777777]">
          Feedback
        </label>

        <textarea
          value={gradeForm.feedback}
          onChange={(e) =>
            setGradeForm({
              ...gradeForm,
              feedback: e.target.value,
            })
          }
          rows={3}
          className="w-full resize-none bg-[#f3f3f3] px-4 py-3 text-sm font-medium leading-6 outline-none"
          placeholder="Write feedback..."
        />
      </div>
    </div>

    <div className="mt-4 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => handleGrade(sub.id)}
        className="bg-black px-4 py-3 text-xs font-black uppercase tracking-widest text-white"
      >
        Save Grade
      </button>

      <button
        type="button"
        onClick={() => {
          setGrading(null);
          setGradeForm({
            grade: '',
            feedback: '',
          });
        }}
        className="bg-[#eeeeee] px-4 py-3 text-xs font-black uppercase tracking-widest text-black"
      >
        Cancel
      </button>
    </div>
  </div>
)}
              
                    </article>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        )}
      </main>
    </div>
  );
}