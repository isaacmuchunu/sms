import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Envelope,
  Shield,
  Buildings,
  LockKey,
  Key,
  Lock,
  LockOpen,
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import Modal from '../../components/ui/Modal';

const initialPasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must include at least one letter and one number';
  }
  return '';
};

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(initialPasswordForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const displayName = user?.firstName || user?.name || 'User';
  const schoolName = user?.school?.name || user?.school || '—';

  const openModal = () => {
    setForm(initialPasswordForm);
    setErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
    setForm(initialPasswordForm);
    setErrors({});
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const next = {};

    if (!form.currentPassword) {
      next.currentPassword = 'Please enter your current password';
    }

    const newPasswordError = validatePassword(form.newPassword);
    if (newPasswordError) {
      next.newPassword = newPasswordError;
    }

    if (form.newPassword !== form.confirmPassword) {
      next.confirmPassword = 'Passwords do not match';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await api.put('/auth/updatepassword', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success('Password updated successfully');
      closeModal();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update password';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">My Profile</h1>
        <p className="mt-1 text-sm text-zinc-500">View and manage your account details</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar name={displayName} size="lg" />
            <div>
              <p className="text-lg font-semibold text-zinc-900">{displayName}</p>
              <p className="text-sm text-zinc-500 capitalize">{user?.role || 'User'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              label="Full name"
              value={displayName}
              readOnly
              startIcon={<User size={18} />}
            />
            <Input
              label="Email"
              value={user?.email || ''}
              readOnly
              startIcon={<Envelope size={18} />}
            />
            <Input
              label="Role"
              value={user?.role || ''}
              readOnly
              startIcon={<Shield size={18} />}
            />
            <Input
              label="School"
              value={schoolName}
              readOnly
              startIcon={<Buildings size={18} />}
            />
          </div>

          <div className="border-t border-zinc-100 pt-5">
            <Button variant="outline" onClick={openModal}>
              <LockKey size={18} />
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-start">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          Go back
        </Button>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title="Change password"
        description="Enter your current password and a strong new password."
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Current password"
            type="password"
            value={form.currentPassword}
            onChange={(e) => handleChange('currentPassword', e.target.value)}
            error={errors.currentPassword}
            startIcon={<Key size={18} />}
            autoComplete="current-password"
            required
          />
          <Input
            label="New password"
            type="password"
            value={form.newPassword}
            onChange={(e) => handleChange('newPassword', e.target.value)}
            error={errors.newPassword}
            helper="Minimum 8 characters with at least one letter and one number"
            startIcon={<Lock size={18} />}
            autoComplete="new-password"
            required
          />
          <Input
            label="Confirm new password"
            type="password"
            value={form.confirmPassword}
            onChange={(e) => handleChange('confirmPassword', e.target.value)}
            error={errors.confirmPassword}
            startIcon={<LockOpen size={18} />}
            autoComplete="new-password"
            required
          />

          <div className="flex items-center justify-end gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={closeModal}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Update password
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Profile;
