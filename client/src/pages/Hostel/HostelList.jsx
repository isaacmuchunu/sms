import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Plus,
  MagnifyingGlass,
  PencilSimple,
  Trash,
  Buildings,
  Users,
  Bed,
  House,
  Warning,
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import useFetch from '../../hooks/useFetch';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

const HOSTEL_TYPES = [
  { value: 'boys', label: 'Boys' },
  { value: 'girls', label: 'Girls' },
  { value: 'staff', label: 'Staff' },
  { value: 'mixed', label: 'Mixed' },
];

const HOSTEL_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const TYPE_ICON = {
  boys: 'B',
  girls: 'G',
  staff: 'S',
  mixed: 'M',
};

const TYPE_COLORS = {
  boys: 'bg-blue-50 text-blue-700 border-blue-100',
  girls: 'bg-pink-50 text-pink-700 border-pink-100',
  staff: 'bg-violet-50 text-violet-700 border-violet-100',
  mixed: 'bg-amber-50 text-amber-700 border-amber-100',
};

const initialForm = {
  name: '',
  type: 'boys',
  address: '',
  phone: '',
  warden: '',
  status: 'active',
};

const HostelList = () => {
  const shouldReduceMotion = useReducedMotion();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingHostel, setEditingHostel] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});
  const [formLoading, setFormLoading] = useState(false);

  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const {
    data: hostels = [],
    loading,
    error,
    refetch,
  } = useFetch('/hostel/hostels', {
    params: {
      search: debouncedSearch,
      type: typeFilter,
      status: statusFilter,
      limit: 100,
      sort: 'name',
    },
  });

  const { data: teachers = [], loading: teachersLoading } = useFetch('/teachers', {
    params: { limit: 100, status: 'active' },
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const stats = useMemo(() => {
    const total = hostels.length;
    const totalRooms = hostels.reduce((sum, h) => sum + (h.totalRooms || 0), 0);
    const totalBeds = hostels.reduce((sum, h) => sum + (h.totalBeds || 0), 0);
    const occupiedBeds = hostels.reduce((sum, h) => sum + (h.occupiedBeds || 0), 0);
    const active = hostels.filter((h) => h.status === 'active').length;
    return { total, totalRooms, totalBeds, occupiedBeds, active };
  }, [hostels]);

  const filteredHostels = useMemo(() => {
    const term = debouncedSearch.toLowerCase();
    return hostels.filter((h) => {
      const matchesSearch =
        !term ||
        h.name?.toLowerCase().includes(term) ||
        h.address?.toLowerCase().includes(term) ||
        h.phone?.toLowerCase().includes(term);
      const matchesType = !typeFilter || h.hostelType === typeFilter;
      const matchesStatus = !statusFilter || h.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [hostels, debouncedSearch, typeFilter, statusFilter]);

  const wardenOptions = useMemo(
    () => [
      { value: '', label: 'No warden' },
      ...teachers.map((t) => ({
        value: t._id,
        label: [t.firstName, t.lastName].filter(Boolean).join(' ') || t.employeeId || 'Unnamed',
      })),
    ],
    [teachers]
  );

  const openCreate = () => {
    setEditingHostel(null);
    setForm(initialForm);
    setFormErrors({});
    setShowForm(true);
  };

  const openEdit = (hostel) => {
    setEditingHostel(hostel);
    setForm({
      name: hostel.name || '',
      type: hostel.hostelType || 'boys',
      address: hostel.address || '',
      phone: hostel.phone || '',
      warden: hostel.warden?.id || '',
      status: hostel.status || 'active',
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Hostel name is required';
    if (!form.type) errors.type = 'Hostel type is required';
    if (!form.status) errors.status = 'Status is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setFormLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        address: form.address.trim(),
        phone: form.phone.trim(),
        warden: form.warden || null,
        status: form.status,
      };

      if (editingHostel) {
        await api.put(`/hostel/hostels/${editingHostel.id || editingHostel._id}`, payload);
        toast.success('Hostel updated successfully');
      } else {
        await api.post('/hostel/hostels', payload);
        toast.success('Hostel created successfully');
      }
      setShowForm(false);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save hostel');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/hostel/hostels/${deleteId}`);
      toast.success('Hostel deleted successfully');
      setDeleteId(null);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete hostel');
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatWarden = (hostel) => {
    if (!hostel.warden) return '—';
    const name = [hostel.warden.firstName, hostel.warden.lastName].filter(Boolean).join(' ');
    return name || hostel.warden.employeeId || '—';
  };

  const occupancyRate = useMemo(() => {
    if (!stats.totalBeds) return 0;
    return Math.round((stats.occupiedBeds / stats.totalBeds) * 100);
  }, [stats]);

  const statCards = [
    { label: 'Hostels', value: stats.total, icon: Buildings, color: 'text-zinc-900' },
    { label: 'Active', value: stats.active, icon: House, color: 'text-emerald-600' },
    { label: 'Total rooms', value: stats.totalRooms, icon: Buildings, color: 'text-zinc-900' },
    { label: 'Total beds', value: stats.totalBeds, icon: Bed, color: 'text-zinc-900' },
    {
      label: 'Occupancy',
      value: `${stats.occupiedBeds}/${stats.totalBeds}`,
      sub: `${occupancyRate}%`,
      icon: Users,
      color: 'text-accent-600',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-8 w-16" />
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full max-w-md" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Hostels</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage hostels, rooms and boarders</p>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <Warning size={18} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Failed to load hostels</p>
            <p className="mt-0.5 text-red-600">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={refetch}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Hostels</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage hostels, rooms and boarders</p>
        </div>
        <Button onClick={openCreate} className="self-start sm:self-auto">
          <Plus size={18} weight="bold" />
          Add hostel
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((stat) => (
          <Card key={stat.label} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{stat.label}</p>
                <p className={`mt-1 text-2xl font-semibold tabular-nums ${stat.color}`}>{stat.value}</p>
                {stat.sub && <p className="mt-0.5 text-xs font-medium text-zinc-500">{stat.sub}</p>}
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
                <stat.icon size={18} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="flex-1">
              <Input
                placeholder="Search by name, address or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                startIcon={<MagnifyingGlass size={18} />}
                aria-label="Search hostels"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[28rem]">
              <Select
                label="Type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                options={[{ value: '', label: 'All types' }, ...HOSTEL_TYPES]}
              />
              <Select
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[{ value: '', label: 'All statuses' }, ...HOSTEL_STATUSES]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-zinc-100 px-5 py-4">
          <CardTitle>Hostel catalog</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/60">
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Hostel</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Type</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Address</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Phone</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Warden</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Rooms / Beds</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Status</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filteredHostels.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12">
                    <EmptyState
                      icon={Buildings}
                      title="No hostels found"
                      description={
                        search || typeFilter || statusFilter
                          ? 'Try adjusting your filters or search query'
                          : 'Add a hostel to start managing rooms and boarders'
                      }
                      action={
                        <Button onClick={openCreate} variant="outline" size="sm">
                          <Plus size={16} weight="bold" />
                          Add hostel
                        </Button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                filteredHostels.map((hostel) => (
                  <motion.tr
                    key={hostel.id || hostel._id}
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                    className="transition-colors hover:bg-zinc-50/60"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-sm font-semibold ${
                            TYPE_COLORS[hostel.hostelType] || 'bg-zinc-100 text-zinc-600 border-zinc-200'
                          }`}
                        >
                          {TYPE_ICON[hostel.hostelType] || 'H'}
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900">{hostel.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant="neutral" className="capitalize">
                        {hostel.hostelType}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-zinc-600">{hostel.address || '—'}</td>
                    <td className="px-5 py-3 text-zinc-600">{hostel.phone || '—'}</td>
                    <td className="px-5 py-3 text-zinc-700">{formatWarden(hostel)}</td>
                    <td className="px-5 py-3 tabular-nums text-zinc-700">
                      {hostel.totalRooms || 0} / {hostel.totalBeds || 0}
                      <span className="ml-1 text-xs text-zinc-500">
                        ({hostel.occupiedBeds || 0} occupied)
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={hostel.status === 'active' ? 'success' : 'neutral'}>
                        {hostel.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(hostel)}
                          aria-label="Edit hostel"
                        >
                          <PencilSimple size={18} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(hostel.id || hostel._id)}
                          aria-label="Delete hostel"
                          className="text-danger-600 hover:bg-danger-50 hover:text-danger-700"
                        >
                          <Trash size={18} />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => !formLoading && setShowForm(false)}
        title={editingHostel ? 'Edit hostel' : 'Add hostel'}
        description={editingHostel ? 'Update hostel details' : 'Create a new hostel for student boarding'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Hostel name"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. Nyati Hostel"
            error={formErrors.name}
            required
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Type"
              name="type"
              value={form.type}
              onChange={handleChange}
              options={HOSTEL_TYPES}
              error={formErrors.type}
              required
            />
            <Select
              label="Status"
              name="status"
              value={form.status}
              onChange={handleChange}
              options={HOSTEL_STATUSES}
              error={formErrors.status}
              required
            />
          </div>
          <Input
            label="Address"
            name="address"
            value={form.address}
            onChange={handleChange}
            placeholder="Hostel address"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Phone"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="Contact number"
            />
            <Select
              label="Warden"
              name="warden"
              value={form.warden}
              onChange={handleChange}
              options={wardenOptions}
              disabled={teachersLoading}
              placeholder="Select warden"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={formLoading}>
              Cancel
            </Button>
            <Button type="submit" isLoading={formLoading}>
              {editingHostel ? 'Update hostel' : 'Create hostel'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => !deleteLoading && setDeleteId(null)}
        title="Delete hostel"
        description="Hostels with existing rooms cannot be deleted. This action cannot be undone."
        size="sm"
      >
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} isLoading={deleteLoading} disabled={deleteLoading}>
            Delete
          </Button>
        </div>
      </Modal>
    </motion.div>
  );
};

export default HostelList;
