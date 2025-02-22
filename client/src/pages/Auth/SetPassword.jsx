import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LockKey, Check, Warning } from '@phosphor-icons/react';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import toast from 'react-hot-toast';

const SetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error('Invalid or missing invitation token');
    }
  }, [token]);

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
    if (!token) return;
    if (!validate()) return;

    setSubmitting(true);
    try {
      const response = await api.post('/auth/set-password', { token, password });
      const { user, token: accessToken } = response.data.data;
      localStorage.setItem('sms_token', accessToken);
      localStorage.setItem('sms_user', JSON.stringify(user));
      setSuccess(true);
      toast.success('Password set successfully');
      setTimeout(() => {
        navigate('/parent');
      }, 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to set password');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-100 text-success-600">
            <Check size={32} weight="bold" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">Password set</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Your password has been set and you are now logged in. Redirecting to the parent portal...
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-100 text-accent-600">
            <LockKey size={24} weight="bold" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">Set your password</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Create a secure password to access the parent portal.
          </p>
        </div>

        {!token && (
          <div className="mb-4 rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">
            <div className="flex items-center gap-2">
              <Warning size={18} weight="bold" />
              This invitation link is invalid or has expired. Please contact the school administration.
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
            label="Confirm password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
            disabled={!token}
            required
          />
          <Button type="submit" isLoading={submitting} disabled={!token} className="w-full">
            Set password & login
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default SetPassword;
