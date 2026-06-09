'use client';

import Link from 'next/link';

type DashboardUser = {
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

type NavItem = {
  label: string;
  href: string;
  icon: string;
  match: (pathname: string) => boolean;
  roles?: string[];
};

const navItems: NavItem[] = [
  {
    label: 'Overview',
    href: '/dashboard',
    icon: 'space_dashboard',
    match: (pathname) => pathname === '/dashboard',
  },
  {
    label: 'Courses',
    href: '/courses',
    icon: 'view_agenda',
    match: (pathname) => pathname.startsWith('/courses'),
  },
  {
    label: 'Schedule',
    href: '/schedule',
    icon: 'calendar_month',
    match: (pathname) => pathname.startsWith('/schedule'),
  },
  {
    label: 'Join Course',
    href: '/enroll',
    icon: 'login',
    roles: ['student'],
    match: (pathname) => pathname.startsWith('/enroll'),
  },
  {
    label: 'Profile',
    href: '/profile',
    icon: 'person',
    match: (pathname) => pathname.startsWith('/profile'),
  },
];

function initials(name?: string | null) {
  if (!name) return 'L';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function DashboardSidebar({
  user,
  pathname,
  onLogout,
}: {
  user: DashboardUser;
  pathname: string;
  onLogout: () => void;
}) {
  const visibleItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(user.role ?? '');
  });

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 bg-[#f3f3f3] px-5 py-6 md:flex md:flex-col">
        <Link href="/dashboard" className="mb-12 block">
          <span className="block text-[10px] font-bold uppercase tracking-[0.36em] text-[#777777]">
            Institutional Workspace
          </span>
          <span className="mt-2 block text-3xl font-black tracking-tighter text-black">
            Lectra
          </span>
        </Link>

        <nav className="space-y-2">
          {visibleItems.map((item) => {
            const active = item.match(pathname);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? 'bg-[#e8e8e8] text-black'
                    : 'text-[#5e5e5e] hover:bg-[#eeeeee] hover:text-black'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto bg-white px-4 py-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-xs font-black text-white">
              {initials(user.name)}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-black">
                {user.name ?? 'Lectra User'}
              </p>
              <p className="truncate text-[11px] font-medium capitalize text-[#777777]">
                {user.role ?? 'member'}
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full bg-[#eeeeee] px-4 py-2.5 text-left text-xs font-bold uppercase tracking-widest text-[#474747] transition hover:bg-[#e2e2e2] hover:text-black"
          >
            Logout
          </button>
        </div>
      </aside>

      <nav className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-4 bg-white/85 p-1 backdrop-blur-[20px] md:hidden">
        {visibleItems.slice(0, 4).map((item) => {
          const active = item.match(pathname);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 px-2 py-2 text-[10px] font-bold transition ${
                active
                  ? 'bg-black text-white'
                  : 'text-[#5e5e5e] hover:bg-[#eeeeee] hover:text-black'
              }`}
            >
              <span className="material-symbols-outlined text-[19px]">
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
