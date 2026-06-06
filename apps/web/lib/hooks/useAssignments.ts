import { useEffect, useState } from 'react';
import api from '../axios';

export interface Assignment {
  id: string;
  course_id: string;
  session_id: string | null;
  title: string;
  description: string | null;
  due_at: string | null;
  created_at: string;
}

export function useAssignments(courseId: string) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/courses/${courseId}/assignments`)
      .then((res) => setAssignments(res.data))
      .finally(() => setLoading(false));
  }, [courseId]);

  const createAssignment = async (data: {
    title: string;
    description?: string;
    due_at?: string;
    session_id?: string;
  }) => {
    // Konversi datetime-local ke ISO format yang benar
    const payload = {
      ...data,
      due_at: data.due_at ? new Date(data.due_at).toISOString() : undefined,
    };
    const res = await api.post(`/courses/${courseId}/assignments`, payload);
    setAssignments((prev) => [res.data, ...prev]);
    return res.data;
  };

  const deleteAssignment = async (id: string) => {
    await api.delete(`/courses/${courseId}/assignments/${id}`);
    setAssignments((prev) => prev.filter((a) => a.id !== id));
  };

  return { assignments, loading, createAssignment, deleteAssignment };
}
