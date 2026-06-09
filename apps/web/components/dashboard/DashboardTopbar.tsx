'use client';

import Link from 'next/link';

type DashboardUser = {
  name?: string | null;
  email?: string | null;
  role?: string | null;
  avatar?: string | null;
};

function initials(name?: string | null) {
  if (!name) return 'L';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function DashboardTopbar({
  user,
  title,
  onLogout,
}: {
  user: DashboardUser;
  title: string;
  onLogout: () => void;
}) {
  return (
    <header className="fixed inset-x-0 top-0 z-30 bg-[#f9f9f9]/80 px-4 py-3 backdrop-blur-[20px] sm:px-6 md:left-72 md:px-8 lg:px-10">
      <div className="mx-auto flex h-11 w-full max-w-7xl items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#777777]">
            Lectra
          </p>
          <h1 className="truncate text-sm font-black uppercase tracking-[0.16em] text-black">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            className="flex items-center gap-3 bg-white px-2.5 py-2 transition hover:bg-[#f3f3f3]"
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt="avatar"
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-[10px] font-black text-white">
                {initials(user.name)}
              </div>
            )}

            <div className="hidden min-w-0 sm:block">
              <p className="max-w-36 truncate text-xs font-bold text-black">
                {user.name ?? 'Lectra User'}
              </p>
              <p className="truncate text-[10px] font-semibold capitalize text-[#777777]">
                {user.role ?? 'member'}
              </p>
            </div>
          </Link>

          <button
            onClick={onLogout}
            className="hidden bg-[#eeeeee] px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#474747] transition hover:bg-[#e2e2e2] hover:text-black sm:block"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}