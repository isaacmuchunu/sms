import { useState, useEffect, useMemo, useCallback } from 'react';
import { useReducedMotion, motion } from 'framer-motion';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  House,
  Bed,
  Users,
  Wrench,
  Plus,
  CaretRight,
  DoorOpen,
  Clock,
  ArrowRight,
  CheckCircle,
  Warning,
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

const ROOM_TYPE_OPTIONS = [
  { value: '', label: 'All room types' },
  { value: 'single', label: 'Single' },
  { value: 'double', label: 'Double' },
  { value: 'triple', label: 'Triple' },
  { value: 'dormitory', label: 'Dormitory' },
];

const ROOM_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'available', label: 'Available' },
  { value: 'full', label: 'Full' },
  { value: 'under_maintenance', label: 'Under maintenance' },
];

const ROOM_STATUS_BADGE = {
  available: 'success',
  full: 'danger',
  under_maintenance: 'warning',
};

const ROOM_STATUS_LABEL = {
  available: 'Available',
  full: 'Full',
  under_maintenance: 'Under maintenance',
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
    return format(new Date(date), 'dd MMM yyyy, h:mm a');
  } catch {
    return '—';
  }
};

const initialRoomForm = {
  hostel: '',
  roomNo: '',
  floor: '',
  roomType: 'double',
  capacity: '',
  monthlyFee: '',
  facilities: '',
  status: 'available',
};

