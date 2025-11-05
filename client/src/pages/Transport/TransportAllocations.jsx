import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Bus,
  Plus,
  MagnifyingGlass,
  Student,
  MapPin,
  Trash,
  Warning,
  CheckCircle,
  Users,
  CalendarBlank,
  Coins,
  X,
} from '@phosphor-icons/react';
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

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const formatCurrency = (value) => {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
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

const getContainerVariants = (reduce) =>
  reduce
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
      };

const getItemVariants = (reduce) =>
  reduce
    ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
    : {
        hidden: { opacity: 0, y: 8 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.23, 1, 0.32, 1] } },
      };

const useStudentSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await api.get('/students/search', { params: { q: query.trim(), limit: 10 } });
        const payload = res.data.data || res.data;
        const students = payload.students || payload.items || payload || [];
        setResults(students);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [query]);

  return { query, setQuery, results, loading };
};

const StudentSearchDropdown = ({
  label,
  placeholder,
  value,
  onChange,
  results,
  loading,
  onSelect,
  selected,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      {label && <label className="mb-1.5 block text-sm font-medium text-zinc-700">{label}</label>}
      <div className="relative">
        <Student size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors hover:border-zinc-300 focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/20"
        />
      </div>
      {open && (
        <div className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-dropdown">
          {loading ? (
            <div className="space-y-2 px-3 py-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-zinc-500">No students found</p>
          ) : (
            results.map((student) => {
              const name = [student.firstName, student.lastName].filter(Boolean).join(' ');
              return (
                <button
                  key={student.id || student._id}
                  type="button"
                  onClick={() => {
                    onSelect(student);
                    setOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left transition-colors hover:bg-zinc-50"
                >
                  <p className="font-medium text-zinc-900">{name}</p>
                  <p className="text-xs text-zinc-500">
                    {student.admissionNo || '—'}
                    {student.class?.name ? ` • ${student.class.name}` : ''}
                  </p>
                </button>
              );
            })
          )}
        </div>
      )}
      {selected && (
        <div className="mt-2 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle size={16} weight="bold" />
            <span className="truncate">{selected}</span>
          </div>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="rounded p-1 text-emerald-700 hover:bg-emerald-100"
            aria-label="Clear student"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

const initialFormState = {
  student: null,
  route: '',
  pickupStop: '',
  dropStop: '',
  monthlyFee: '',
  effectiveFrom: new Date().toISOString().split('T')[0],
  status: 'active',
};

const TransportAllocations = () => {
  const shouldReduceMotion = useReducedMotion();

  const [filters, setFilters] = useState({
    search: '',
    route: '',
    status: '',
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const {
    data: allocationsRaw,
    loading: allocationsLoading,
    error: allocationsError,
    refetch: refetchAllocations,
  } = useFetch('/transport/allocations', {
    params: {
      search: debouncedSearch,
      route: filters.route,
      status: filters.status,
      limit: 100,
      sort: '-createdAt',
    },
  });

  const { data: routesRaw, loading: routesLoading } = useFetch('/transport/routes', {
    params: { status: 'active', limit: 500, sort: 'name' },
  });

  const allocations = useMemo(() => (Array.isArray(allocationsRaw) ? allocationsRaw : []), [allocationsRaw]);
  const routes = useMemo(() => (Array.isArray(routesRaw) ? routesRaw : []), [routesRaw]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [deleteAllocation, setDeleteAllocation] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const studentSearch = useStudentSearch();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search.trim()), 250);
    return () => clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    if (form.student) {
      const name = [form.student.firstName, form.student.lastName].filter(Boolean).join(' ');
      studentSearch.setQuery(name);
    } else {
      studentSearch.setQuery('');
    }
  }, [form.student]);

  const selectedRoute = useMemo(
    () => routes.find((r) => (r.id || r._id) === form.route) || null,
    [routes, form.route]
  );

  const stopOptions = useMemo(() => {
    if (!selectedRoute?.stops?.length) return [];
    return selectedRoute.stops.map((stop) => ({
      value: stop.name,
      label: `${stop.name}${stop.sequence ? ` (${stop.sequence})` : ''}`,
    }));
  }, [selectedRoute]);

  const routeOptions = useMemo(
    () =>
      routes.map((route) => ({
        value: route.id || route._id,
        label: `${route.name} ${route.routeCode ? `(${route.routeCode})` : ''}`,
      })),
    [routes]
  );

  const stats = useMemo(() => {
    const total = allocations.length;
    const active = allocations.filter((a) => a.status === 'active').length;
    const inactive = allocations.filter((a) => a.status === 'inactive').length;
    const totalFee = allocations.reduce((sum, a) => sum + (a.monthlyFee || 0), 0);
    return { total, active, inactive, totalFee };
  }, [allocations]);

  const filteredAllocations = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    return allocations.filter((allocation) => {
      const student = allocation.student || {};
      const matchesSearch =
        !term ||
        [student.firstName, student.lastName].filter(Boolean).join(' ').toLowerCase().includes(term) ||
        (student.admissionNo || '').toLowerCase().includes(term) ||
        (student.rollNo || '').toLowerCase().includes(term);
      const matchesRoute = !filters.route || (allocation.route?.id || allocation.route?._id) === filters.route;
      const matchesStatus = !filters.status || allocation.status === filters.status;
      return matchesSearch && matchesRoute && matchesStatus;
    });
  }, [allocations, filters]);

  const validateForm = () => {
    const errors = {};
    if (!form.student) errors.student = 'Select a student';
    if (!form.route) errors.route = 'Select a route';
    if (!form.pickupStop) errors.pickupStop = 'Select a pickup stop';
    if (!form.dropStop) errors.dropStop = 'Select a drop stop';
    if (form.monthlyFee !== '' && Number(form.monthlyFee) < 0) {
      errors.monthlyFee = 'Monthly fee cannot be negative';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRouteChange = (routeId) => {
    const route = routes.find((r) => (r.id || r._id) === routeId) || null;
    setForm((prev) => ({
      ...prev,
      route: routeId,
      pickupStop: '',
      dropStop: '',
      monthlyFee: route ? route.monthlyFee ?? '' : '',
    }));
    setFormErrors((prev) => ({ ...prev, route: undefined, pickupStop: undefined, dropStop: undefined }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload = {
        student: form.student.id || form.student._id,
        route: form.route,
        pickupStop: form.pickupStop,
        dropStop: form.dropStop,
        monthlyFee: form.monthlyFee === '' ? undefined : Number(form.monthlyFee),
        effectiveFrom: form.effectiveFrom || new Date().toISOString(),
        status: form.status,
      };
      await api.post('/transport/allocations', payload);
      toast.success('Transport allocation created successfully');
      setIsFormOpen(false);
      setForm(initialFormState);
      refetchAllocations();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create allocation';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteAllocation) return;
    setDeleting(true);
    try {
      const id = deleteAllocation.id || deleteAllocation._id;
      await api.delete(`/transport/allocations/${id}`);
      toast.success('Transport allocation removed successfully');
      setDeleteAllocation(null);
      refetchAllocations();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to remove allocation';
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  const openAdd = () => {
    setForm(initialFormState);
    setFormErrors({});
    studentSearch.setQuery('');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setIsFormOpen(false);
    setForm(initialFormState);
    setFormErrors({});
    studentSearch.setQuery('');
  };

  const isLoading = allocationsLoading || routesLoading;

  return (
    <motion.div
      className="space-y-6"
      variants={getContainerVariants(shouldReduceMotion)}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div
        variants={getItemVariants(shouldReduceMotion)}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Transport Allocations</h1>
          <p className="mt-1 text-sm text-zinc-500">Assign students to routes, stops and fees</p>
        </div>
        <Button onClick={openAdd} className="w-full sm:w-auto">
          <Plus size={18} weight="bold" />
          Allocate Student
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div
        variants={getItemVariants(shouldReduceMotion)}
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Users size={22} weight="duotone" />
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500">Total Allocations</p>
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
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
            <Bus size={22} weight="duotone" />
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500">Inactive</p>
            <p className="text-xl font-semibold text-zinc-900">{stats.inactive}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Coins size={22} weight="duotone" />
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500">Total Monthly Fee</p>
            <p className="text-xl font-semibold text-zinc-900">{formatCurrency(stats.totalFee)}</p>
          </div>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div variants={getItemVariants(shouldReduceMotion)}>
        <Card className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <MagnifyingGlass
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                placeholder="Search by student name or admission number..."
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors hover:border-zinc-300 focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/20"
              />
            </div>
            <div className="sm:w-56">
              <Select
                value={filters.route}
                onChange={(e) => setFilters((prev) => ({ ...prev, route: e.target.value }))}
                options={[{ value: '', label: 'All routes' }, ...routeOptions]}
                disabled={routesLoading}
              />
            </div>
            <div className="sm:w-44">
              <Select
                value={filters.status}
                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                options={[{ value: '', label: 'All statuses' }, ...STATUS_OPTIONS]}
              />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Error */}
      {allocationsError && (
        <motion.div
          variants={getItemVariants(shouldReduceMotion)}
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          role="alert"
        >
          <Warning size={20} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Failed to load allocations</p>
            <p className="mt-0.5 text-red-600">{allocationsError}</p>
          </div>
          <Button variant="outline" size="sm" onClick={refetchAllocations}>
            Retry
          </Button>
        </motion.div>
      )}

      {/* Loading */}
      {isLoading && (
        <motion.div variants={getItemVariants(shouldReduceMotion)} className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </motion.div>
      )}

      {/* Empty */}
      {!isLoading && !allocationsError && filteredAllocations.length === 0 && (
        <motion.div variants={getItemVariants(shouldReduceMotion)}>
          <Card>
            <EmptyState
              title={
                filters.search || filters.route || filters.status
                  ? 'No matching allocations'
                  : 'No allocations yet'
              }
              description={
                filters.search || filters.route || filters.status
                  ? 'Try adjusting your search or filters.'
                  : 'Assign your first student to a transport route.'
              }
              icon={Bus}
              action={
                !(filters.search || filters.route || filters.status) && (
                  <Button onClick={openAdd}>
                    <Plus size={18} weight="bold" />
                    Allocate Student
                  </Button>
                )
              }
            />
          </Card>
        </motion.div>
      )}

      {/* Table */}
      {!isLoading && !allocationsError && filteredAllocations.length > 0 && (
        <motion.div variants={getItemVariants(shouldReduceMotion)}>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/60">
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Student
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Route
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Stops
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Monthly Fee
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Effective From
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
                  {filteredAllocations.map((allocation) => {
                    const student = allocation.student || {};
                    const route = allocation.route || {};
                    const studentName = [student.firstName, student.lastName].filter(Boolean).join(' ');
                    const id = allocation.id || allocation._id;
                    return (
                      <tr key={id} className="transition-colors hover:bg-zinc-50/60">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                              <Student size={18} weight="duotone" />
                            </div>
                            <div>
                              <p className="font-medium text-zinc-900">{studentName || '—'}</p>
                              <p className="text-xs text-zinc-500">
                                {student.admissionNo || '—'}
                                {student.class ? ` • ${student.class}` : ''}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Bus size={16} className="text-zinc-400" />
                            <div>
                              <p className="font-medium text-zinc-900">{route.name || '—'}</p>
                              <p className="text-xs text-zinc-500">{route.routeCode || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-zinc-600">
                              <MapPin size={14} className="text-emerald-600" />
                              <span>Pickup: {allocation.pickupStop || '—'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-zinc-600">
                              <MapPin size={14} className="text-zinc-400" />
                              <span>Drop: {allocation.dropStop || '—'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-mono text-zinc-900">
                          {formatCurrency(allocation.monthlyFee)}
                        </td>
                        <td className="px-5 py-4 text-zinc-600">
                          <div className="flex items-center gap-1.5">
                            <CalendarBlank size={14} className="text-zinc-400" />
                            {formatDate(allocation.effectiveFrom)}
                          </div>
                        </td>
                        <td className="px-5 py-4">{getStatusBadge(allocation.status)}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setDeleteAllocation(allocation)}
                              className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600"
                              aria-label="Remove allocation"
                              title="Remove"
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
          </Card>
        </motion.div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title="Allocate Student"
        description="Assign a student to a transport route and pick their stops."
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-5">
          <StudentSearchDropdown
            label="Student"
            placeholder="Search by name or admission number"
            value={studentSearch.query}
            onChange={(value) => {
              studentSearch.setQuery(value);
              if (form.student) setForm((prev) => ({ ...prev, student: null }));
            }}
            results={studentSearch.results}
            loading={studentSearch.loading}
            onSelect={(student) => {
              setForm((prev) => ({ ...prev, student }));
              setFormErrors((prev) => ({ ...prev, student: undefined }));
            }}
            selected={
              form.student
                ? [
                    form.student.firstName,
                    form.student.lastName,
                    form.student.admissionNo ? `(${form.student.admissionNo})` : '',
                  ]
                    .filter(Boolean)
                    .join(' ')
                : null
            }
          />
          {formErrors.student && <p className="text-xs text-danger-600">{formErrors.student}</p>}

          <Select
            label="Route"
            value={form.route}
            onChange={(e) => handleRouteChange(e.target.value)}
            options={
              routeOptions.length > 0
                ? [{ value: '', label: 'Select a route' }, ...routeOptions]
                : [{ value: '', label: 'No routes available' }]
            }
            error={formErrors.route}
            required
            disabled={routesLoading}
          />

          {selectedRoute && (
            <div className="rounded-lg border border-zinc-100 bg-zinc-50/60 p-3 text-xs text-zinc-600">
              <p>
                Vehicle: <span className="font-medium text-zinc-900">{selectedRoute.vehicle?.vehicleNo || '—'}</span>
              </p>
              <p className="mt-0.5">
                Driver: <span className="font-medium text-zinc-900">{selectedRoute.vehicle?.driverName || '—'}</span>
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Select
              label="Pickup Stop"
              value={form.pickupStop}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, pickupStop: e.target.value }));
                setFormErrors((prev) => ({ ...prev, pickupStop: undefined }));
              }}
              options={
                stopOptions.length > 0
                  ? [{ value: '', label: 'Select pickup stop' }, ...stopOptions]
                  : [{ value: '', label: selectedRoute ? 'No stops available' : 'Select a route first' }]
              }
              error={formErrors.pickupStop}
              required
              disabled={!selectedRoute}
            />
            <Select
              label="Drop Stop"
              value={form.dropStop}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, dropStop: e.target.value }));
                setFormErrors((prev) => ({ ...prev, dropStop: undefined }));
              }}
              options={
                stopOptions.length > 0
                  ? [{ value: '', label: 'Select drop stop' }, ...stopOptions]
                  : [{ value: '', label: selectedRoute ? 'No stops available' : 'Select a route first' }]
              }
              error={formErrors.dropStop}
              required
              disabled={!selectedRoute}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              label="Monthly Fee"
              type="number"
              min={0}
              step="0.01"
              value={form.monthlyFee}
              onChange={(e) => setForm((prev) => ({ ...prev, monthlyFee: e.target.value }))}
              error={formErrors.monthlyFee}
              placeholder="Route default fee"
            />
            <Input
              label="Effective From"
              type="date"
              value={form.effectiveFrom}
              onChange={(e) => setForm((prev) => ({ ...prev, effectiveFrom: e.target.value }))}
              required
            />
          </div>

          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
            options={STATUS_OPTIONS}
            required
          />

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={closeForm} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              <Plus size={18} weight="bold" />
              Create Allocation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteAllocation}
        onClose={() => !deleting && setDeleteAllocation(null)}
        title="Remove Allocation"
        description="Are you sure you want to remove this transport allocation? This will mark it as inactive."
        size="sm"
      >
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setDeleteAllocation(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} isLoading={deleting}>
            <Trash size={18} weight="bold" />
            Remove Allocation
          </Button>
        </div>
      </Modal>
    </motion.div>
  );
};

export default TransportAllocations;
