import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import clsx from 'clsx';
import {
  Plus,
  MagnifyingGlass,
  Buildings,
  UserPlus,
  Copy,
  X,
  ToggleLeft,
  ToggleRight,
  CheckCircle,
  XCircle,
  Clock,
  SpinnerGap,
} from '@phosphor-icons/react';
import useFetch from '../../hooks/useFetch';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import toast from 'react-hot-toast';

const BOARD_OPTIONS = [
  { value: 'CBSE', label: 'CBSE' },
  { value: 'ICSE', label: 'ICSE' },
  { value: 'IGCSE', label: 'IGCSE' },
  { value: 'CBC', label: 'CBC' },
  { value: '8-4-4', label: '8-4-4' },
  { value: 'State Board', label: 'State Board' },
  { value: 'Other', label: 'Other' },
];

const STATUS_VARIANTS = {
  active: 'success',
  inactive: 'danger',
  pending: 'warning',
};

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const emptySchoolForm = {
  name: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  affiliationNo: '',
  board: '',
  establishedYear: '',
  principalName: '',
  adminName: '',
  adminEmail: '',
  adminPassword: '',
};

const emptyAdminForm = {
  name: '',
  email: '',
  password: '',
};

const SchoolList = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [schoolForm, setSchoolForm] = useState(emptySchoolForm);
  const [schoolErrors, setSchoolErrors] = useState({});
  const [creating, setCreating] = useState(false);

  const [adminModal, setAdminModal] = useState({ open: false, school: null });
  const [adminForm, setAdminForm] = useState(emptyAdminForm);
  const [adminErrors, setAdminErrors] = useState({});
  const [addingAdmin, setAddingAdmin] = useState(false);

  const [modulesModal, setModulesModal] = useState({ open: false, school: null });
  const [modulesForm, setModulesForm] = useState({ transport: false, hostel: false, library: true });
  const [savingModules, setSavingModules] = useState(false);

  const [requestsModal, setRequestsModal] = useState({ open: false, school: null });
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState(null);
  const [reviewing, setReviewing] = useState({});

  const [createdAdmin, setCreatedAdmin] = useState(null);

  const { data: schoolsResponse, loading, error, refetch } = useFetch('/schools?limit=100');
  const schools = useMemo(() => {
    if (!schoolsResponse) return [];
    return Array.isArray(schoolsResponse) ? schoolsResponse : schoolsResponse.items || [];
  }, [schoolsResponse]);

  const filteredSchools = useMemo(() => {
    const term = search.trim().toLowerCase();
    return schools.filter((school) => {
      const matchesSearch =
        !term ||
        school.name?.toLowerCase().includes(term) ||
        school.email?.toLowerCase().includes(term) ||
        school.phone?.toLowerCase().includes(term) ||
        school.board?.toLowerCase().includes(term);
      const matchesStatus = !statusFilter || school.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [schools, search, statusFilter]);

  const validateSchool = () => {
    const next = {};
    if (!schoolForm.name.trim()) next.name = 'School name is required';
    if (schoolForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(schoolForm.email)) {
      next.email = 'Invalid email address';
    }
    if (schoolForm.adminEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(schoolForm.adminEmail)) {
      next.adminEmail = 'Invalid admin email address';
    }
    if (schoolForm.adminPassword && schoolForm.adminPassword.length < 8) {
      next.adminPassword = 'Password must be at least 8 characters';
    }
    if (
      schoolForm.establishedYear &&
      (Number(schoolForm.establishedYear) < 1800 || Number(schoolForm.establishedYear) > 2100)
    ) {
      next.establishedYear = 'Enter a valid year between 1800 and 2100';
    }
    setSchoolErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSchoolChange = (e) => {
    const { name, value } = e.target;
    setSchoolForm((prev) => ({ ...prev, [name]: value }));
    if (schoolErrors[name]) setSchoolErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const normalizeWebsite = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!validateSchool()) return;
    setCreating(true);
    try {
      const payload = {
        ...schoolForm,
        website: normalizeWebsite(schoolForm.website),
        establishedYear: schoolForm.establishedYear ? Number(schoolForm.establishedYear) : null,
      };
      const res = await api.post('/schools', payload);
      const { school, admin } = res.data.data || {};
      toast.success('School created successfully');
      if (admin?.plainPassword) {
        setCreatedAdmin({
          type: 'School created',
          schoolName: school?.name,
          name: admin.name,
          email: admin.email,
          plainPassword: admin.plainPassword,
        });
      }
      setSchoolForm(emptySchoolForm);
      setShowCreate(false);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create school');
    } finally {
      setCreating(false);
    }
  };

  const validateAdmin = () => {
    const next = {};
    if (!adminForm.name.trim()) next.name = 'Name is required';
    if (!adminForm.email.trim()) next.email = 'Email is required';
    if (adminForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminForm.email)) {
      next.email = 'Invalid email address';
    }
    if (adminForm.password && adminForm.password.length < 8) {
      next.password = 'Password must be at least 8 characters';
    }
    setAdminErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleAdminChange = (e) => {
    const { name, value } = e.target;
    setAdminForm((prev) => ({ ...prev, [name]: value }));
    if (adminErrors[name]) setAdminErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    if (!validateAdmin() || !adminModal.school) return;
    setAddingAdmin(true);
    try {
      const res = await api.post(`/schools/${adminModal.school.id}/admins`, adminForm);
      const { admin } = res.data.data || {};
      toast.success('Admin added successfully');
      if (admin?.plainPassword) {
        setCreatedAdmin({
          type: 'Admin added',
          schoolName: adminModal.school.name,
          name: admin.name,
          email: admin.email,
          plainPassword: admin.plainPassword,
        });
      }
      setAdminForm(emptyAdminForm);
      setAdminModal({ open: false, school: null });
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add admin');
    } finally {
      setAddingAdmin(false);
    }
  };

  const openAdminModal = (school) => {
    setAdminForm(emptyAdminForm);
    setAdminErrors({});
    setAdminModal({ open: true, school });
  };

  const closeAdminModal = () => {
    setAdminModal({ open: false, school: null });
  };

  const openModulesModal = (school) => {
    const defaults = { transport: false, hostel: false, library: true };
    setModulesForm({ ...defaults, ...(school.modules || {}) });
    setModulesModal({ open: true, school });
  };

  const closeModulesModal = () => {
    setModulesModal({ open: false, school: null });
  };

  const toggleModule = (key) => {
    setModulesForm((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveModules = async (e) => {
    e.preventDefault();
    if (!modulesModal.school) return;
    setSavingModules(true);
    try {
      await api.patch(`/schools/${modulesModal.school.id}/modules`, { modules: modulesForm });
      toast.success('School modules updated');
      closeModulesModal();
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update modules');
    } finally {
      setSavingModules(false);
    }
  };

  const openRequestsModal = async (school) => {
    setRequestsModal({ open: true, school });
    setRequestsLoading(true);
    setRequestsError(null);
    try {
      const res = await api.get(`/schools/${school.id}/module-requests?limit=100`);
      const data = res.data?.data;
      setRequests(Array.isArray(data) ? data : data?.items || []);
    } catch (err) {
      setRequestsError(err.response?.data?.message || 'Failed to load requests');
    } finally {
      setRequestsLoading(false);
    }
  };

  const closeRequestsModal = () => {
    setRequestsModal({ open: false, school: null });
    setRequests([]);
    setRequestsError(null);
  };

  const handleReview = async (requestId, action) => {
    setReviewing((prev) => ({ ...prev, [requestId]: action }));
    try {
      await api.patch(`/module-requests/${requestId}/${action}`);
      toast.success(`Request ${action}d`);
      if (requestsModal.school) {
        openRequestsModal(requestsModal.school);
      }
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} request`);
    } finally {
      setReviewing((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const copyPassword = async () => {
    if (!createdAdmin?.plainPassword) return;
    try {
      await navigator.clipboard.writeText(createdAdmin.plainPassword);
      toast.success('Password copied to clipboard');
    } catch {
      toast.error('Failed to copy password');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Schools</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage schools and their administrators</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={18} weight="bold" />
          Create school
        </Button>
      </div>

      {createdAdmin && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-emerald-900">
                {createdAdmin.type}: {createdAdmin.schoolName}
              </p>
              <p className="text-emerald-800">
                {createdAdmin.name} ({createdAdmin.email}) can sign in with the temporary password
                below. This is the only time it will be shown.
              </p>
              <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 font-mono text-sm font-medium text-emerald-900">
                {createdAdmin.plainPassword}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" size="sm" onClick={copyPassword}>
                <Copy size={16} />
                Copy
              </Button>
              <button
                onClick={() => setCreatedAdmin(null)}
                className="rounded-lg p-1.5 text-emerald-700 hover:bg-emerald-100"
                aria-label="Dismiss"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-zinc-100 p-5 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              placeholder="Search by name, email, phone or board..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              startIcon={<MagnifyingGlass size={18} />}
            />
          </div>
          <div className="min-w-[12rem]">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={STATUS_FILTER_OPTIONS}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/60">
                <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">School</th>
                <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">Email</th>
                <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">Phone</th>
                <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">Board</th>
                <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">Status</th>
                <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">Modules</th>
                <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">Created</th>
                <th className="px-5 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx}>
                    <td className="px-5 py-4"><div className="h-4 w-32 rounded bg-zinc-200" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-40 rounded bg-zinc-200" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-28 rounded bg-zinc-200" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-24 rounded bg-zinc-200" /></td>
                    <td className="px-5 py-4"><div className="h-5 w-16 rounded-full bg-zinc-200" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-24 rounded bg-zinc-200" /></td>
                    <td className="px-5 py-4"><div className="ml-auto h-8 w-24 rounded bg-zinc-200" /></td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12">
                    <div className="rounded-lg border border-danger-200 bg-danger-50 p-4 text-center text-sm text-danger-700">
                      {error}
                    </div>
                  </td>
                </tr>
              ) : filteredSchools.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12">
                    <EmptyState
                      icon={Buildings}
                      title="No schools found"
                      description="Create a school to get started"
                    />
                  </td>
                </tr>
              ) : (
                filteredSchools.map((school) => (
                  <tr key={school.id} className="transition-colors hover:bg-zinc-50/60">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-medium text-zinc-900">{school.name}</p>
                        {school.address && (
                          <p className="text-xs text-zinc-500">{school.address}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-zinc-700">{school.email || '-'}</td>
                    <td className="px-5 py-4 text-zinc-700">{school.phone || '-'}</td>
                    <td className="px-5 py-4 text-zinc-700">{school.board || '-'}</td>
                    <td className="px-5 py-4">
                      <Badge variant={STATUS_VARIANTS[school.status] || 'neutral'}>
                        {school.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {['transport', 'hostel', 'library'].map((key) => {
                          const enabled = (school.modules || {})[key] !== false;
                          return (
                            <span
                              key={key}
                              className={clsx(
                                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                                enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
                              )}
                            >
                              {enabled ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                              {key}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-zinc-700">
                      {school.createdAt ? format(new Date(school.createdAt), 'dd MMM yyyy') : '-'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openRequestsModal(school)}>
                          <Clock size={16} />
                          Requests
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openModulesModal(school)}>
                          <ToggleRight size={16} />
                          Modules
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openAdminModal(school)}>
                          <UserPlus size={16} />
                          Add admin
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create school"
        description="Add a new school and optionally create its first administrator."
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Input
              label="School name"
              name="name"
              value={schoolForm.name}
              onChange={handleSchoolChange}
              error={schoolErrors.name}
              required
            />
            <Input
              label="Principal name"
              name="principalName"
              value={schoolForm.principalName}
              onChange={handleSchoolChange}
            />
            <div className="md:col-span-2">
              <Input
                label="Address"
                name="address"
                value={schoolForm.address}
                onChange={handleSchoolChange}
              />
            </div>
            <Input
              label="Phone"
              name="phone"
              type="tel"
              value={schoolForm.phone}
              onChange={handleSchoolChange}
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={schoolForm.email}
              onChange={handleSchoolChange}
              error={schoolErrors.email}
            />
            <Input
              label="Website"
              name="website"
              value={schoolForm.website}
              onChange={handleSchoolChange}
              placeholder="www.school.edu"
            />
            <Input
              label="Affiliation number"
              name="affiliationNo"
              value={schoolForm.affiliationNo}
              onChange={handleSchoolChange}
            />
            <Select
              label="Board"
              name="board"
              value={schoolForm.board}
              onChange={handleSchoolChange}
              options={BOARD_OPTIONS}
              placeholder="Select board"
            />
            <Input
              label="Established year"
              name="establishedYear"
              type="number"
              value={schoolForm.establishedYear}
              onChange={handleSchoolChange}
              error={schoolErrors.establishedYear}
              placeholder="e.g. 1995"
            />
          </div>

          <div className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-4">
            <h4 className="mb-3 text-sm font-semibold text-zinc-900">First administrator (optional)</h4>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Input
                label="Admin name"
                name="adminName"
                value={schoolForm.adminName}
                onChange={handleSchoolChange}
              />
              <Input
                label="Admin email"
                name="adminEmail"
                type="email"
                value={schoolForm.adminEmail}
                onChange={handleSchoolChange}
                error={schoolErrors.adminEmail}
              />
              <div className="md:col-span-2">
                <Input
                  label="Admin password"
                  name="adminPassword"
                  type="password"
                  value={schoolForm.adminPassword}
                  onChange={handleSchoolChange}
                  error={schoolErrors.adminPassword}
                  helper="Leave blank to auto-generate a secure password"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={creating}>
              Create school
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={adminModal.open}
        onClose={closeAdminModal}
        title={`Add admin — ${adminModal.school?.name || ''}`}
        description="Create an administrator account for this school."
      >
        <form onSubmit={handleAddAdmin} className="space-y-5">
          <Input
            label="Full name"
            name="name"
            value={adminForm.name}
            onChange={handleAdminChange}
            error={adminErrors.name}
            required
          />
          <Input
            label="Email"
            name="email"
            type="email"
            value={adminForm.email}
            onChange={handleAdminChange}
            error={adminErrors.email}
            required
          />
          <Input
            label="Password"
            name="password"
            type="password"
            value={adminForm.password}
            onChange={handleAdminChange}
            error={adminErrors.password}
            helper="Leave blank to auto-generate a secure password"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={closeAdminModal}>
              Cancel
            </Button>
            <Button type="submit" isLoading={addingAdmin}>
              Add admin
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={modulesModal.open}
        onClose={closeModulesModal}
        title={`Modules — ${modulesModal.school?.name || ''}`}
        description="Activate or deactivate optional modules for this school."
      >
        <form onSubmit={handleSaveModules} className="space-y-5">
          {[
            { key: 'transport', label: 'Transport', description: 'Buses, routes and student transport allocations' },
            { key: 'hostel', label: 'Hostel', description: 'Hostels, rooms and boarding allocations' },
            { key: 'library', label: 'Library', description: 'Books, issues, reservations and fines' },
          ].map(({ key, label, description }) => (
            <div
              key={key}
              className={clsx(
                'flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors',
                modulesForm[key]
                  ? 'border-emerald-200 bg-emerald-50/50'
                  : 'border-zinc-200 bg-white hover:bg-zinc-50'
              )}
              onClick={() => toggleModule(key)}
            >
              <div>
                <p className="font-medium text-zinc-900">{label}</p>
                <p className="text-xs text-zinc-500">{description}</p>
              </div>
              <div className="shrink-0">
                {modulesForm[key] ? (
                  <ToggleRight size={28} className="text-emerald-600" weight="fill" />
                ) : (
                  <ToggleLeft size={28} className="text-zinc-400" />
                )}
              </div>
            </div>
          ))}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={closeModulesModal}>
              Cancel
            </Button>
            <Button type="submit" isLoading={savingModules}>
              Save modules
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={requestsModal.open}
        onClose={closeRequestsModal}
        title={`Module requests — ${requestsModal.school?.name || ''}`}
        description="Review activation requests from the school admin."
        size="lg"
      >
        <div className="space-y-4">
          {requestsLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-zinc-500">
              <SpinnerGap size={20} className="animate-spin" />
              Loading requests...
            </div>
          ) : requestsError ? (
            <div className="rounded-lg border border-danger-200 bg-danger-50 p-4 text-center text-sm text-danger-700">
              {requestsError}
            </div>
          ) : requests.length === 0 ? (
            <EmptyState
              title="No module requests"
              description="This school has not requested any module activations."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100">
                    <th className="px-3 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Module</th>
                    <th className="px-3 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Status</th>
                    <th className="px-3 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Notes</th>
                    <th className="px-3 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Requested</th>
                    <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {requests.map((request) => {
                    const StatusIcon = request.status === 'pending' ? Clock : request.status === 'approved' ? CheckCircle : XCircle;
                    const statusVariant = request.status === 'pending' ? 'warning' : request.status === 'approved' ? 'success' : 'danger';
                    const isReviewing = reviewing[request.id];
                    return (
                      <tr key={request.id}>
                        <td className="px-3 py-3 font-medium capitalize text-zinc-900">{request.module}</td>
                        <td className="px-3 py-3">
                          <Badge variant={statusVariant}>
                            <span className="flex items-center gap-1">
                              <StatusIcon size={12} />
                              {request.status}
                            </span>
                          </Badge>
                        </td>
                        <td className="max-w-xs truncate px-3 py-3 text-zinc-600">{request.notes || '-'}</td>
                        <td className="px-3 py-3 text-zinc-500">
                          {request.createdAt ? format(new Date(request.createdAt), 'dd MMM yyyy') : '-'}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {request.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleReview(request.id, 'approve')}
                                isLoading={isReviewing === 'approve'}
                              >
                                <CheckCircle size={14} />
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReview(request.id, 'reject')}
                                isLoading={isReviewing === 'reject'}
                              >
                                <XCircle size={14} />
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-400">
                              {request.reviewedAt ? format(new Date(request.reviewedAt), 'dd MMM yyyy') : '-'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default SchoolList;
