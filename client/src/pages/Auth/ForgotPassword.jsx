import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Envelope, ArrowLeft, CheckCircle, Info } from '@phosphor-icons/react';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');

  const validate = () => {
    if (!email.trim()) {
      setFieldError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldError('Please enter a valid email');
      return false;
    }
    setFieldError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <Card className="w-full max-w-md p-8">
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-emerald-600"
        >
          <ArrowLeft className="h-4 w-4" weight="bold" />
          Back to sign in
        </button>

        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Envelope size={24} weight="bold" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Forgot password?
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Enter your email and we will send you a secure link to reset your password.
          </p>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-danger-200 bg-danger-50 p-3.5 text-sm text-danger-700">
            <Info className="mt-0.5 h-4 w-4 shrink-0" weight="fill" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {submitted ? (
          <div className="rounded-lg border border-success-200 bg-success-50 p-5 text-center">
            <CheckCircle className="mx-auto mb-2 h-8 w-8 text-success-600" weight="fill" />
            <h2 className="text-base font-semibold text-zinc-900">Check your inbox</h2>
            <p className="mt-1 text-sm text-zinc-600">
              If an account exists for <span className="font-medium text-zinc-900">{email}</span>, you will receive a password reset link shortly.
            </p>
            <Button
              variant="outline"
              className="mt-5 w-full"
              onClick={() => navigate('/login')}
            >
              Return to sign in
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldError) setFieldError('');
              }}
              error={fieldError}
              placeholder="admin@school.com"
              autoComplete="email"
              autoFocus
              required
            />
            <Button type="submit" isLoading={loading} className="w-full">
              Send reset link
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
};

export default ForgotPassword;
