'use client';

import { useEffect, useState, useRef } from 'react';
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
  student?: { id: string; name: string; email: string };
}

export default function AssignmentPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [grading, setGrading] = useState<string | null>(null);
  const [gradeForm, setGradeForm] = useState<{ grade: string; feedback: string }>({ grade: '', feedback: '' });
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (authLoading || !user) return;

    const fetchData = async () => {
      try {
        // Get assignment — cari dari courses
        const assignmentRes = await api.get(`/assignments/${id}`);
        setAssignment(assignmentRes.data);

        if (user.role === 'student') {
          const subRes = await api.get(`/assignments/${id}/submissions/my`);
          if (subRes.data) {
            setSubmission(subRes.data);
            setContent(subRes.data.content || '');
          }
        } else {
          const subsRes = await api.get(`/assignments/${id}/submissions`);
          setSubmissions(subsRes.data);
        }
      } catch {
        router.push('/courses');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      if (content) formData.append('content', content);
      if (file) formData.append('file', file);

      const res = await api.post(`/assignments/${id}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSubmission(res.data);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch {
      alert('Failed to submit.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGrade = async (submissionId: string) => {
    try {
      const res = await api.post(`/assignments/${id}/submissions/${submissionId}/grade`, {
        grade: parseFloat(gradeForm.grade),
        feedback: gradeForm.feedback,
      });
      setSubmissions((prev) => prev.map((s) => s.id === submissionId ? res.data : s));
      setGrading(null);
      setGradeForm({ grade: '', feedback: '' });
    } catch {
      alert('Failed to grade.');
    }
  };

  const statusColor = (status: string) => {
    if (status === 'graded') return 'bg-green-100 text-green-700';
    if (status === 'submitted') return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-500';
  };

  if (authLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400 text-sm">Loading...</p>
    </div>
  );

  if (!assignment) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="font-bold tracking-tight">LECTRA</Link>
        <span className="text-gray-300">/</span>
        <Link href="/courses" className="text-sm text-gray-500 hover:text-black">Courses</Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium">{assignment.title}</span>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Assignment Info */}
        <div className="bg-white rounded-2xl border p-6 mb-6">
          <h1 className="text-2xl font-bold mb-2">{assignment.title}</h1>
          {assignment.description && (
            <p className="text-gray-600 text-sm mb-4">{assignment.description}</p>
          )}
          {assignment.due_at && (
            <p className="text-xs text-gray-400">
              Due: {new Date(assignment.due_at).toLocaleString()}
            </p>
          )}
        </div>

        {/* Student View */}
        {user?.role === 'student' && (
          <div className="bg-white rounded-2xl border p-6">
            <h2 className="font-semibold mb-4">
              {submission ? 'Your Submission' : 'Submit Assignment'}
            </h2>

            {/* Show grade if graded */}
            {submission?.status === 'graded' && (
              <div className="mb-4 p-4 bg-green-50 rounded-xl">
                <p className="text-sm font-medium text-green-700">
                  Grade: {submission.grade}/100
                </p>
                {submission.feedback && (
                  <p className="text-sm text-green-600 mt-1">{submission.feedback}</p>
                )}
              </div>
            )}

            {submission && (
              <div className="mb-4 flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusColor(submission.status)}`}>
                  {submission.status}
                </span>
                {submission.submitted_at && (
                  <span className="text-xs text-gray-400">
                    Submitted {new Date(submission.submitted_at).toLocaleString()}
                  </span>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Answer</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  rows={5}
                  placeholder="Write your answer here..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Attachment <span className="text-gray-400 font-normal">(optional, max 10MB)</span>
                </label>
                <input
                  ref={fileRef}
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
                {submission?.file_url && !file && (
                  <a
                    href={submission.file_url ?? '#'}
                    target="_blank"
                    className="text-xs text-blue-500 hover:underline mt-1 block"
                  >
                    View current attachment
                  </a>
                )}
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition"
              >
                {submitting ? 'Submitting...' : submission ? 'Update Submission' : 'Submit'}
              </button>
            </form>
          </div>
        )}

        {/* Lecturer View */}
        {user?.role === 'lecturer' && (
          <div>
            <h2 className="font-semibold mb-4">
              Submissions ({submissions.length})
            </h2>
            {submissions.length === 0 ? (
              <p className="text-gray-400 text-sm">No submissions yet.</p>
            ) : (
              <div className="space-y-4">
                {submissions.map((sub) => (
                  <div key={sub.id} className="bg-white rounded-2xl border p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium text-sm">{sub.student?.name}</p>
                        <p className="text-xs text-gray-400">{sub.student?.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {sub.status === 'graded' && (
                          <span className="text-sm font-bold">{sub.grade}/100</span>
                        )}
                        <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusColor(sub.status)}`}>
                          {sub.status}
                        </span>
                      </div>
                    </div>

                    {sub.content && (
                      <p className="text-sm text-gray-600 mb-3 whitespace-pre-wrap">{sub.content}</p>
                    )}
                    {sub.file_url && (
                      <a
                        href={sub.file_url}
                        target="_blank"
                        className="text-xs text-blue-500 hover:underline block mb-3"
                      >
                        View attachment
                      </a>
                    )}

                    {sub.feedback && (
                      <p className="text-xs text-gray-500 italic mb-3">Feedback: {sub.feedback}</p>
                    )}

                    {grading === sub.id ? (
                      <div className="space-y-3 mt-3 pt-3 border-t">
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <label className="block text-xs font-medium mb-1">Grade (0-100)</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={gradeForm.grade}
                              onChange={(e) => setGradeForm({ ...gradeForm, grade: e.target.value })}
                              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">Feedback</label>
                          <textarea
                            value={gradeForm.feedback}
                            onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                            rows={2}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleGrade(sub.id)}
                            className="bg-black text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                          >
                            Save Grade
                          </button>
                          <button
                            onClick={() => setGrading(null)}
                            className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setGrading(sub.id);
                          setGradeForm({ grade: sub.grade?.toString() || '', feedback: sub.feedback || '' });
                        }}
                        className="text-xs text-gray-500 hover:text-black transition"
                      >
                        {sub.status === 'graded' ? 'Edit Grade' : 'Grade'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
