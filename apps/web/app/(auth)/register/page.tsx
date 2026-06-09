'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { register } from '@/lib/auth';
import { useAuth } from '@/lib/store/auth';
import Link from 'next/link';

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role: 'student' as 'lecturer' | 'student',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const router = useRouter();
  const formTopRef = useRef<HTMLDivElement | null>(null);

  const scrollFormToTop = () => {
    requestAnimationFrame(() => {
      formTopRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.password !== form.password_confirmation) {
      setError('Password confirmation does not match');
      scrollFormToTop();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = await register(form);
      setUser(user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
      scrollFormToTop();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div ref={formTopRef} className="scroll-mt-8" />

      <div className="mb-8 md:mb-10">
        <h2 className="mb-2 text-3xl font-bold tracking-tight text-black sm:text-4xl md:text-3xl">
          Create Workspace
        </h2>
        <p className="text-sm font-medium leading-relaxed text-[#474747]">
          Enter your credentials to join the Lectra workspace.
        </p>
      </div>

      {error && (
        <div className="mb-6 border-l-2 border-[#ba1a1a] bg-[#ffdad6] px-4 py-3 text-sm font-medium text-[#410002]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-[#474747]">
            Full Identity
          </label>

          <input
            name="name"
            type="text"
            value={form.name}
            onChange={handleChange}
            className="w-full border-0 border-b border-[#777777]/20 bg-[#f3f3f3] px-4 py-3 text-sm font-medium text-black placeholder:text-[#777777] focus:border-black focus:bg-[#e2e2e2] focus:outline-none focus:ring-0"
            placeholder="Theo Naftali"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-[#474747]">
            Email Address
          </label>

          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            className="w-full border-0 border-b border-[#777777]/20 bg-[#f3f3f3] px-4 py-3 text-sm font-medium text-black placeholder:text-[#777777] focus:border-black focus:bg-[#e2e2e2] focus:outline-none focus:ring-0"
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="space-y-3 pt-2">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-[#474747]">
            Operational Role
          </label>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              aria-pressed={form.role === 'student'}
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  role: 'student',
                }))
              }
              className={`flex flex-col items-center justify-center rounded-lg p-4 transition-all duration-200 ${
                form.role === 'student'
                  ? 'border-b-2 border-black bg-[#e2e2e2]'
                  : 'bg-[#f3f3f3] hover:bg-[#e8e8e8]'
              }`}
            >
              <span className="material-symbols-outlined mb-2 text-[24px]">
                person
              </span>
              <span className="text-xs font-bold uppercase tracking-tighter">
                Student
              </span>
            </button>

            <button
              type="button"
              aria-pressed={form.role === 'lecturer'}
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  role: 'lecturer',
                }))
              }
              className={`flex flex-col items-center justify-center rounded-lg p-4 transition-all duration-200 ${
                form.role === 'lecturer'
                  ? 'border-b-2 border-black bg-[#e2e2e2]'
                  : 'bg-[#f3f3f3] hover:bg-[#e8e8e8]'
              }`}
            >
              <span className="material-symbols-outlined mb-2 text-[24px]">
                school
              </span>
              <span className="text-xs font-bold uppercase tracking-tighter">
                Lecturer
              </span>
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-[#474747]">
            Security Key
          </label>

          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            className="w-full border-0 border-b border-[#777777]/20 bg-[#f3f3f3] px-4 py-3 text-sm font-medium text-black placeholder:text-[#777777] focus:border-black focus:bg-[#e2e2e2] focus:outline-none focus:ring-0"
            placeholder="••••••••••••"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-[#474747]">
            Confirm Security Key
          </label>

          <input
            name="password_confirmation"
            type="password"
            value={form.password_confirmation}
            onChange={handleChange}
            className="w-full border-0 border-b border-[#777777]/20 bg-[#f3f3f3] px-4 py-3 text-sm font-medium text-black placeholder:text-[#777777] focus:border-black focus:bg-[#e2e2e2] focus:outline-none focus:ring-0"
            placeholder="••••••••••••"
            required
          />
        </div>

        <div className="pt-4 md:pt-6">
          <button
            type="submit"
            disabled={loading}
            className="group flex w-full items-center justify-center gap-3 bg-black py-4 text-sm font-bold uppercase tracking-widest text-white transition-all hover:bg-[#3b3b3b] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Initializing...' : 'Initialize workspace'}
            <span className="transition-transform group-hover:translate-x-1">
              →
            </span>
          </button>
        </div>
      </form>

      <div className="mt-10 text-center md:mt-12">
        <p className="text-xs font-medium text-[#474747]">
          Already have an account?
          <Link
            href="/login"
            className="ml-1 font-bold text-black underline-offset-4 transition-all hover:underline"
          >
            Authenticate
          </Link>
        </p>
      </div>

      <div className="mt-12 flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-black/30 md:mt-16">
        <span>v2.0.4 &quot;Linear&quot;</span>

        <div className="flex gap-4">
          <a href="#" className="transition-colors hover:text-black">
            Terms
          </a>
          <a href="#" className="transition-colors hover:text-black">
            Privacy
          </a>
        </div>
      </div>
    </>
  );
}