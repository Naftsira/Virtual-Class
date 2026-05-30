'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/store/auth';
import { useCourses } from '@/lib/hooks/useCourses';
import Link from 'next/link';

export default function CoursesPage() {
  const { user } = useAuth();
  const { courses, loading, createCourse, deleteCourse } = useCourses();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createCourse(form);
      setForm({ code: '', name: '', description: '' });
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="font-bold tracking-tight">LECTRA</Link>
        <span className="text-sm text-gray-500">{user?.name}</span>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Courses</h1>
          {user?.role === 'lecturer' && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition"
            >
              {showForm ? 'Cancel' : '+ New Course'}
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-6 mb-6 space-y-4">
            <h2 className="font-semibold">Create New Course</h2>
            <div>
              <label className="block text-sm font-medium mb-1">Course Code</label>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="IF-001"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Course Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Advanced Web Architecture"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Optional description..."
                rows={3}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition"
            >
              {submitting ? 'Creating...' : 'Create Course'}
            </button>
          </form>
        )}

        {loading ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : courses.length === 0 ? (
          <p className="text-gray-400 text-sm">No courses yet.</p>
        ) : (
          <div className="space-y-3">
            {courses.map((course) => (
              <div key={course.id} className="bg-white rounded-2xl border p-6 flex items-center justify-between hover:shadow-md transition">
                <Link href={`/courses/${course.id}`} className="flex-1">
                  <span className="text-xs text-gray-400 font-mono">{course.code}</span>
                  <h2 className="font-semibold">{course.name}</h2>
                  {course.description && (
                    <p className="text-sm text-gray-500 mt-1">{course.description}</p>
                  )}
                </Link>
                {user?.role === 'lecturer' && (
                  <button
                    onClick={() => deleteCourse(course.id)}
                    className="text-red-400 hover:text-red-600 text-sm ml-4 transition"
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
