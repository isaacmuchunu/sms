import { useState, useEffect, useMemo, useCallback } from 'react';
import { useReducedMotion, motion } from 'framer-motion';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  Bed,
  House,
  Users,
  Plus,
  MagnifyingGlass,
  SignOut,
  Warning,
  Student,
  Clock,
  CheckCircle,
  ArrowRight,
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
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Checked out' },
];

const STATUS_BADGE = {
  active: 'success',
  inactive: 'neutral',
};

const STATUS_LABEL = {
  active: 'Active',
  inactive: 'Checked out',
};

const formatCurrency = (value) => {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (date) => {
  if (!date) return '—';
  try {
    return format(new Date(date), 'dd MMM yyyy');
  } catch {
    return '—';
  }
};

const getStudentName = (student) =>
  student?.fullName || [student?.firstName, student?.lastName].filter(Boolean).join(' ') || 'Unnamed';

const initialForm = {
  student: '',
  hostel: '',
  room: '',
  bedNo: '',
  allocationDate: new Date().toISOString().split('T')[0],
  monthlyFee: '',
};

const HostelAllocations = () => {
  const shouldReduceMotion = useReducedMotion();

  const [filters, setFilters] = useState({
    search: '',
    hostel: '',
    room: '',
    status: '',
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutId, setCheckoutId] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const {
    data: allocations = [],
    loading: allocationsLoading,
    error: allocationsError,
    refetch: refetchAllocations,
  } = useFetch('/hostel/allocations', {
    params: {
      search: debouncedSearch,
      hostel: filters.hostel,
      room: filters.room,
      status: filters.status,
      limit: 100,
      sort: '-allocationDate',
    },
  });

  const { data: hostels = [], loading: hostelsLoading } = useFetch('/hostel/hostels', {
    params: { limit: 100, sort: 'name' },
  });

  const { data: rooms = [], loading: roomsLoading, refetch: refetchRooms } = useFetch('/hostel/rooms', {
    params: {
      hostel: filters.hostel || form.hostel || undefined,
      status: filters.hostel || form.hostel ? 'available' : undefined,
      limit: 100,
      sort: 'roomNo',
    },
  });

  const { data: students = [], loading: studentsLoading } = useFetch('/students', {
    params: { limit: 500, status: 'active', sort: 'firstName' },
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), 250);
    return () => clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    if (!isFormOpen) {
      setForm(initialForm);
      setFormErrors({});
    }
  }, [isFormOpen]);

  const stats = useMemo(() => {
    const list = Array.isArray(allocations) ? allocations : [];
    const active = list.filter((a) => a.status === 'active').length;
    const inactive = list.filter((a) => a.status === 'inactive').length;
    const capacity = rooms.reduce((sum, r) => sum + (r.capacity || 0), 0);
    const occupied = rooms.reduce((sum, r) => sum + (r.occupied || 0), 0);
    const occupancyRate = capacity > 0 ? Math.round((occupied / capacity) * 100) : 0;
    return { total: list.length, active, inactive, capacity, occupied, occupancyRate };
  }, [allocations, rooms]);

  const hostelOptions = useMemo(
    () => [
      { value: '', label: 'All hostels' },
      ...hostels.map((h) => ({ value: h._id, label: `${h.name} ${h.type ? `(${h.type})` : ''}` })),
    ],
    [hostels]
  );

  const roomOptions = useMemo(
    () => [
      { value: '', label: 'All rooms' },
      ...rooms.map((r) => ({
        value: r._id,
        label: `${r.roomNo}${r.floor ? ` · ${r.floor}` : ''} (${r.occupied || 0}/${r.capacity || 0})`,
      })),
    ],
    [rooms]
  );

  const formHostelOptions = useMemo(
    () => [{ value: '', label: 'Select a hostel' }, ...hostels.map((h) => ({ value: h._id, label: h.name }))],
    [hostels]
  );

  const formRoomOptions = useMemo(() => {
    const list = form.hostel
      ? rooms.filter((r) => r.hostel?._id === form.hostel || r.hostel?.id === form.hostel)
      : [];
    return [
      { value: '', label: 'Select a room' },
      ...list.map((r) => ({
        value: r._id,
        label: `${r.roomNo}${r.floor ? ` · ${r.floor}` : ''} · ${r.capacity - (r.occupied || 0)} bed${
          r.capacity - (r.occupied || 0) === 1 ? '' : 's'
        } free`,
      })),
    ];
  }, [rooms, form.hostel]);

  const studentOptions = useMemo(() => {
    const list = Array.isArray(students) ? students : students?.items || [];
    return [
      { value: '', label: 'Select a student' },
      ...list.map((s) => ({
        value: s._id,
        label: `${getStudentName(s)}${s.admissionNo ? ` · ${s.admissionNo}` : ''}`,
      })),
    ];
  }, [students]);

  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFormChange = useCallback((key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'hostel') {
        next.room = '';
      }
      if (key === 'room') {
        const room = rooms.find((r) => r._id === value);
        next.monthlyFee = room?.monthlyFee ?? '';
      }
      return next;
    });
    setFormErrors((prev) => ({ ...prev, [key]: undefined }));
  }, [rooms]);

  const validateForm = () => {
    const errors = {};
    if (!form.student) errors.student = 'Select a student';
    if (!form.hostel) errors.hostel = 'Select a hostel';
    if (!form.room) errors.room = 'Select a room';
    if (form.monthlyFee && Number(form.monthlyFee) < 0) errors.monthlyFee = 'Fee cannot be negative';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        student: form.student,
        hostel: form.hostel,
        room: form.room,
        bedNo: form.bedNo?.trim() || undefined,
        allocationDate: form.allocationDate,
        monthlyFee: form.monthlyFee ? Number(form.monthlyFee) : undefined,
      };
      await api.post('/hostel/allocations', payload);
      toast.success('Room allocated successfully');
      setIsFormOpen(false);
      refetchAllocations();
      refetchRooms();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to allocate room';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckout = async () => {
    if (!checkoutId) return;
    setCheckoutLoading(true);
    try {
      await api.post(`/hostel/allocations/${checkoutId}/vacate`);
      toast.success('Student checked out successfully');
      setCheckoutId(null);
      refetchAllocations();
      refetchRooms();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to check out student';
      toast.error(message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: shouldReduceMotion ? 0 : 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] },
    },
  };

  const statCards = [
    { label: 'Total allocations', value: stats.total, icon: Users, color: 'text-zinc-900' },
    { label: 'Active', value: stats.active, icon: CheckCircle, color: 'text-emerald-600' },
    { label: 'Checked out', value: stats.inactive, icon: SignOut, color: 'text-zinc-500' },
    {
      label: 'Occupancy',
      value: `${stats.occupancyRate}%`,
      subValue: `${stats.occupied}/${stats.capacity}`,
      icon: Bed,
      color: 'text-accent-600',
    },
  ];

  const filteredAllocations = useMemo(() => {
    const list = Array.isArray(allocations) ? allocations : [];
    if (!debouncedSearch) return list;
    const query = debouncedSearch.toLowerCase();
    return list.filter((a) => {
      const studentName = getStudentName(a.student).toLowerCase();
      const admissionNo = a.student?.admissionNo?.toLowerCase() || '';
      const roomNo = a.room?.roomNo?.toLowerCase() || '';
      const hostelName = a.hostel?.name?.toLowerCase() || a.room?.hostel?.name?.toLowerCase() || '';
      return (
        studentName.includes(query) ||
        admissionNo.includes(query) ||
        roomNo.includes(query) ||
        hostelName.includes(query)
      );
    });
  }, [allocations, debouncedSearch]);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Room allocations</h1>
          <p className="mt-1 text-sm text-zinc-500">Assign students to hostel rooms and manage checkouts</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus size={18} weight="bold" />
          Allocate room
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{stat.label}</p>
                <p className={`mt-1 text-2xl font-semibold tabular-nums ${stat.color}`}>{stat.value}</p>
                {stat.subValue && <p className="mt-0.5 text-xs text-zinc-500">{stat.subValue} beds occupied</p>}
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
                <stat.icon size={18} />
              </div>
            </div>
          </Card>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex-1">
          <Input
            label="Search allocations"
            placeholder="Search by student, admission no, room or hostel"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            startIcon={<MagnifyingGlass size={18} />}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:w-auto">
          <Select
            label="Hostel"
            value={filters.hostel}
            onChange={(e) => handleFilterChange('hostel', e.target.value)}
            options={hostelOptions}
            disabled={hostelsLoading}
          />
          <Select
            label="Room"
            value={filters.room}
            onChange={(e) => handleFilterChange('room', e.target.value)}
            options={roomOptions}
            disabled={roomsLoading || !filters.hostel}
          />
          <Select
            label="Status"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            options={STATUS_OPTIONS}
          />
        </div>
      </motion.div>

      {/* Error */}
      {allocationsError && (
        <motion.div
          variants={itemVariants}
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          role="alert"
        >
          <Warning size={18} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Failed to load allocations</p>
            <p className="mt-0.5 text-red-600">{allocationsError}</p>
          </div>
          <Button variant="outline" size="sm" onClick={refetchAllocations}>
            Retry
          </Button>
        </motion.div>
      )}

      {/* Allocations table */}
      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/60">
                  <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Student
                  </th>
                  <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Hostel / Room
                  </th>
                  <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Bed
                  </th>
                  <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Allocation date
                  </th>
                  <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Monthly fee
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
                {allocationsLoading ? (
                  Array.from({ length: 6 }).map((_, idx) => (
                    <tr key={idx}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-9 w-9 rounded-full" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-28" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-12" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-20" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end">
                          <Skeleton className="h-8 w-20 rounded-lg" />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : filteredAllocations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12">
                      <EmptyState
                        icon={Bed}
                        title="No allocations found"
                        description={
                          debouncedSearch || filters.hostel || filters.room || filters.status
                            ? 'Try adjusting your filters'
                            : 'Allocate a student to a room to get started'
                        }
                        action={
                          <Button onClick={() => setIsFormOpen(true)}>
                            <Plus size={18} weight="bold" />
                            Allocate room
                          </Button>
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  filteredAllocations.map((allocation) => (
                    <tr key={allocation._id} className="transition-colors hover:bg-zinc-50/60">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-subtle text-xs font-semibold text-accent-700">
                            <Student size={18} weight="bold" />
                          </div>
                          <div>
                            <p className="font-medium text-zinc-900">{getStudentName(allocation.student)}</p>
                            <p className="text-xs text-zinc-500">
                              {allocation.student?.admissionNo || '—'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-zinc-900">
                          {allocation.hostel?.name || allocation.room?.hostel?.name || '—'}
                        </p>
                        <p className="text-xs text-zinc-500">
                          Room {allocation.room?.roomNo || '—'}
                          {allocation.room?.floor ? ` · ${allocation.room.floor}` : ''}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-zinc-700">
                        {allocation.bedNo ? `Bed ${allocation.bedNo}` : '—'}
                      </td>
                      <td className="px-5 py-4 text-zinc-700">
                        {formatDate(allocation.allocationDate)}
                      </td>
                      <td className="px-5 py-4 text-zinc-700">
                        {formatCurrency(allocation.monthlyFee)}
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={STATUS_BADGE[allocation.status] || 'neutral'}>
                          {STATUS_LABEL[allocation.status] || allocation.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {allocation.status === 'active' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCheckoutId(allocation._id)}
                            >
                              <SignOut size={16} />
                              Check out
                            </Button>
                          )}
                          {allocation.status === 'inactive' && (
                            <span className="flex items-center gap-1 text-xs text-zinc-500">
                              <Clock size={14} />
                              {formatDate(allocation.deallocationDate)}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!allocationsLoading && filteredAllocations.length > 0 && (
            <div className="border-t border-zinc-100 px-5 py-3 text-xs text-zinc-500">
              Showing {filteredAllocations.length} allocation
              {filteredAllocations.length !== 1 ? 's' : ''}
            </div>
          )}
        </Card>
      </motion.div>

      {/* Create Allocation Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => !isSubmitting && setIsFormOpen(false)}
        title="Allocate room"
        description="Assign a student to a hostel room. Beds are auto-assigned when left empty."
        size="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Select
            label="Student"
            value={form.student}
            onChange={(e) => handleFormChange('student', e.target.value)}
            options={studentOptions}
            error={formErrors.student}
            required
            disabled={studentsLoading}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Hostel"
              value={form.hostel}
              onChange={(e) => handleFormChange('hostel', e.target.value)}
              options={formHostelOptions}
              error={formErrors.hostel}
              required
              disabled={hostelsLoading}
            />
            <Select
              label="Room"
              value={form.room}
              onChange={(e) => handleFormChange('room', e.target.value)}
              options={formRoomOptions}
              error={formErrors.room}
              required
              disabled={roomsLoading || !form.hostel}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Bed number"
              placeholder="Auto-assign if empty"
              value={form.bedNo}
              onChange={(e) => handleFormChange('bedNo', e.target.value)}
              disabled={!form.room}
            />
            <Input
              label="Allocation date"
              type="date"
              value={form.allocationDate}
              onChange={(e) => handleFormChange('allocationDate', e.target.value)}
              required
            />
          </div>
          <Input
            label="Monthly fee"
            type="number"
            min={0}
            step="0.01"
            placeholder="0.00"
            value={form.monthlyFee}
            onChange={(e) => handleFormChange('monthlyFee', e.target.value)}
            error={formErrors.monthlyFee}
            helper="Defaults to the room's monthly fee"
          />
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFormOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              <ArrowRight size={16} />
              Allocate
            </Button>
          </div>
        </form>
      </Modal>

      {/* Checkout Confirmation Modal */}
      <Modal
        isOpen={!!checkoutId}
        onClose={() => !checkoutLoading && setCheckoutId(null)}
        title="Check out student"
        description="This will vacate the bed and mark the allocation as checked out."
        size="sm"
      >
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => setCheckoutId(null)} disabled={checkoutLoading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleCheckout} isLoading={checkoutLoading}>
            <SignOut size={16} />
            Check out
          </Button>
        </div>
      </Modal>
    </motion.div>
  );
};

export default HostelAllocations;
