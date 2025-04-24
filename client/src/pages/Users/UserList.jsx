import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Plus,
  MagnifyingGlass,
  User,
  Users,
  Check,
  X,
  UploadSimple,
  FileCsv,
  DownloadSimple,
} from '@phosphor-icons/react';
import useFetch from '../../hooks/useFetch';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import toast from 'react-hot-toast';

const BASE_ROLE_OPTIONS = [
  { value: 'teacher', label: 'Teacher' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'librarian', label: 'Librarian' },
  { value: 'parent', label: 'Parent' },
  { value: 'staff', label: 'Staff' },
];

const getRoleOptions = (isSuperAdmin) =>
  isSuperAdmin
    ? [...BASE_ROLE_OPTIONS, { value: 'admin', label: 'Admin' }]
    : BASE_ROLE_OPTIONS;

const STATUS_VARIANTS = {
  active: 'success',
  inactive: 'neutral',
  pending: 'warning',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.23, 1, 0.32, 1] } },
};

const BULK_ROLE_OPTIONS = [
  ...BASE_ROLE_OPTIONS,
  { value: 'student', label: 'Student' },
  { value: 'admin', label: 'Admin' },
];

const UserList = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const ROLE_OPTIONS = useMemo(() => getRoleOptions(isSuperAdmin), [isSuperAdmin]);

  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'teacher',
    phone: '',
    schoolId: user?.schoolId || '',
  });

  const { data: schoolsResponse } = useFetch(isSuperAdmin ? '/schools?limit=100' : null);
  const schools = useMemo(() => {
    if (!schoolsResponse) return [];
    return Array.isArray(schoolsResponse) ? schoolsResponse : schoolsResponse.items || [];
  }, [schoolsResponse]);

  const [showBulk, setShowBulk] = useState(false);
  const [bulkRole, setBulkRole] = useState('teacher');
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const shouldReduceMotion = useReducedMotion();

  const usersUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (filterRole) params.set('role', filterRole);
    if (search) params.set('search', search);
    if (user?.schoolId) params.set('schoolId', user.schoolId);
    return `/auth/users?${params.toString()}`;
  }, [filterRole, search, user?.schoolId]);

  const { data: usersResponse, loading, error, refetch } = useFetch(usersUrl);
  const users = useMemo(() => {
    if (!usersResponse) return [];
    return Array.isArray(usersResponse) ? usersResponse : usersResponse.items || [];
  }, [usersResponse]);

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Name is required';
    if (!form.email.trim()) next.email = 'Email is required';
    if (!form.password || form.password.length < 8) next.password = 'Password must be at least 8 characters';
    if (isSuperAdmin && form.role !== 'super_admin' && !form.schoolId) {
      next.schoolId = 'School is required';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
        phone: form.phone.trim(),
      };
      if (isSuperAdmin && form.schoolId) {
        payload.schoolId = form.schoolId;
      }
      await api.post('/auth/register', payload);
      toast.success('User registered successfully');
      setForm({ name: '', email: '', password: '', role: 'teacher', phone: '', schoolId: user?.schoolId || '' });
      setShowForm(false);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to register user');
    } finally {
      setSaving(false);
    }
  };

  const downloadTemplate = () => {
    const link = document.createElement('a');
    link.href = `${api.defaults.baseURL}/auth/bulk-upload/template?role=${bulkRole}`;
    link.setAttribute('download', `${bulkRole}-template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!bulkFile) {
      toast.error('Please select a CSV file');
      return;
    }
    setBulkUploading(true);
    setBulkResult(null);
    try {
      const formData = new FormData();
      formData.append('file', bulkFile);
      formData.append('role', bulkRole);
      const res = await api.post('/auth/bulk-upload', formData);
      setBulkResult(res.data.data);
      toast.success(`Bulk upload complete: ${res.data.data.success} succeeded, ${res.data.data.failed} failed`);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk upload failed');
    } finally {
      setBulkUploading(false);
    }
  };

  const wrapperProps = shouldReduceMotion
    ? {}
    : { variants: containerVariants, initial: 'hidden', animate: 'visible' };
  const itemProps = shouldReduceMotion ? {} : { variants: itemVariants };

  return (
    <motion.div className="space-y-6" {...wrapperProps}>
      <motion.div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" {...itemProps}>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Users</h1>
          <p className="mt-1 text-sm text-zinc-500">Register staff, parents, students, and other users</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => setShowBulk((s) => !s)}>
            <UploadSimple size={18} weight="bold" />
            Bulk upload
          </Button>
          <Button onClick={() => setShowForm((s) => !s)}>
            <Plus size={18} weight="bold" />
            Register user
          </Button>
        </div>
      </motion.div>

      {showBulk && (
        <motion.div {...itemProps}>
          <Card>
            <div className="border-b border-zinc-100 px-5 py-4">
              <h2 className="text-base font-semibold text-zinc-900">Bulk upload users</h2>
              <p className="text-sm text-zinc-500">
                Upload a CSV file. Parents will receive a set-password email/SMS.
              </p>
            </div>
            <form onSubmit={handleBulkUpload} className="p-5">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <Select
                  label="Role"
                  value={bulkRole}
                  onChange={(e) => setBulkRole(e.target.value)}
                  options={BULK_ROLE_OPTIONS}
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-zinc-700">CSV file</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-accent-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-accent-700 hover:file:bg-accent-100"
                    />
                  </div>
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={downloadTemplate}
                    className="w-full"
                  >
                    <DownloadSimple size={18} weight="bold" />
                    Download {bulkRole} template
                  </Button>
                </div>
              </div>
              {bulkResult && (
                <div className="mt-4 rounded-lg border border-zinc-100 bg-zinc-50 p-4 text-sm">
                  <p className="font-medium text-zinc-900">
                    Processed {bulkResult.total} rows:{' '}
                    <span className="text-success-600">{bulkResult.success} succeeded</span>,{' '}
                    <span className="text-danger-600">{bulkResult.failed} failed</span>
                  </p>
                  {bulkResult.errors.length > 0 && (
                    <ul className="mt-2 max-h-40 overflow-auto rounded border border-danger-100 bg-danger-50 p-2 text-danger-700">
                      {bulkResult.errors.map((err, idx) => (
                        <li key={idx}>Row {err.row}: {err.message}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <div className="mt-6 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowBulk(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={bulkUploading}>
                  <FileCsv size={18} weight="bold" />
                  Upload CSV
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      )}

      {showForm && (
        <motion.div {...itemProps}>
          <Card>
            <div className="border-b border-zinc-100 px-5 py-4">
              <h2 className="text-base font-semibold text-zinc-900">Register new user</h2>
              <p className="text-sm text-zinc-500">Students must be registered through the Students workflow</p>
            </div>
            <form onSubmit={handleSubmit} className="p-5">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Input
                  label="Full name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  error={errors.name}
                  required
                />
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  error={errors.email}
                  required
                />
                <Input
                  label="Password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  error={errors.password}
                  helper="Minimum 8 characters"
                  required
                />
                <Select
                  label="Role"
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  options={ROLE_OPTIONS}
                  required
                />
                {isSuperAdmin && (
                  <Select
                    label="School"
                    name="schoolId"
                    value={form.schoolId}
                    onChange={handleChange}
                    options={[
                      { value: '', label: 'Select a school' },
                      ...schools.map((s) => ({ value: s.id, label: s.name })),
                    ]}
                    error={errors.schoolId}
                    required
                  />
                )}
                <Input
                  label="Phone"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={saving}>
                  <Check size={18} weight="bold" />
                  Register user
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      )}

      <motion.div {...itemProps}>
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-zinc-100 p-5 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                placeholder="Search by name, email or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                startIcon={<MagnifyingGlass size={18} />}
              />
            </div>
            <div className="min-w-[12rem]">
              <Select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                options={[{ value: '', label: 'All roles' }, ...ROLE_OPTIONS]}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/60">
                  <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">User</th>
                  <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">Role</th>
                  <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">Phone</th>
                  <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">Status</th>
                  <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-9 w-9 rounded-full" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                      </td>
                      <td className="px-5 py-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
                      <td className="px-5 py-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-5 py-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                      <td className="px-5 py-4"><Skeleton className="h-4 w-20" /></td>
                    </tr>
                  ))
                ) : error ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12">
                      <div className="rounded-lg border border-danger-200 bg-danger-50 p-4 text-center text-sm text-danger-700">
                        {error}
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12">
                      <EmptyState
                        icon={Users}
                        title="No users found"
                        description="Register staff or parents to get started"
                      />
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user._id} className="transition-colors hover:bg-zinc-50/60">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-subtle text-xs font-semibold text-accent-700">
                            {user.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium text-zinc-900">{user.name}</p>
                            <p className="text-xs text-zinc-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 capitalize text-zinc-700">{user.role}</td>
                      <td className="px-5 py-4 text-zinc-700">{user.phone || '-'}</td>
                      <td className="px-5 py-4">
                        <Badge variant={STATUS_VARIANTS[user.status] || 'neutral'}>
                          {user.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-zinc-700">
                        {user.createdAt ? format(new Date(user.createdAt), 'dd MMM yyyy') : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default UserList;
