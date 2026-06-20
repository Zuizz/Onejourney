import { useState } from 'react';
import { Mail, Lock, User, ArrowRight, LogIn } from 'lucide-react';

export default function LoginScreen({ onAuthSuccess, showToast }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || (isSignUp && !name)) {
      showToast('Please fill in all fields', 'warning');
      return;
    }

    setLoading(true);
    const endpoint = isSignUp ? '/api/auth/signup' : '/api/auth/login';
    const payload = isSignUp ? { email, password, name } : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      showToast(isSignUp ? 'Signup successful! Welcome.' : 'Signed in successfully!', 'success');
      onAuthSuccess(data.user, data.session?.access_token);
    } catch (err) {
      showToast(err.message, 'warning');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const supabaseUrl = 'https://ndqjshvxjodbjziujwhe.supabase.co';
    const redirectTo = encodeURIComponent(window.location.origin + '/');
    const authUrl = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${redirectTo}`;
    window.location.href = authUrl;
  };

  return (
    <div className="screen-pad flex flex-col justify-center animate-fade-in" style={{ minHeight: '650px', padding: '32px 24px' }}>
      <div className="flex flex-col items-center mb-16 text-center">
        <div style={{
          width: 56, height: 56, borderRadius: '16px',
          background: 'linear-gradient(135deg, var(--indigo-500), var(--indigo-700))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'var(--shadow-lg)', marginBottom: 16
        }}>
          <LogIn size={26} color="#fff" />
        </div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--grey-900)', letterSpacing: '-0.5px' }}>
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h1>
        <p className="text-xs text-muted" style={{ marginTop: 4 }}>
          {isSignUp ? 'Sign up to start planning your smart Mumbai commute' : 'Sign in to access your Commute DNA & bookings'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-16 w-full">
        {isSignUp && (
          <div className="flex flex-col gap-8">
            <label className="text-xs font-semibold text-muted">Full Name label</label>
            <div style={{ position: 'relative' }}>
              <User size={16} className="text-muted" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%', padding: '12px 14px 12px 42px',
                  borderRadius: 'var(--radius-md)', border: '1px solid var(--grey-200)',
                  fontSize: '0.85rem', outline: 'none', background: '#fff'
                }}
              />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-8">
          <label className="text-xs font-semibold text-muted">Email address</label>
          <div style={{ position: 'relative' }}>
            <Mail size={16} className="text-muted" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%', padding: '12px 14px 12px 42px',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--grey-200)',
                fontSize: '0.85rem', outline: 'none', background: '#fff'
              }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <label className="text-xs font-semibold text-muted">Password</label>
          <div style={{ position: 'relative' }}>
            <Lock size={16} className="text-muted" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%', padding: '12px 14px 12px 42px',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--grey-200)',
                fontSize: '0.85rem', outline: 'none', background: '#fff'
              }}
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary w-full mt-8"
          disabled={loading}
          style={{ padding: '14px', borderRadius: 'var(--radius-md)', justifyContent: 'center' }}
        >
          {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
          {!loading && <ArrowRight size={16} style={{ marginLeft: 4 }} />}
        </button>
      </form>

      <div style={{ margin: '24px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--grey-200)' }} />
        <span className="text-xs text-muted">or continue with</span>
        <div style={{ flex: 1, height: 1, background: 'var(--grey-200)' }} />
      </div>

      <button
        onClick={handleGoogleLogin}
        className="btn"
        style={{
          background: '#fff', border: '1px solid var(--grey-200)',
          color: 'var(--grey-900)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: '12px', borderRadius: 'var(--radius-md)',
          fontWeight: 600, fontSize: '0.85rem'
        }}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" style={{ marginRight: 8 }}>
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Google
      </button>

      <p className="text-sm text-center" style={{ marginTop: 24, color: 'var(--grey-500)' }}>
        {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
        <span
          onClick={() => setIsSignUp(!isSignUp)}
          style={{ color: 'var(--indigo-600)', cursor: 'pointer', fontWeight: 600 }}
        >
          {isSignUp ? 'Sign In' : 'Sign Up'}
        </span>
      </p>
    </div>
  );
}
