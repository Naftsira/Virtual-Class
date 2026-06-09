'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/lib/store/auth';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import Cookies from 'js-cookie';
import Link from 'next/link';
import Image from 'next/image';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [preview, setPreview] = useState<string | null>(user?.avatar || null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      const formData = new FormData();
      if (name !== user?.name) formData.append('name', name);
      if (file) formData.append('avatar', file);

      const res = await api.post('/profile/update', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Update auth state dan cookie
      setUser(res.data);
      Cookies.set('user', JSON.stringify(res.data), { expires: 7 });
      setSuccess(true);
      setFile(null);
    } catch {
      alert('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="font-bold tracking-tight">LECTRA</Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium">Profile</span>
      </nav>

      <main className="max-w-lg mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold mb-8">Edit Profile</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-4">
            <div
              onClick={() => fileRef.current?.click()}
              className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-200 cursor-pointer hover:opacity-80 transition group"
            >
              {preview ? (
                <img src={preview} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white text-3xl font-bold">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <span className="text-white text-xs font-medium">Change</span>
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <p className="text-xs text-gray-400">Click to change profile picture (max 2MB)</p>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Your full name"
              required
            />
          </div>

          {/* Role — read only */}
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <div className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 capitalize">
              {user?.role}
            </div>
          </div>

          {/* Email — read only */}
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <div className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500">
              {user?.email}
            </div>
          </div>

          {success && (
            <div className="p-3 bg-green-50 text-green-600 rounded-lg text-sm">
              Profile updated successfully!
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-black text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </main>
    </div>
  );
}
