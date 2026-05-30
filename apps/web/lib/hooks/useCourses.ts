import { useEffect, useState } from 'react';
import api from '../axios';

export interface Course {
  id: string;
  code: string;
  name: string;
  description: string | null;
  lecturer_id: string;
  created_at: string;
}

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/courses')
      .then((res) => setCourses(res.data))
      .finally(() => setLoading(false));
  }, []);

  const createCourse = async (data: {
    code: string;
    name: string;
    description?: string;
  }) => {
    const res = await api.post('/courses', data);
    setCourses((prev) => [...prev, res.data]);
    return res.data;
  };

  const deleteCourse = async (id: string) => {
    await api.delete(`/courses/${id}`);
    setCourses((prev) => prev.filter((c) => c.id !== id));
  };

  return { courses, loading, createCourse, deleteCourse };
}
