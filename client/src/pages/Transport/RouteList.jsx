import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  MagnifyingGlass,
  Bus,
  MapPin,
  Users,
  CurrencyInr,
  CaretDown,
  CaretUp,
  PencilSimple,
  Trash,
  RoadHorizon,
  CheckCircle,
  Warning,
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

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const staggerContainer = {
  animate: { transition: { staggerChildren: prefersReducedMotion ? 0 : 0.05 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const VEHICLE_TYPE_ICONS = {
  bus: Bus,
  van: Bus,
  car: Bus,
  other: Bus,
};

const formatCurrency = (value) => {
  const num = Number(value) || 0;
  return `KSh${num.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getStatusBadge = (status) => {
  switch (status) {
    case 'active':
      return <Badge variant="success">Active</Badge>;
    case 'inactive':
      return <Badge variant="neutral">Inactive</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
};

const emptyStop = () => ({
  name: '',
  sequence: '',
  pickupTime: '',
  dropTime: '',
  fee: '',
});

const initialFormState = {
  name: '',
  routeCode: '',
  vehicle: '',
  driver: '',
  attendant: '',
  monthlyFee: '',
  totalDistance: '',
  status: 'active',
  stops: [emptyStop()],
};

const RouteList = () => {
  const { data: routesRaw, loading: routesLoading, error: routesError, refetch } =
    useFetch('/transport/routes');
  const { data: vehiclesRaw, loading: vehiclesLoading } = useFetch('/transport/vehicles', {
    params: { status: 'active', limit: 500 },
  });

  const routes = useMemo(() => (Array.isArray(routesRaw) ? routesRaw : []), [routesRaw]);
  const vehicles = useMemo(() => (Array.isArray(vehiclesRaw) ? vehiclesRaw : []), [vehiclesRaw]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [form, setForm] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [deleteRoute, setDeleteRoute] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (editingRoute) {
      setForm({
        name: editingRoute.name || '',
        routeCode: editingRoute.routeCode || '',
        vehicle: editingRoute.vehicle?._id || editingRoute.vehicle || '',
        driver: editingRoute.driver || '',
        attendant: editingRoute.attendant || '',
        monthlyFee: editingRoute.monthlyFee ?? '',
        totalDistance: editingRoute.totalDistance ?? '',
        status: editingRoute.status || 'active',
        stops:
          editingRoute.stops?.length > 0
            ? editingRoute.stops.map((s) => ({
                name: s.name || '',
                sequence: s.sequence ?? '',
                pickupTime: s.pickupTime || '',
                dropTime: s.dropTime || '',
                fee: s.fee ?? '',
              }))
            : [emptyStop()],
      });
    } else {
      setForm(initialFormState);
    }
    setFormErrors({});
  }, [editingRoute, isFormOpen]);

  const filteredRoutes = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return routes.filter((route) => {
      const matchesSearch =
        !term ||
        route.name?.toLowerCase().includes(term) ||
        route.routeCode?.toLowerCase().includes(term) ||
        route.vehicle?.vehicleNo?.toLowerCase().includes(term) ||
        route.vehicle?.registrationNo?.toLowerCase().includes(term);
      const matchesStatus = !statusFilter || route.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [routes, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const activeRoutes = routes.filter((r) => r.status === 'active').length;
    const totalStudents = routes.reduce(
      (sum, r) => sum + (r.activeAllocationCount || 0),
      0
    );
    const avgFee =
      routes.length > 0
        ? Math.round(routes.reduce((sum, r) => sum + (r.monthlyFee || 0), 0) / routes.length)
        : 0;
    return {
      totalRoutes: routes.length,
      activeRoutes,
      totalStudents,
      avgFee,
    };
  }, [routes]);

  const vehicleOptions = useMemo(
    () =>
      vehicles.map((v) => ({
        value: v._id,
        label: `${v.vehicleNo} ${v.registrationNo ? `(${v.registrationNo})` : ''} — ${v.driverName || 'No driver'}`,
      })),
    [vehicles]
  );

  const validateForm = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Route name is required';
    if (!form.routeCode.trim()) errors.routeCode = 'Route code is required';
    if (!form.vehicle) errors.vehicle = 'Vehicle is required';
    if (form.monthlyFee !== '' && Number(form.monthlyFee) < 0) {
      errors.monthlyFee = 'Monthly fee cannot be negative';
    }

    const stopErrors = [];
    form.stops.forEach((stop, index) => {
      const se = {};
      if (!stop.name.trim()) se.name = 'Stop name is required';
      if (stop.pickupTime && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(stop.pickupTime)) {
        se.pickupTime = 'Use HH:MM format';
      }
      if (stop.dropTime && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(stop.dropTime)) {
        se.dropTime = 'Use HH:MM format';
      }
      if (stop.pickupTime && stop.dropTime && stop.dropTime <= stop.pickupTime) {
        se.dropTime = 'Drop time must be after pickup time';
      }
      if (Object.keys(se).length > 0) stopErrors[index] = se;
    });
    if (stopErrors.length > 0) errors.stops = stopErrors;
    if (form.stops.filter((s) => s.name.trim()).length === 0) {
      errors.stops = 'At least one stop is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const normalizePayload = () => {
    const payload = {
      name: form.name.trim(),
      routeCode: form.routeCode.trim(),
      vehicle: form.vehicle,
      driver: form.driver.trim(),
      attendant: form.attendant.trim(),
      monthlyFee: form.monthlyFee === '' ? 0 : Number(form.monthlyFee),
      totalDistance: form.totalDistance === '' ? 0 : Number(form.totalDistance),
      status: form.status,
      stops: form.stops
        .filter((s) => s.name.trim())
        .map((s, index) => ({
          name: s.name.trim(),
          sequence: s.sequence === '' ? index + 1 : Number(s.sequence),
          pickupTime: s.pickupTime || '',
          dropTime: s.dropTime || '',
          fee: s.fee === '' ? 0 : Number(s.fee),
        })),
    };
    return payload;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload = normalizePayload();
      if (editingRoute) {
        await api.put(`/transport/routes/${editingRoute._id}`, payload);
        toast.success('Route updated successfully');
      } else {
        await api.post('/transport/routes', payload);
        toast.success('Route created successfully');
      }
      setIsFormOpen(false);
      setEditingRoute(null);
      refetch();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to save route';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRoute) return;
    setDeleting(true);
    try {
      await api.delete(`/transport/routes/${deleteRoute._id}`);
      toast.success('Route deleted successfully');
      setDeleteRoute(null);
      refetch();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to delete route';
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  const openAdd = () => {
    setEditingRoute(null);
    setIsFormOpen(true);
  };

  const openEdit = (route) => {
    setEditingRoute(route);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingRoute(null);
  };

  const updateStop = (index, field, value) => {
    setForm((prev) => {
      const stops = [...prev.stops];
      stops[index] = { ...stops[index], [field]: value };
      return { ...prev, stops };
    });
  };

  const addStop = () => {
    setForm((prev) => ({ ...prev, stops: [...prev.stops, emptyStop()] }));
  };

  const removeStop = (index) => {
    setForm((prev) => {
      if (prev.stops.length <= 1) return prev;
      return { ...prev, stops: prev.stops.filter((_, i) => i !== index) };
    });
  };

  const isLoading = routesLoading || vehiclesLoading;

  return (
    <motion.div
      className="space-y-6"
      initial="initial"
      animate="animate"
      variants={staggerContainer}
    >
      {/* Header */}
      <motion.div
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        variants={staggerItem}
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Transport Routes</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage bus routes, stops and assigned vehicles</p>
        </div>
        <Button onClick={openAdd} className="w-full sm:w-auto">
          <Plus size={18} weight="bold" />
          Add Route
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
        variants={staggerItem}
      >
        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <RoadHorizon size={22} weight="duotone" />
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500">Total Routes</p>
            <p className="text-xl font-semibold text-zinc-900">{stats.totalRoutes}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle size={22} weight="duotone" />
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500">Active Routes</p>
            <p className="text-xl font-semibold text-zinc-900">{stats.activeRoutes}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Users size={22} weight="duotone" />
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500">Allocated Students</p>
            <p className="text-xl font-semibold text-zinc-900">{stats.totalStudents}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <CurrencyInr size={22} weight="duotone" />
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500">Avg Monthly Fee</p>
            <p className="text-xl font-semibold text-zinc-900">{formatCurrency(stats.avgFee)}</p>
          </div>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div variants={staggerItem}>
        <Card className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <MagnifyingGlass
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                placeholder="Search routes, codes or vehicles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
              />
            </div>
            <div className="sm:w-48">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[{ value: '', label: 'All Statuses' }, ...STATUS_OPTIONS]}
              />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Error */}
      {routesError && (
        <motion.div
          variants={staggerItem}
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <Warning size={20} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Failed to load routes</p>
            <p className="mt-0.5 text-red-600">{routesError}</p>
          </div>
        </motion.div>
      )}

      {/* Loading */}
      {isLoading && (
        <motion.div variants={staggerItem} className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </motion.div>
      )}

      {/* Empty */}
      {!isLoading && !routesError && filteredRoutes.length === 0 && (
        <motion.div variants={staggerItem}>
          <Card>
            <EmptyState
              title={searchTerm || statusFilter ? 'No matching routes' : 'No routes yet'}
              description={
                searchTerm || statusFilter
                  ? 'Try adjusting your search or filters.'
                  : 'Add your first transport route to start managing stops and allocations.'
              }
              icon={Bus}
              action={
                !(searchTerm || statusFilter) && (
                  <Button onClick={openAdd}>
                    <Plus size={18} weight="bold" />
                    Add Route
                  </Button>
                )
              }
            />
          </Card>
        </motion.div>
      )}

      {/* Routes Table */}
      {!isLoading && !routesError && filteredRoutes.length > 0 && (
        <motion.div variants={staggerItem}>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/60">
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Route
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Vehicle
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Stops
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Allocations
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Monthly Fee
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Status
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredRoutes.map((route) => {
                    const VehicleIcon = VEHICLE_TYPE_ICONS[route.vehicle?.type] || Bus;
                    const isExpanded = expandedId === route._id;
                    const capacity = route.vehicle?.capacity || 0;
                    const allocated = route.activeAllocationCount || 0;
                    return (
                      <React.Fragment key={route._id}>
                        <tr
                          className="transition-colors hover:bg-zinc-50/60"
                          onClick={() => setExpandedId((id) => (id === route._id ? null : route._id))}
                        >
                          <td className="cursor-pointer px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                                <MapPin size={18} weight="duotone" />
                              </div>
                              <div>
                                <p className="font-medium text-zinc-900">{route.name}</p>
                                <p className="text-xs text-zinc-500">{route.routeCode}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <VehicleIcon size={16} className="text-zinc-400" />
                              <div>
                                <p className="font-medium text-zinc-900">
                                  {route.vehicle?.vehicleNo || '—'}
                                </p>
                                <p className="text-xs text-zinc-500">
                                  {route.vehicle?.driverName || 'No driver'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-medium text-zinc-900">
                              {route.stops?.length || 0}
                            </span>
                            <span className="text-zinc-500"> stops</span>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`font-medium ${
                                capacity > 0 && allocated >= capacity
                                  ? 'text-red-600'
                                  : 'text-zinc-900'
                              }`}
                            >
                              {allocated}
                            </span>
                            <span className="text-zinc-500"> / {capacity || '—'}</span>
                          </td>
                          <td className="px-5 py-4 font-mono text-zinc-900">
                            {formatCurrency(route.monthlyFee)}
                          </td>
                          <td className="px-5 py-4">{getStatusBadge(route.status)}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEdit(route);
                                }}
                                className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                                aria-label="Edit route"
                                title="Edit"
                              >
                                <PencilSimple size={18} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteRoute(route);
                                }}
                                className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600"
                                aria-label="Delete route"
                                title="Delete"
                              >
                                <Trash size={18} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedId((id) => (id === route._id ? null : route._id));
                                }}
                                className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
                                aria-label={isExpanded ? 'Collapse stops' : 'Expand stops'}
                                title={isExpanded ? 'Collapse' : 'Expand'}
                              >
                                {isExpanded ? <CaretUp size={18} /> : <CaretDown size={18} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={7} className="bg-zinc-50/60 px-5 py-4">
                              <div className="rounded-xl border border-zinc-200 bg-white p-4">
                                <h4 className="mb-3 text-sm font-medium text-zinc-900">Route Stops</h4>
                                {route.stops?.length > 0 ? (
                                  <div className="space-y-3">
                                    {route.stops.map((stop, index) => (
                                      <div key={stop._id || index} className="flex items-start gap-3">
                                        <div className="flex flex-col items-center">
                                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">
                                            {stop.sequence || index + 1}
                                          </div>
                                          {index < route.stops.length - 1 && (
                                            <div className="mt-1 h-5 w-0.5 bg-emerald-200" />
                                          )}
                                        </div>
                                        <div className="flex flex-1 flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                          <div className="flex items-center gap-2">
                                            <MapPin size={16} className="text-zinc-400" />
                                            <span className="font-medium text-zinc-900">
                                              {stop.name}
                                            </span>
                                          </div>
                                          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                                            {stop.pickupTime && (
                                              <span>Pickup: {stop.pickupTime}</span>
                                            )}
                                            {stop.dropTime && <span>Drop: {stop.dropTime}</span>}
                                            {stop.fee > 0 && (
                                              <span className="font-mono text-zinc-700">
                                                Fee: {formatCurrency(stop.fee)}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-zinc-500">No stops configured.</p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editingRoute ? 'Edit Route' : 'Add Route'}
        description="Configure route details, assigned vehicle and stops."
        size="xl"
      >
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              label="Route Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              error={formErrors.name}
              required
            />
            <Input
              label="Route Code"
              value={form.routeCode}
              onChange={(e) => setForm((f) => ({ ...f, routeCode: e.target.value }))}
              error={formErrors.routeCode}
              required
            />
            <Select
              label="Vehicle"
              value={form.vehicle}
              onChange={(e) => setForm((f) => ({ ...f, vehicle: e.target.value }))}
              options={
                vehicleOptions.length > 0
                  ? [{ value: '', label: 'Select a vehicle' }, ...vehicleOptions]
                  : [{ value: '', label: 'No vehicles available' }]
              }
              error={formErrors.vehicle}
              required
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              options={STATUS_OPTIONS}
              required
            />
            <Input
              label="Driver Name"
              value={form.driver}
              onChange={(e) => setForm((f) => ({ ...f, driver: e.target.value }))}
              placeholder="Route driver"
            />
            <Input
              label="Attendant Name"
              value={form.attendant}
              onChange={(e) => setForm((f) => ({ ...f, attendant: e.target.value }))}
              placeholder="Route attendant"
            />
            <Input
              label="Monthly Fee"
              type="number"
              min={0}
              value={form.monthlyFee}
              onChange={(e) => setForm((f) => ({ ...f, monthlyFee: e.target.value }))}
              error={formErrors.monthlyFee}
            />
            <Input
              label="Total Distance (km)"
              type="number"
              min={0}
              step="0.1"
              value={form.totalDistance}
              onChange={(e) => setForm((f) => ({ ...f, totalDistance: e.target.value }))}
            />
          </div>

          <div className="border-t border-zinc-100 pt-5">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-medium text-zinc-900">Stops</h4>
              <Button type="button" variant="outline" size="sm" onClick={addStop}>
                <Plus size={16} weight="bold" />
                Add Stop
              </Button>
            </div>
            {formErrors.stops && typeof formErrors.stops === 'string' && (
              <p className="mb-2 text-xs text-red-600">{formErrors.stops}</p>
            )}
            <div className="space-y-3">
              {form.stops.map((stop, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 sm:grid-cols-12"
                >
                  <div className="sm:col-span-4">
                    <Input
                      label="Stop Name"
                      value={stop.name}
                      onChange={(e) => updateStop(index, 'name', e.target.value)}
                      error={formErrors.stops?.[index]?.name}
                      className="mb-0"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Input
                      label="Sequence"
                      type="number"
                      min={1}
                      value={stop.sequence}
                      onChange={(e) => updateStop(index, 'sequence', e.target.value)}
                      placeholder="Auto"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Input
                      label="Pickup"
                      type="time"
                      value={stop.pickupTime}
                      onChange={(e) => updateStop(index, 'pickupTime', e.target.value)}
                      error={formErrors.stops?.[index]?.pickupTime}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Input
                      label="Drop"
                      type="time"
                      value={stop.dropTime}
                      onChange={(e) => updateStop(index, 'dropTime', e.target.value)}
                      error={formErrors.stops?.[index]?.dropTime}
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <Input
                      label="Fee"
                      type="number"
                      min={0}
                      value={stop.fee}
                      onChange={(e) => updateStop(index, 'fee', e.target.value)}
                    />
                  </div>
                  <div className="flex items-end justify-end sm:col-span-1">
                    <button
                      type="button"
                      onClick={() => removeStop(index)}
                      className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600"
                      aria-label="Remove stop"
                      title="Remove stop"
                    >
                      <Trash size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={closeForm} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              {editingRoute ? 'Update Route' : 'Create Route'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteRoute}
        onClose={() => setDeleteRoute(null)}
        title="Delete Route"
        description={`Are you sure you want to delete "${deleteRoute?.name}"? This cannot be undone.`}
        size="sm"
      >
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setDeleteRoute(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} isLoading={deleting}>
            <Trash size={18} weight="bold" />
            Delete Route
          </Button>
        </div>
      </Modal>
    </motion.div>
  );
};

export default RouteList;
