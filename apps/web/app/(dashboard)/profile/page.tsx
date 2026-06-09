'use client';

import { useRef, useState } from 'react';
import { useAuth } from '@/lib/store/auth';
import api from '@/lib/axios';
import Cookies from 'js-cookie';
import PageHeader from '@/components/dashboard/PageHeader';
import SurfacePanel from '@/components/dashboard/SurfacePanel';
import StatusBadge from '@/components/dashboard/StatusBadge';

function initials(name?: string | null) {
  if (!name) return 'L';

  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [preview, setPreview] = useState<string | null>(user?.avatar || null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];

    if (!f) return;

    setFile(f);
    setPreview(URL.createObjectURL(f));
    setSuccess(false);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError('');

    try {
      const formData = new FormData();

      if (name !== user?.name) formData.append('name', name);
      if (file) formData.append('avatar', file);

      const res = await api.post('/profile/update', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setUser(res.data);
      Cookies.set('user', JSON.stringify(res.data), { expires: 7 });
      setSuccess(true);
      setFile(null);
    } catch {
      setError('Profile could not be updated. Review the image size or try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Account Identity"
        title="Profile settings."
        description="Manage the identity shown across your Lectra workspace, course sessions, chat panels, and classroom activity."
      />

      <div className="grid gap-4 lg:grid-cols-12">
        <SurfacePanel tone="inverse" className="lg:col-span-5">
          <div className="flex min-h-[420px] flex-col justify-between">
            <div>
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.34em] text-white/45">
                Workspace Identity
              </p>

              <h2 className="max-w-sm text-4xl font-black leading-[0.95] tracking-[-0.055em] text-white md:text-5xl">
                Your presence inside the classroom.
              </h2>

              <p className="mt-5 max-w-md text-sm font-medium leading-7 text-white/60">
                A clean profile keeps participants, instructors, and course
                spaces easier to recognize during live learning.
              </p>
            </div>

            <div className="mt-10 bg-white/8 px-5 py-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
                Active Role
              </p>
              <p className="mt-2 text-2xl font-black capitalize tracking-[-0.04em] text-white">
                {user.role}
              </p>
            </div>
          </div>
        </SurfacePanel>

        <SurfacePanel tone="lowest" className="lg:col-span-7">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid gap-8 md:grid-cols-[auto_1fr] md:items-center">
              <div className="flex flex-col items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="group relative h-32 w-32 overflow-hidden rounded-full bg-[#eeeeee] transition hover:opacity-90"
                >
                  {preview ? (
                    <img
                      src={preview}
                      alt="avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-black text-4xl font-black text-white">
                      {initials(user.name)}
                    </div>
                  )}

                  <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">
                      Change
                    </span>
                  </div>
                </button>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <p className="max-w-40 text-center text-[11px] font-medium leading-5 text-[#777777]">
                  Click avatar to update profile picture. Recommended under
                  2MB.
                </p>
              </div>

              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.34em] text-[#777777]">
                  Public Display
                </p>

                <h2 className="text-3xl font-black tracking-[-0.045em] text-black">
                  {user.name}
                </h2>

                <p className="mt-3 text-sm font-medium leading-6 text-[#5e5e5e]">
                  This identity appears in sessions, participant lists,
                  submissions, and course membership surfaces.
                </p>

                <div className="mt-5">
                  <StatusBadge variant="neutral">{user.role}</StatusBadge>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#474747]">
                  Full Name
                </label>

                <input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setSuccess(false);
                    setError('');
                  }}
                  className="w-full border-0 border-b border-[#777777]/20 bg-[#e8e8e8] px-4 py-3 text-sm font-medium text-black placeholder:text-[#777777] focus:border-black focus:bg-[#e2e2e2] focus:outline-none focus:ring-0"
                  placeholder="Your full name"
                  required
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="bg-[#f3f3f3] px-4 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#777777]">
                    Role
                  </p>
                  <p className="mt-2 text-sm font-black capitalize text-black">
                    {user.role}
                  </p>
                </div>

                <div className="bg-[#f3f3f3] px-4 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#777777]">
                    Email
                  </p>
                  <p className="mt-2 truncate text-sm font-black text-black">
                    {user.email ?? 'No email available'}
                  </p>
                </div>
              </div>
            </div>

            {success && (
              <div className="bg-[#e2e2e2] px-4 py-3 text-sm font-bold text-black">
                Profile updated successfully.
              </div>
            )}

            {error && (
              <div className="bg-[#ffdad6] px-4 py-3 text-sm font-bold text-[#410002]">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-medium leading-5 text-[#777777]">
                Changes are reflected across your active Lectra workspace after
                saving.
              </p>

              <button
                type="submit"
                disabled={saving}
                className="bg-[linear-gradient(135deg,_#000000,_#3b3b3b)] px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </SurfacePanel>
      </div>
    </>
  );
}