const RoomList = () => {
  const shouldReduceMotion = useReducedMotion();

  const [filters, setFilters] = useState({
    search: '',
    hostel: '',
    status: '',
    roomType: '',
  });

  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [isVisitorLogOpen, setIsVisitorLogOpen] = useState(false);
  const [roomForm, setRoomForm] = useState(initialRoomForm);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: rooms = [],
    loading: roomsLoading,
    error: roomsError,
    refetch: refetchRooms,
  } = useFetch('/hostel/rooms', {
    params: {
      search: debouncedSearch,
      hostel: filters.hostel,
      status: filters.status,
      roomType: filters.roomType,
      limit: 100,
      sort: 'roomNo',
    },
  });

  const { data: hostels = [], loading: hostelsLoading } = useFetch('/hostel/hostels', {
    params: { limit: 100, sort: 'name' },
  });

  const {
    data: visitorLogs = [],
    loading: visitorLogsLoading,
    error: visitorLogsError,
    refetch: refetchVisitorLogs,
  } = useFetch('/hostel/visitor-logs', {
    immediate: false,
    params: { limit: 50, sort: '-entryTime' },
  });

  const { data: roomDetail, loading: roomDetailLoading } = useFetch(
    selectedRoomId ? `/hostel/rooms/${selectedRoomId}` : null,
    { immediate: !!selectedRoomId }
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), 250);
    return () => clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    if (isVisitorLogOpen) {
      refetchVisitorLogs();
    }
  }, [isVisitorLogOpen, refetchVisitorLogs]);

  const stats = useMemo(() => {
    const total = rooms.length;
    const available = rooms.filter((r) => r.status === 'available').length;
    const full = rooms.filter((r) => r.status === 'full').length;
    const maintenance = rooms.filter((r) => r.status === 'under_maintenance').length;
    const totalCapacity = rooms.reduce((sum, r) => sum + (r.capacity || 0), 0);
    const totalOccupied = rooms.reduce((sum, r) => sum + (r.occupied || 0), 0);
    return { total, available, full, maintenance, totalCapacity, totalOccupied };
  }, [rooms]);

  const hostelOptions = useMemo(
    () => [
      { value: '', label: 'All hostels' },
      ...hostels.map((h) => ({ value: h._id, label: h.name })),
    ],
    [hostels]
  );

  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleRoomFormChange = useCallback((key, value) => {
    setRoomForm((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  const validateRoomForm = () => {
    const errors = {};
    if (!roomForm.hostel) errors.hostel = 'Select a hostel';
    if (!roomForm.roomNo.trim()) errors.roomNo = 'Room number is required';
    if (!roomForm.capacity || Number(roomForm.capacity) < 1) errors.capacity = 'Capacity must be at least 1';
    if (roomForm.monthlyFee && Number(roomForm.monthlyFee) < 0) errors.monthlyFee = 'Fee cannot be negative';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!validateRoomForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        hostel: roomForm.hostel,
        roomNo: roomForm.roomNo.trim(),
        floor: roomForm.floor.trim(),
        roomType: roomForm.roomType,
        capacity: Number(roomForm.capacity),
        monthlyFee: roomForm.monthlyFee ? Number(roomForm.monthlyFee) : 0,
        facilities: roomForm.facilities
          .split(',')
          .map((f) => f.trim())
          .filter(Boolean),
        status: roomForm.status,
      };

      await api.post('/hostel/rooms', payload);
      toast.success('Room created successfully');
      setRoomForm(initialRoomForm);
      setIsAddRoomOpen(false);
      refetchRooms();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create room';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckoutVisitor = async (logId) => {
    try {
      await api.put(`/hostel/visitor-logs/${logId}/checkout`);
      toast.success('Visitor checked out successfully');
      refetchVisitorLogs();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to check out visitor';
      toast.error(message);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.05,
      },
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
    { label: 'Total rooms', value: stats.total, icon: House, color: 'text-zinc-900' },
    { label: 'Available', value: stats.available, icon: CheckCircle, color: 'text-emerald-600' },
    { label: 'Full', value: stats.full, icon: Users, color: 'text-red-600' },
    { label: 'Maintenance', value: stats.maintenance, icon: Wrench, color: 'text-amber-600' },
    {
      label: 'Occupancy',
      value: `${stats.totalOccupied}/${stats.totalCapacity}`,
      icon: Bed,
      color: 'text-zinc-900',
    },
  ];

  const selectedRoom = roomDetail?.room || null;

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
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Hostel Rooms</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage rooms, occupancy, and visitor logs</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => setIsVisitorLogOpen(true)}>
            <Clock size={18} />
            Visitor log
          </Button>
          <Button onClick={() => setIsAddRoomOpen(true)}>
            <Plus size={18} />
            Add room
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((stat) => (
          <Card key={stat.label} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{stat.label}</p>
                <p className={`mt-1 text-2xl font-semibold tabular-nums ${stat.color}`}>{stat.value}</p>
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
            label="Search rooms"
            placeholder="Search by room number or floor"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
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
            label="Status"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            options={ROOM_STATUS_OPTIONS}
          />
          <Select
            label="Room type"
            value={filters.roomType}
            onChange={(e) => handleFilterChange('roomType', e.target.value)}
            options={ROOM_TYPE_OPTIONS}
          />
        </div>
      </motion.div>

      {/* Error */}
      {roomsError && (
        <motion.div
          variants={itemVariants}
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          role="alert"
        >
          <Warning size={18} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Failed to load rooms</p>
            <p className="mt-0.5 text-red-600">{roomsError}</p>
          </div>
          <Button variant="outline" size="sm" onClick={refetchRooms}>
            Retry
          </Button>
        </motion.div>
      )}

      {/* Room grid */}
      {roomsLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="mt-3 h-6 w-16" />
              <Skeleton className="mt-2 h-3 w-20" />
              <Skeleton className="mt-4 h-1.5 w-full" />
            </Card>
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <Card>
          <EmptyState
            title="No rooms found"
            description={
              debouncedSearch || filters.hostel || filters.status || filters.roomType
                ? 'Try adjusting your filters'
                : 'Add a room to get started with hostel management'
            }
            icon={House}
            action={
              <Button onClick={() => setIsAddRoomOpen(true)}>
                <Plus size={18} />
                Add room
              </Button>
            }
          />
        </Card>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        >
          {rooms.map((room) => {
            const occupancyPct = room.capacity
              ? Math.round(((room.occupied || 0) / room.capacity) * 100)
              : 0;
            const status = room.status || 'available';

            return (
              <motion.div
                key={room._id}
                variants={itemVariants}
                whileHover={shouldReduceMotion ? undefined : { y: -2 }}
                transition={{ duration: 0.16 }}
              >
                <Card
                  className="cursor-pointer p-5 transition-shadow duration-160 hover:shadow-card-hover"
                  onClick={() => setSelectedRoomId(room._id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setSelectedRoomId(room._id);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
                      <Bed size={18} />
                    </div>
                    <Badge variant={ROOM_STATUS_BADGE[status] || 'neutral'}>
                      {ROOM_STATUS_LABEL[status] || status}
                    </Badge>
                  </div>
                  <div className="mt-4">
                    <p className="text-lg font-semibold text-zinc-900">{room.roomNo}</p>
                    <p className="text-xs capitalize text-zinc-500">
                      {room.roomType} room
                      {room.hostel?.name ? ` · ${room.hostel.name}` : ''}
                    </p>
                  </div>
                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between text-xs text-zinc-600">
                      <span className="tabular-nums">
                        {room.occupied || 0}/{room.capacity || 0} occupied
                      </span>
                      <Users size={12} />
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className={`h-full rounded-full ${
                          status === 'full'
                            ? 'bg-red-500'
                            : status === 'under_maintenance'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${occupancyPct}%` }}
                      />
                    </div>
                  </div>
                  {room.vacancy > 0 && (
                    <div className="mt-3 flex items-center gap-1 text-xs font-medium text-emerald-700">
                      <span>{room.vacancy} bed{room.vacancy > 1 ? 's' : ''} available</span>
                      <CaretRight size={12} />
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Add Room Modal */}
      <Modal
        isOpen={isAddRoomOpen}
        onClose={() => !isSubmitting && setIsAddRoomOpen(false)}
        title="Add room"
        description="Create a new room in a hostel. Beds are generated automatically from capacity."
        size="md"
      >
        <form onSubmit={handleCreateRoom} className="space-y-4">
          <Select
            label="Hostel"
            value={roomForm.hostel}
            onChange={(e) => handleRoomFormChange('hostel', e.target.value)}
            options={[
              { value: '', label: 'Select a hostel' },
              ...hostels.map((h) => ({ value: h._id, label: h.name })),
            ]}
            error={formErrors.hostel}
            required
            disabled={hostelsLoading}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Room number"
              placeholder="e.g. 101"
              value={roomForm.roomNo}
              onChange={(e) => handleRoomFormChange('roomNo', e.target.value)}
              error={formErrors.roomNo}
              required
            />
            <Input
              label="Floor"
              placeholder="e.g. Ground"
              value={roomForm.floor}
              onChange={(e) => handleRoomFormChange('floor', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Room type"
              value={roomForm.roomType}
              onChange={(e) => handleRoomFormChange('roomType', e.target.value)}
              options={ROOM_TYPE_OPTIONS.filter((o) => o.value !== '')}
            />
            <Select
              label="Status"
              value={roomForm.status}
              onChange={(e) => handleRoomFormChange('status', e.target.value)}
              options={ROOM_STATUS_OPTIONS.filter((o) => o.value !== '')}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Capacity"
              type="number"
              min={1}
              placeholder="Number of beds"
              value={roomForm.capacity}
              onChange={(e) => handleRoomFormChange('capacity', e.target.value)}
              error={formErrors.capacity}
              required
            />
            <Input
              label="Monthly fee"
              type="number"
              min={0}
              step="0.01"
              placeholder="0.00"
              value={roomForm.monthlyFee}
              onChange={(e) => handleRoomFormChange('monthlyFee', e.target.value)}
              error={formErrors.monthlyFee}
            />
          </div>
          <Input
            label="Facilities"
            placeholder="AC, Wi-Fi, Study table (comma separated)"
            value={roomForm.facilities}
            onChange={(e) => handleRoomFormChange('facilities', e.target.value)}
          />
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddRoomOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Create room
            </Button>
          </div>
        </form>
      </Modal>

      {/* Room Detail Modal */}
      <Modal
        isOpen={!!selectedRoomId}
        onClose={() => setSelectedRoomId(null)}
        title={selectedRoom ? `Room ${selectedRoom.roomNo}` : 'Room details'}
        description={selectedRoom ? `${selectedRoom.hostel?.name || ''} · ${selectedRoom.roomType} room` : ''}
        size="lg"
      >
        {roomDetailLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : !selectedRoom ? (
          <EmptyState title="Room not found" icon={House} />
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={ROOM_STATUS_BADGE[selectedRoom.status] || 'neutral'}>
                {ROOM_STATUS_LABEL[selectedRoom.status] || selectedRoom.status}
              </Badge>
              <span className="text-sm text-zinc-500">
                {selectedRoom.occupied || 0}/{selectedRoom.capacity || 0} occupied
              </span>
              {selectedRoom.monthlyFee > 0 && (
                <span className="text-sm font-medium text-zinc-700">
                  {formatCurrency(selectedRoom.monthlyFee)}/month
                </span>
              )}
            </div>

            {selectedRoom.facilities?.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Facilities</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {selectedRoom.facilities.map((facility, idx) => (
                    <span
                      key={idx}
                      className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700"
                    >
                      {facility}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Beds</p>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {selectedRoom.beds?.map((bed) => {
                  const occupant = bed.occupiedBy;
                  const isOccupied = !!occupant;
                  return (
                    <div
                      key={bed.bedNo}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${
                        isOccupied
                          ? 'border-red-100 bg-red-50/50'
                          : 'border-emerald-100 bg-emerald-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Bed size={16} className={isOccupied ? 'text-red-500' : 'text-emerald-600'} />
                        <span className="text-sm font-medium text-zinc-900">Bed {bed.bedNo}</span>
                      </div>
                      {isOccupied ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-zinc-700">
                            {[occupant.firstName, occupant.lastName].filter(Boolean).join(' ')}
                          </span>
                          <Badge variant="danger">Occupied</Badge>
                        </div>
                      ) : (
                        <Badge variant="success">Vacant</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
              {(!selectedRoom.beds || selectedRoom.beds.length === 0) && (
                <p className="mt-2 text-sm text-zinc-500">No bed information available.</p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Visitor Log Modal */}
      <Modal
        isOpen={isVisitorLogOpen}
        onClose={() => setIsVisitorLogOpen(false)}
        title="Visitor log"
        description="Recent visitor entries and exits"
        size="xl"
      >
        {visitorLogsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : visitorLogsError ? (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <Warning size={18} className="mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Failed to load visitor logs</p>
              <p className="mt-0.5 text-red-600">{visitorLogsError}</p>
            </div>
            <Button variant="outline" size="sm" onClick={refetchVisitorLogs}>
              Retry
            </Button>
          </div>
        ) : visitorLogs.length === 0 ? (
          <EmptyState title="No visitor logs" description="Visitor entries will appear here" icon={DoorOpen} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Visitor</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Visiting</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Entry</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Exit</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {visitorLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-zinc-50/60">
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900">{log.visitorName}</p>
                      {log.relation && <p className="text-xs text-zinc-500">{log.relation}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-zinc-700">
                        {[log.student?.firstName, log.student?.lastName].filter(Boolean).join(' ')}
                      </p>
                      <p className="text-xs text-zinc-500">Room {log.room?.roomNo}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{formatDate(log.entryTime)}</td>
                    <td className="px-4 py-3 text-zinc-600">{log.exitTime ? formatDate(log.exitTime) : '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={log.status === 'checked_out' ? 'neutral' : 'warning'}>
                        {log.status === 'checked_out' ? 'Checked out' : 'Checked in'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {log.status !== 'checked_out' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCheckoutVisitor(log._id)}
                        >
                          <ArrowRight size={14} />
                          Check out
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </motion.div>
  );
};

export default RoomList;
