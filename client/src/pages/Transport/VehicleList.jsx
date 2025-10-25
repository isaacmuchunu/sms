import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { format, parseISO, isBefore, addDays, isWithinInterval } from 'date-fns';
import {
  Plus,
  MagnifyingGlass,
  Bus,
  Van,
  Car,
  Truck,
  PencilSimple,
  Trash,
  Warning,
  CheckCircle,
  Wrench,
  CirclesThree,
  Calendar,
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import useFetch from '../../hooks/useFetch';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

const TYPE_OPTIONS = [
  { value: 'bus', label: 'Bus' },
  { value: 'van', label: 'Van' },
  { value: 'car', label: 'Car' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'under_maintenance', label: 'Under Maintenance' },
];

const VEHICLE_TYPE_ICONS = {
  bus: Bus,
  van: Van,
  car: Car,
  other: Truck,
};

const STATUS_VARIANTS = {
  active: 'success',
  inactive: 'neutral',
  under_maintenance: 'warning',
};

const STATUS_LABELS = {
  active: 'Active',
  inactive: 'Inactive',
  under_maintenance: 'Under Maintenance',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.23, 1, 0.32, 1] } },
};

const formatDate = (value) => {
  if (!value) return '-';
  try {
    return format(new Date(value), 'dd MMM yyyy');
  } catch {
    return '-';
  }
};

const getExpiryBadge = (value) => {
  if (!value) {
    return <Badge variant="neutral">N/A</Badge>;
  }
  const date = parseISO(value);
  const now = new Date();
  if (isBefore(date, now)) {
    return <Badge variant="danger">Expired</Badge>;
  }
  if (isWithinInterval(date, { start: now, end: addDays(now, 30) })) {
    return <Badge variant="warning">Expiring</Badge>;
  }
  return <Badge variant="success">Valid</Badge>;
};

const getStatusBadge = (status) => (
  <Badge variant={STATUS_VARIANTS[status] || 'neutral'}>{STATUS_LABELS[status] || status}</Badge>
);

const initialFormState = {
  vehicleNo: '',
  registrationNo: '',
  type: 'bus',
  capacity: '',
  manufacturer: '',
  model: '',
  driverName: '',
  driverPhone: '',
  attendantName: '',
  insuranceExpiry: '',
  pollutionExpiry: '',
  fitnessExpiry: '',
  status: 'active',
};

