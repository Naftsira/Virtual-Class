'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store/auth';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import DashboardTopbar from '@/components/dashboard/DashboardTopbar';

type DashboardUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  avatar?: string | null;
};

function resolvePageTitle(pathname: string) {
  if (pathname === '/dashboard') return 'Overview';
  if (pathname.startsWith('/courses')) return 'Courses';
  if (pathname.startsWith('/schedule')) return 'Schedule';
  if (pathname.startsWith('/profile')) return 'Profile';
  if (pathname.startsWith('/gate')) return 'Access Gate';
  if (pathname.startsWith('/enroll')) return 'Enrollment';

  return 'Workspace';
}

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
  if (!loading && !user) {
    sessionStorage.setItem('post_login_redirect', pathname);
    router.replace('/login');
  }
}, [loading, user, router, pathname]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#eeeeee] text-[#1a1c1c]">
        <div className="w-full max-w-xs bg-white px-8 py-10 text-center">
          <div className="mx-auto mb-5 h-8 w-8 animate-spin rounded-full border-2 border-black/20 border-t-black" />
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#5e5e5e]">
            Preparing Workspace
          </p>
        </div>
      </div>
    );
  }

  const currentUser = user as DashboardUser;

  return (
    <div className="min-h-dvh bg-[#eeeeee] text-[#1a1c1c]">
      <DashboardSidebar
        user={currentUser}
        pathname={pathname}
        onLogout={handleLogout}
      />

      <div className="md:pl-72">
        <DashboardTopbar
          user={currentUser}
          title={resolvePageTitle(pathname)}
          onLogout={handleLogout}
        />

        <main className="min-h-dvh px-4 pb-28 pt-20 sm:px-6 md:px-8 md:pb-16 md:pt-24 lg:px-10">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}