import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInAsDemo,
    loading,
    user,
  } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate('/explore', { replace: true });
    }
  }, [user, loading, navigate]);

  const switchMode = () => {
    setMode((prev) => (prev === 'login' ? 'register' : 'login'));
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, fullName);
      }
      navigate('/explore');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to authenticate');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start Google sign-in');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-4xl grid lg:grid-cols-[1.1fr_0.9fr] gap-10 border border-white/10 rounded-3xl p-8 bg-white/5 backdrop-blur">
        <section>
          <p className="text-xs uppercase tracking-[0.5em] text-white/40">Wardrobe AI</p>
          <h1 className="text-4xl font-semibold mt-3">Sign in to remix outfits with credits.</h1>
          <p className="text-white/60 mt-4">
            Each generation consumes credits. Purchase packs anytime and keep your gallery growing.
          </p>
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between text-sm text-white/60">
              <span>{mode === 'login' ? 'Need an account?' : 'Already have an account?'}</span>
              <button
                onClick={switchMode}
                className="text-white hover:text-purple-300 transition"
                type="button"
              >
                {mode === 'login' ? 'Create one' : 'Sign in'}
              </button>
            </div>
            <button
              onClick={handleGoogle}
              disabled={loading || submitting}
              className="w-full flex items-center justify-center gap-3 rounded-2xl border border-white/20 py-3 text-sm font-semibold text-white/80 hover:text-white hover:border-white/40 transition disabled:opacity-50"
              type="button"
            >
              <span role="img" aria-hidden>🟦</span>
              Continue with Google
            </button>
            <button
              onClick={async () => {
                await signInAsDemo();
                navigate('/explore');
              }}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-3 rounded-2xl border border-dashed border-white/20 py-3 text-sm font-semibold text-white/60 hover:text-white hover:border-white/40 transition disabled:opacity-50"
              type="button"
            >
              <span role="img" aria-hidden>🧪</span>
              Continue as demo user
            </button>
            <p className="text-xs text-white/40 text-center">
              Demo login loads a sandbox profile with 10 credits so you can test generation right away.
            </p>
          </div>
        </section>

        <section className="bg-black/40 rounded-3xl p-6 border border-white/10">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="text-xs uppercase tracking-[0.4em] text-white/40">Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="w-full mt-2 rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white focus:outline-none focus:border-white/40"
                  placeholder="How should we call you?"
                  required
                />
              </div>
            )}
            <div>
              <label className="text-xs uppercase tracking-[0.4em] text-white/40">Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full mt-2 rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white focus:outline-none focus:border-white/40"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.4em] text-white/40">Password</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full mt-2 rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white focus:outline-none focus:border-white/40"
                placeholder="••••••••"
                minLength={8}
                required
              />
            </div>
            {error && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 text-sm text-red-100 px-4 py-3">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-white text-black font-semibold py-3 hover:bg-white/90 transition disabled:opacity-50"
            >
              {submitting ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default AuthPage;
