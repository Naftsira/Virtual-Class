'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/auth';
import { useAuth } from '@/lib/store/auth';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
  const user = await login(email, password);
  setUser(user);

  const redirectPath = sessionStorage.getItem('post_login_redirect');
  sessionStorage.removeItem('post_login_redirect');

  router.push(redirectPath || '/dashboard');
} catch (err: any) {
  setError(err.response?.data?.message || 'Login failed');
} finally {
  setLoading(false);
}
  };

  return (
    <>
      <div className="mb-8 md:mb-10">
        <h2 className="mb-2 text-3xl font-bold tracking-tight text-black sm:text-4xl md:text-3xl">
          Welcome Back
        </h2>
        <p className="text-sm font-medium leading-relaxed text-[#474747]">
          Enter your credentials to access your Lectra workspace.
        </p>
      </div>

      {error && (
        <div className="mb-6 border-l-2 border-[#ba1a1a] bg-[#ffdad6] px-4 py-3 text-sm font-medium text-[#410002]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-[#474747]">
            Email Address
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border-0 border-b border-[#777777]/20 bg-[#f3f3f3] px-4 py-3 text-sm font-medium text-black placeholder:text-[#777777] focus:border-black focus:bg-[#e2e2e2] focus:outline-none focus:ring-0"
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-[#474747]">
            Security Key
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
            {loading ? 'Signing In...' : 'Sign In'}
            <span className="transition-transform group-hover:translate-x-1">
              →
            </span>
          </button>
        </div>
      </form>

      <div className="mt-10 text-center md:mt-12">
        <p className="text-xs font-medium text-[#474747]">
          Do not have an account?
          <Link
            href="/register"
            className="ml-1 font-bold text-black underline-offset-4 transition-all hover:underline"
          >
            Request access
          </Link>
        </p>
      </div>

      <div className="mt-12 flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-black/30 md:mt-16">
        <span>Made with &hearts; by <Link href="https://instagram.com/naftalists" target='blank'>@naftalists</Link></span>

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