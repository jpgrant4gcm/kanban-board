import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Paste the SAME two values that are already at the top of your App.jsx file.
const SUPABASE_URL = "https://lzpvctjxfxdkqxdnetzn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_-eC77WM8jOhS0onlH7WK4g_0EvJJ4Ey";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "That email and password don't match an account. Check the address, or ask an admin to reset your password."
          : error.message
      );
    }
    setBusy(false);
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && email && password && !busy) signIn();
  }

  return (
    <div className="min-h-full flex items-center justify-center bg-slate-100 dark:bg-slate-900 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Grant Capital Management
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Sign in to reach the team dashboard.
        </p>

        <div className="mt-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Email
          </label>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={onKeyDown}
            className="mt-1 w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500"
          />

          <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Password
          </label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={onKeyDown}
            className="mt-1 w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500"
          />

          {error && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <button
            onClick={signIn}
            disabled={busy || !email || !password}
            className="mt-5 w-full rounded bg-slate-900 dark:bg-slate-100 px-3 py-2 text-white dark:text-slate-900 font-medium disabled:opacity-40"
          >
            {busy ? "Signing in" : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SignOutButton({ email }) {
  return (
    <button
      onClick={() => supabase.auth.signOut()}
      title={email}
      className="fixed bottom-3 right-3 z-50 rounded border border-slate-300 dark:border-slate-600 bg-white/90 dark:bg-slate-800/90 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 shadow-sm"
    >
      Sign out
    </button>
  );
}

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (checking) {
    return (
      <div className="min-h-full flex items-center justify-center bg-slate-100 dark:bg-slate-900 text-sm text-slate-500">
        Checking your sign in
      </div>
    );
  }

  if (!session) return <SignIn />;

  return (
    <>
      {children}
      <SignOutButton email={session.user.email} />
    </>
  );
}
