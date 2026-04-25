'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/store';
import { api } from '@/lib/api';

type Mode = 'login' | 'signup';

export default function AuthPage() {
  const router = useRouter();
  const { setSession } = useSession();
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = mode === 'login'
        ? await api.login(username.trim(), password)
        : await api.signup(username.trim(), password);
      setSession(res.token, res.user);
      router.push('/');
    } catch (err) {
      setError((err as Error).message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="max-w-sm mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-white">{mode === 'login' ? 'Sign in' : 'Create an account'}</h1>
      <p className="text-sm text-neutral-400">
        Signed-up accounts keep their rating and game history. Guests can still play.
      </p>
      <form onSubmit={submit} className="card space-y-3">
        <label className="block">
          <span className="text-sm text-neutral-400">Username</span>
          <input
            className="input w-full mt-1"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            minLength={3}
            maxLength={24}
            pattern="[A-Za-z0-9_\-]+"
            required
          />
        </label>
        <label className="block">
          <span className="text-sm text-neutral-400">Password</span>
          <input
            type="password"
            className="input w-full mt-1"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={8}
            maxLength={128}
            required
          />
        </label>
        {error && <div className="text-sm text-red-400">{error}</div>}
        <button type="submit" disabled={loading} className="btn w-full">
          {loading ? '…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>
      <div className="text-sm text-neutral-400 text-center">
        {mode === 'login' ? (
          <>No account? <button className="underline text-brand" onClick={() => setMode('signup')}>Sign up</button></>
        ) : (
          <>Already have an account? <button className="underline text-brand" onClick={() => setMode('login')}>Sign in</button></>
        )}
      </div>
    </section>
  );
}
