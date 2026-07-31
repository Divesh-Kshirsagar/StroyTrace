'use client';

import Link from 'next/link';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <nav className="border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 bg-white dark:bg-zinc-950 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-bold text-xl tracking-tight">
          Clarity
        </Link>
        <div className="hidden sm:flex items-center gap-4 text-sm font-medium">
          <Link href="/" className="text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white">
            Home
          </Link>
          <Link href="/topics" className="text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white">
            Topics
          </Link>
          <Link href="/search" className="text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white">
            Search
          </Link>
        </div>
      </div>
      
      <div className="flex items-center gap-4 text-sm font-medium">
        {isAuthenticated && user ? (
          <>
            <Link href="/dashboard" className="text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white">
              Dashboard
            </Link>
            <Link href={`/@${user.creator_profile?.handle}`} className="text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white">
              Profile
            </Link>
            <button onClick={logout} className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white">
              Log In
            </Link>
            <Link href="/register" className="bg-black text-white dark:bg-white dark:text-black px-4 py-2 rounded-md hover:opacity-90 transition-opacity">
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
