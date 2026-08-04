"use client";

import { useAuth } from "@/features/auth/hooks/useAuth";
import type { LoginRequest } from "@/generated/types.gen";
import { useState } from "react";
import { createPortal } from "react-dom";

/**
 * Shown when the refresh token has expired and the user must re-authenticate.
 * Renders as a portal over all content so it works inside any layout.
 * The user can log in without losing their place in the app.
 */
export default function SessionExpiredModal() {
  const { sessionExpired, dismissSessionExpired, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!sessionExpired) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await login({ email, password } as LoginRequest);
      // login() navigates on success — modal disappears because sessionExpired resets
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const modal = (
    // Backdrop
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
    >
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <div className="text-center mb-5">
          <div className="text-3xl mb-2">🔒</div>
          <h2
            id="session-expired-title"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
          >
            Your session has expired
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            Sign in again to continue — you won&apos;t lose your place.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="session-email"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Email
            </label>
            <input
              id="session-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="session-password"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Password
            </label>
            <input
              id="session-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2 text-sm transition-colors"
          >
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <button
          onClick={dismissSessionExpired}
          className="mt-4 w-full text-center text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          Continue without signing in
        </button>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modal, document.body)
    : null;
}
