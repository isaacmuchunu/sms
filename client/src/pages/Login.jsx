import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  ArrowRight,
  Info,
  ShieldCheck,
  Lock,
  Eye,
  EyeSlash,
} from '@phosphor-icons/react';
import useAuth from '../hooks/useAuth';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

// Swap this for your own licensed asset (recommended: a 1600px+ wide,
// landscape photo of learners with books and computers).
const HERO_IMAGE =
  'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=80';

const STATS = [
  { value: '500+', label: 'Institutions' },
  { value: '120K+', label: 'Students managed' },
  { value: '99.9%', label: 'Uptime' },
];

// Provider brand marks (official multicolor logos, per Google/Microsoft
// sign-in branding guidelines). Swap for monochrome if you prefer.
const MicrosoftIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path fill="#F25022" d="M1 1h10v10H1z" />
    <path fill="#7FBA00" d="M13 1h10v10H13z" />
    <path fill="#00A4EF" d="M1 13h10v10H1z" />
    <path fill="#FFB900" d="M13 13h10v10H13z" />
  </svg>
);

const GoogleIcon = ({ className }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
    <path
      fill="#FFC107"
      d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
    />
    <path
      fill="#FF3D00"
      d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
    />
  </svg>
);

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const validate = () => {
    const errors = {};
    if (!email || !email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email';
    }
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setLoading(true);

    try {
      const result = await login({ email, password, rememberMe });
      if (!result.success) {
        setError(result.message || 'Invalid email or password');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordKey = (e) => {
    if (typeof e.getModifierState === 'function') {
      setCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  const handleProviderLogin = (provider) => {
    alert(`OAuth login with ${provider} is not implemented yet`);
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[var(--bg)]">
      <div className="grid min-h-[100dvh] w-full lg:grid-cols-[1.1fr_1fr]">
        {/* Brand / Visual Panel */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-zinc-900 py-10 pl-10 pr-[120px] lg:flex xl:py-14 xl:pl-14 xl:pr-[180px]">
          {/* Photographic hero */}
          <img
            src={HERO_IMAGE}
            alt="Students working with books and laptops together"
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />

          {/* Legibility scrim + brand tint */}
          <div className="absolute inset-0 bg-zinc-950/45" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/55 to-zinc-950/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/70 to-transparent" />
          <div className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full bg-emerald-500/20 blur-[130px]" />

          {/* Logo */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/30 backdrop-blur-sm">
              <GraduationCap className="h-6 w-6 text-emerald-300" weight="fill" />
            </div>
            <span className="select-none text-lg font-bold uppercase tracking-[0.2em]">
              <span className="bg-gradient-to-br from-emerald-300 to-emerald-500 bg-clip-text text-transparent drop-shadow-[0_1px_10px_rgba(16,185,129,0.35)]">
                Edu
              </span>
              <span className="bg-gradient-to-br from-white to-zinc-300 bg-clip-text text-transparent">
                Manage
              </span>
            </span>
          </div>

          {/* Message + proof */}
          <div className="relative z-10 max-w-lg">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
              School Management Platform
            </span>
            <h1 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight text-white xl:text-5xl">
              Run academics, attendance, and finance in one place.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-zinc-300">
              The unified operating system trusted by modern institutions to
              manage every part of the school day.
            </p>

            <div className="mt-10 flex items-center gap-8 border-t border-white/10 pt-8">
              {STATS.map((stat) => (
                <div key={stat.label}>
                  <div className="text-2xl font-bold tracking-tight text-white">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-sm text-zinc-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer line */}
          <div className="relative z-10 flex items-center justify-between text-xs text-zinc-400">
            <span>
              &copy; {new Date().getFullYear()} EduManage. All rights reserved.
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-300" weight="fill" />
              SOC 2 Type II
            </span>
          </div>

          {/* Curved divider into the form panel */}
          <svg
            className="absolute inset-y-0 right-0 z-20 h-full w-[120px] xl:w-[180px]"
            viewBox="0 0 100 1000"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M 36 0 C 88 250 88 750 36 1000 L 100 1000 L 100 0 Z"
              style={{ fill: 'var(--bg)' }}
            />
            <path
              d="M 36 0 C 88 250 88 750 36 1000"
              fill="none"
              stroke="#34d399"
              strokeOpacity="0.4"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>

        {/* Form Panel */}
        <div className="relative flex flex-col items-center justify-center px-5 py-12 sm:px-6 lg:px-8">
          {/* Secure sign-in pill */}
          <div className="absolute right-5 top-6 hidden items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-500 sm:flex lg:right-8">
            <Lock className="h-3.5 w-3.5 text-emerald-600" weight="fill" />
            Secure sign-in
          </div>

          <div className="w-full max-w-sm">
            {/* Mobile Logo */}
            <div className="mb-12 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600">
                <GraduationCap className="h-6 w-6 text-white" weight="fill" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-zinc-900">
                  EduManage
                </h1>
                <p className="text-xs text-zinc-500">School Management System</p>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl">
                Welcome back
              </h2>
              <p className="mt-2 text-sm text-zinc-500">
                Sign in to your account to continue.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-6 flex items-start gap-2.5 rounded-lg border border-danger-200 bg-danger-50 p-3.5 text-sm text-danger-700"
              >
                <Info className="mt-0.5 h-4 w-4 shrink-0" weight="fill" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium text-zinc-700"
                >
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) {
                      setFieldErrors((prev) => ({ ...prev, email: '' }));
                    }
                  }}
                  placeholder="admin@school.com"
                  error={fieldErrors.email}
                  autoComplete="email"
                  autoFocus
                />
              </div>

              {/* Password */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-zinc-700"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="text-sm font-medium text-emerald-600 transition-colors hover:text-emerald-700"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) {
                        setFieldErrors((prev) => ({ ...prev, password: '' }));
                      }
                    }}
                    onKeyUp={handlePasswordKey}
                    onKeyDown={handlePasswordKey}
                    placeholder="Enter your password"
                    error={fieldErrors.password}
                    autoComplete="current-password"
                    className="pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-0 flex h-11 items-center text-zinc-400 transition-colors hover:text-zinc-600"
                  >
                    {showPassword ? (
                      <EyeSlash className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {capsLockOn && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-500">
                    <Info className="h-3.5 w-3.5" weight="fill" />
                    Caps Lock is on
                  </p>
                )}
              </div>

              {/* Remember me */}
              <label className="flex w-fit cursor-pointer select-none items-center gap-2 text-sm text-zinc-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 accent-emerald-600"
                />
                Keep me signed in
              </label>

              <Button
                type="submit"
                size="lg"
                isLoading={loading}
                className="w-full"
              >
                Sign In
                {!loading && <ArrowRight className="h-4 w-4" weight="bold" />}
              </Button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-zinc-200" />
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                or continue with
              </span>
              <div className="h-px flex-1 bg-zinc-200" />
            </div>

            {/* SSO */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleProviderLogin('microsoft')}
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-2"
              >
                <MicrosoftIcon className="h-5 w-5" />
                Continue with Microsoft
              </button>
              <button
                type="button"
                onClick={() => handleProviderLogin('google')}
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-2"
              >
                <GoogleIcon className="h-5 w-5" />
                Continue with Google
              </button>
            </div>

            {/* Security reassurance */}
            <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-zinc-400">
              <Lock className="h-3.5 w-3.5" weight="fill" />
              Protected with 256-bit TLS encryption
            </div>

            <p className="mt-8 text-center text-xs text-zinc-400">
              Privacy &middot; Terms &middot; Support
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;