const VehicleList = () => {
  const {
    data: vehiclesRaw,
    loading,
    error,
    refetch,
  } = useFetch('/transport/vehicles', { params: { limit: 500 } });

  const vehicles = useMemo(() => (Array.isArray(vehiclesRaw) ? vehiclesRaw : []), [vehiclesRaw]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [form, setForm] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [deleteVehicle, setDeleteVehicle] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (editingVehicle) {
      setForm({
        vehicleNo: editingVehicle.vehicleNo || '',
        registrationNo: editingVehicle.registrationNo || '',
        type: editingVehicle.type || 'bus',
        capacity: editingVehicle.capacity ?? '',
        manufacturer: editingVehicle.manufacturer || '',
        model: editingVehicle.model || '',
        driverName: editingVehicle.driverName || '',
        driverPhone: editingVehicle.driverPhone || '',
        attendantName: editingVehicle.attendantName || '',
        insuranceExpiry: editingVehicle.insuranceExpiry
          ? editingVehicle.insuranceExpiry.slice(0, 10)
          : '',
        pollutionExpiry: editingVehicle.pollutionExpiry
          ? editingVehicle.pollutionExpiry.slice(0, 10)
          : '',
        fitnessExpiry: editingVehicle.fitnessExpiry
          ? editingVehicle.fitnessExpiry.slice(0, 10)
          : '',
        status: editingVehicle.status || 'active',
      });
    } else {
      setForm(initialFormState);
    }
    setFormErrors({});
  }, [editingVehicle, isFormOpen]);

  const filteredVehicles = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return vehicles.filter((vehicle) => {
      const matchesSearch =
        !term ||
        vehicle.vehicleNo?.toLowerCase().includes(term) ||
        vehicle.registrationNo?.toLowerCase().includes(term) ||
        vehicle.model?.toLowerCase().includes(term) ||
        vehicle.manufacturer?.toLowerCase().includes(term) ||
        vehicle.driverName?.toLowerCase().includes(term);
      const matchesStatus = !statusFilter || vehicle.status === statusFilter;
      const matchesType = !typeFilter || vehicle.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [vehicles, searchTerm, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    const active = vehicles.filter((v) => v.status === 'active').length;
    const maintenance = vehicles.filter((v) => v.status === 'under_maintenance').length;
    const totalCapacity = vehicles.reduce((sum, v) => sum + (Number(v.capacity) || 0), 0);
    return {
      total: vehicles.length,
      active,
      maintenance,
      totalCapacity,
    };
  }, [vehicles]);

  const validateForm = () => {
    const errors = {};
    if (!form.vehicleNo.trim()) errors.vehicleNo = 'Vehicle number is required';
    if (!form.registrationNo.trim()) errors.registrationNo = 'Registration number is required';
    if (form.capacity === '' || Number(form.capacity) < 1) {
      errors.capacity = 'Capacity must be at least 1';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const normalizePayload = () => ({
    vehicleNo: form.vehicleNo.trim(),
    registrationNo: form.registrationNo.trim(),
    type: form.type,
    capacity: Number(form.capacity),
    manufacturer: form.manufacturer.trim() || undefined,
    model: form.model.trim() || undefined,
    driverName: form.driverName.trim() || undefined,
    driverPhone: form.driverPhone.trim() || undefined,
    attendantName: form.attendantName.trim() || undefined,
    insuranceExpiry: form.insuranceExpiry || null,
    pollutionExpiry: form.pollutionExpiry || null,
    fitnessExpiry: form.fitnessExpiry || null,
    status: form.status,
  });

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload = normalizePayload();
      if (editingVehicle) {
        await api.put(`/transport/vehicles/${editingVehicle.id || editingVehicle._id}`, payload);
        toast.success('Vehicle updated successfully');
      } else {
        await api.post('/transport/vehicles', payload);
        toast.success('Vehicle created successfully');
      }
      setIsFormOpen(false);
      setEditingVehicle(null);
      refetch();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to save vehicle';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteVehicle) return;
    setDeleting(true);
    try {
      await api.delete(`/transport/vehicles/${deleteVehicle.id || deleteVehicle._id}`);
      toast.success('Vehicle deleted successfully');
      setDeleteVehicle(null);
      refetch();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to delete vehicle';
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  const openAdd = () => {
    setEditingVehicle(null);
    setIsFormOpen(true);
  };

  const openEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingVehicle(null);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setTypeFilter('');
  };

  const hasFilters = searchTerm || statusFilter || typeFilter;

  const wrapperProps = shouldReduceMotion
    ? {}
    : { variants: containerVariants, initial: 'hidden', animate: 'visible' };
  const itemProps = shouldReduceMotion ? {} : { variants: itemVariants };

  return (
    <motion.div className="space-y-6" {...wrapperProps}>
      {/* Header */}
      <motion.div
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        {...itemProps}
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Vehicles</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Manage school transport vehicles, drivers and compliance dates
          </p>
        </div>
        <Button onClick={openAdd} className="w-full sm:w-auto">
          <Plus size={18} weight="bold" />
          Add Vehicle
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div className="grid grid-cols-2 gap-4 lg:grid-cols-4" {...itemProps}>
        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent-700">
            <Bus size={22} weight="duotone" />
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500">Total Vehicles</p>
            <p className="text-xl font-semibold text-zinc-900">{stats.total}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle size={22} weight="duotone" />
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500">Active</p>
            <p className="text-xl font-semibold text-zinc-900">{stats.active}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <Wrench size={22} weight="duotone" />
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500">Under Maintenance</p>
            <p className="text-xl font-semibold text-zinc-900">{stats.maintenance}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <CirclesThree size={22} weight="duotone" />
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500">Total Capacity</p>
            <p className="text-xl font-semibold text-zinc-900">{stats.totalCapacity}</p>
          </div>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div {...itemProps}>
        <Card className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="relative flex-1">
              <MagnifyingGlass
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                placeholder="Search vehicle no, registration, model, driver..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/20"
              />
            </div>
            <div className="sm:w-44">
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                options={[{ value: '', label: 'All Types' }, ...TYPE_OPTIONS]}
              />
            </div>
            <div className="sm:w-44">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[{ value: '', label: 'All Statuses' }, ...STATUS_OPTIONS]}
              />
            </div>
            {hasFilters && (
              <Button type="button" variant="ghost" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Error */}
      {error && (
        <motion.div
          {...itemProps}
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <Warning size={20} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Failed to load vehicles</p>
            <p className="mt-0.5 text-red-600">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Loading */}
      {loading && (
        <motion.div {...itemProps}>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/60">
                    <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Vehicle
                    </th>
                    <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Type
                    </th>
                    <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Capacity
                    </th>
                    <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Driver
                    </th>
                    <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Insurance
                    </th>
                    <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Fitness
                    </th>
                    <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Status
                    </th>
                    <th className="px-5 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <tr key={idx}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-9 w-9 rounded-lg" />
                          <div className="space-y-1.5">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-3 w-20" />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-12" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-28" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Skeleton className="h-8 w-8 rounded-lg" />
                          <Skeleton className="h-8 w-8 rounded-lg" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Empty */}
      {!loading && !error && filteredVehicles.length === 0 && (
        <motion.div {...itemProps}>
          <Card>
            <EmptyState
              title={hasFilters ? 'No matching vehicles' : 'No vehicles yet'}
              description={
                hasFilters
                  ? 'Try adjusting your search or filters.'
                  : 'Add your first vehicle to start managing school transport.'
              }
              icon={Bus}
              action={
                !hasFilters && (
                  <Button onClick={openAdd}>
                    <Plus size={18} weight="bold" />
                    Add Vehicle
                  </Button>
                )
              }
            />
          </Card>
        </motion.div>
      )}

      {/* Table */}
      {!loading && !error && filteredVehicles.length > 0 && (
        <motion.div {...itemProps}>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/60">
                    <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Vehicle
                    </th>
                    <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Type
                    </th>
                    <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Capacity
                    </th>
                    <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Driver
                    </th>
                    <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Insurance
                    </th>
                    <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Pollution
                    </th>
                    <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Fitness
                    </th>
                    <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Status
                    </th>
                    <th className="px-5 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredVehicles.map((vehicle) => {
                    const VehicleIcon = VEHICLE_TYPE_ICONS[vehicle.type] || Bus;
                    return (
                      <tr
                        key={vehicle.id || vehicle._id}
                        className="transition-colors hover:bg-zinc-50/60"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent-700">
                              <VehicleIcon size={18} weight="duotone" />
                            </div>
                            <div>
                              <p className="font-medium text-zinc-900">{vehicle.vehicleNo}</p>
                              <p className="text-xs text-zinc-500">
                                {vehicle.registrationNo || '—'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 capitalize text-zinc-700">
                          <Badge variant="accent">{vehicle.type}</Badge>
                        </td>
                        <td className="px-5 py-4 text-zinc-700">{vehicle.capacity || '—'}</td>
                        <td className="px-5 py-4">
                          <p className="text-zinc-900">{vehicle.driverName || '—'}</p>
                          {vehicle.driverPhone && (
                            <p className="text-xs text-zinc-500">{vehicle.driverPhone}</p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="space-y-0.5">
                            {getExpiryBadge(vehicle.insuranceExpiry)}
                            <p className="text-xs text-zinc-500">
                              {formatDate(vehicle.insuranceExpiry)}
                            </p>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="space-y-0.5">
                            {getExpiryBadge(vehicle.pollutionExpiry)}
                            <p className="text-xs text-zinc-500">
                              {formatDate(vehicle.pollutionExpiry)}
                            </p>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="space-y-0.5">
                            {getExpiryBadge(vehicle.fitnessExpiry)}
                            <p className="text-xs text-zinc-500">
                              {formatDate(vehicle.fitnessExpiry)}
                            </p>
                          </div>
                        </td>
                        <td className="px-5 py-4">{getStatusBadge(vehicle.status)}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(vehicle)}
                              className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                              aria-label="Edit vehicle"
                              title="Edit"
                            >
                              <PencilSimple size={18} />
                            </button>
                            <button
                              onClick={() => setDeleteVehicle(vehicle)}
                              className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600"
                              aria-label="Delete vehicle"
                              title="Delete"
                            >
                              <Trash size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-zinc-100 px-5 py-3 text-xs text-zinc-500">
              Showing {filteredVehicles.length} vehicle{filteredVehicles.length !== 1 ? 's' : ''}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}
        description="Enter vehicle details, driver information and compliance dates."
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              label="Vehicle Number"
              value={form.vehicleNo}
              onChange={(e) => setForm((f) => ({ ...f, vehicleNo: e.target.value }))}
              error={formErrors.vehicleNo}
              placeholder="e.g. BUS-101"
              required
            />
            <Input
              label="Registration Number"
              value={form.registrationNo}
              onChange={(e) => setForm((f) => ({ ...f, registrationNo: e.target.value }))}
              error={formErrors.registrationNo}
              placeholder="e.g. KCA 123A"
              required
            />
            <Select
              label="Vehicle Type"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              options={TYPE_OPTIONS}
              required
            />
            <Input
              label="Seating Capacity"
              type="number"
              min={1}
              value={form.capacity}
              onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
              error={formErrors.capacity}
              required
            />
            <Input
              label="Manufacturer"
              value={form.manufacturer}
              onChange={(e) => setForm((f) => ({ ...f, manufacturer: e.target.value }))}
              placeholder="e.g. Toyota"
            />
            <Input
              label="Model"
              value={form.model}
              onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
              placeholder="e.g. Coaster"
            />
            <Input
              label="Driver Name"
              value={form.driverName}
              onChange={(e) => setForm((f) => ({ ...f, driverName: e.target.value }))}
              placeholder="e.g. John Doe"
            />
            <Input
              label="Driver Phone"
              type="tel"
              value={form.driverPhone}
              onChange={(e) => setForm((f) => ({ ...f, driverPhone: e.target.value }))}
              placeholder="e.g. +254 700 000000"
            />
            <Input
              label="Attendant Name"
              value={form.attendantName}
              onChange={(e) => setForm((f) => ({ ...f, attendantName: e.target.value }))}
              placeholder="e.g. Jane Doe"
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              options={STATUS_OPTIONS}
              required
            />
            <Input
              label="Insurance Expiry"
              type="date"
              value={form.insuranceExpiry}
              onChange={(e) => setForm((f) => ({ ...f, insuranceExpiry: e.target.value }))}
              startIcon={<Calendar size={18} />}
            />
            <Input
              label="Pollution Certificate Expiry"
              type="date"
              value={form.pollutionExpiry}
              onChange={(e) => setForm((f) => ({ ...f, pollutionExpiry: e.target.value }))}
              startIcon={<Calendar size={18} />}
            />
            <Input
              label="Fitness Certificate Expiry"
              type="date"
              value={form.fitnessExpiry}
              onChange={(e) => setForm((f) => ({ ...f, fitnessExpiry: e.target.value }))}
              startIcon={<Calendar size={18} />}
            />
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={closeForm} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              {editingVehicle ? 'Update Vehicle' : 'Create Vehicle'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteVehicle}
        onClose={() => setDeleteVehicle(null)}
        title="Delete Vehicle"
        description={`Are you sure you want to delete "${deleteVehicle?.vehicleNo}"? This cannot be undone.`}
        size="sm"
      >
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setDeleteVehicle(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} isLoading={deleting}>
            <Trash size={18} weight="bold" />
            Delete Vehicle
          </Button>
        </div>
      </Modal>
    </motion.div>
  );
};

export default VehicleList;
