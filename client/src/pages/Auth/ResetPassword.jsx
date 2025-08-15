import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LockKey, CheckCircle, Info, Warning } from '@phosphor-icons/react';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  const validate = () => {
    const next = {};
    if (!password || password.length < 8) {
      next.password = 'Password must be at least 8 characters';
    } else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      next.password = 'Password must include at least one letter and one number';
    }
    if (password !== confirmPassword) {
      next.confirmPassword = 'Passwords do not match';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!validate()) return;

    setLoading(true);
    try {
      await api.put(`/auth/reset-password/${token}`, { password });
      setSuccess(true);
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-100 text-success-600">
            <CheckCircle size={32} weight="fill" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">Password reset</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Your password has been updated successfully. You can now sign in with your new password.
          </p>
          <Button className="mt-6 w-full" onClick={() => navigate('/login')}>
            Sign in
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <LockKey size={24} weight="bold" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Create new password</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Choose a strong password that you have not used before.
          </p>
        </div>

        {!token && (
          <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-danger-200 bg-danger-50 p-3.5 text-sm text-danger-700">
            <Warning className="mt-0.5 h-4 w-4 shrink-0" weight="fill" />
            <span>This reset link is invalid or has expired. Please request a new one.</span>
          </div>
        )}

        {submitError && (
          <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-danger-200 bg-danger-50 p-3.5 text-sm text-danger-700">
            <Info className="mt-0.5 h-4 w-4 shrink-0" weight="fill" />
            <span className="leading-relaxed">{submitError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="New password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            helper="Minimum 8 characters with at least one letter and one number"
            disabled={!token}
            required
          />
          <Input
            label="Confirm new password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
            disabled={!token}
            required
          />
          <Button type="submit" isLoading={loading} disabled={!token} className="w-full">
            Reset password
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default ResetPassword;
