import { useState, useEffect, useMemo, useCallback } from 'react';
import { useReducedMotion, motion } from 'framer-motion';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  Users,
  Plus,
  MagnifyingGlass,
  CheckCircle,
  XCircle,
  ArrowRight,
  Clock,
  DoorOpen,
  Warning,
  User,
  House,
  Faders,
  SignOut,
  Check,
  Prohibit,
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
  { value: 'checked_in', label: 'Checked in' },
  { value: 'checked_out', label: 'Checked out' },
];

const APPROVAL_OPTIONS = [
  { value: '', label: 'All approvals' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const APPROVAL_BADGE = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

const STATUS_BADGE = {
  checked_in: 'warning',
  checked_out: 'neutral',
};

const formatDate = (date) => {
  if (!date) return '—';
  try {
    return format(new Date(date), 'dd MMM yyyy, h:mm a');
  } catch {
    return '—';
  }
};

const formatDateTimeLocal = (date) => {
  try {
    return format(new Date(date), "yyyy-MM-dd'T'HH:mm");
  } catch {
    return '';
  }
};

const initialForm = {
  student: '',
  room: '',
  visitorName: '',
  visitorPhone: '',
  relation: '',
  purpose: '',
  idProofType: '',
  idProofNumber: '',
  entryTime: formatDateTimeLocal(new Date()),
  remarks: '',
};

const VisitorLog = () => {
  const shouldReduceMotion = useReducedMotion();

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    approvalStatus: '',
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  const [form, setForm] = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [actionId, setActionId] = useState(null);
  const [actionType, setActionType] = useState(null);

  const {
    data: logs = [],
    loading: logsLoading,
    error: logsError,
    refetch: refetchLogs,
  } = useFetch('/hostel/visitor-logs', {
    params: {
      search: debouncedSearch,
      status: filters.status,
      approvalStatus: filters.approvalStatus,
      limit: 50,
      sort: '-entryTime',
    },
  });

  const { data: students = [], loading: studentsLoading } = useFetch('/students', {
    params: { status: 'active', limit: 200 },
  });

  const { data: rooms = [], loading: roomsLoading } = useFetch('/hostel/rooms', {
    params: { limit: 100, sort: 'roomNo' },
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), 250);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const stats = useMemo(() => {
    const total = logs.length;
    const pending = logs.filter((l) => l.approvalStatus === 'pending').length;
    const approved = logs.filter((l) => l.approvalStatus === 'approved').length;
    const checkedIn = logs.filter((l) => l.status === 'checked_in').length;
    return { total, pending, approved, checkedIn };
  }, [logs]);

  const studentOptions = useMemo(
    () => [
      { value: '', label: 'Select a student' },
      ...students.map((s) => ({
        value: s._id,
        label: `${s.firstName} ${s.lastName || ''} (${s.admissionNo || '—'})`.trim(),
      })),
    ],
    [students]
  );

  const roomOptions = useMemo(
    () => [
      { value: '', label: 'Select a room' },
      ...rooms.map((r) => ({
        value: r.id,
        label: `${r.roomNo}${r.hostel?.name ? ` · ${r.hostel.name}` : ''}${r.floor ? ` · ${r.floor}` : ''}`,
      })),
    ],
    [rooms]
  );

  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFormChange = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  const validateForm = () => {
    const errors = {};
    if (!form.student) errors.student = 'Select a student';
    if (!form.room) errors.room = 'Select a room';
    if (!form.visitorName.trim()) errors.visitorName = 'Visitor name is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setForm(initialForm);
    setFormErrors({});
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        student: form.student,
        room: form.room,
        visitorName: form.visitorName.trim(),
        visitorPhone: form.visitorPhone.trim(),
        relation: form.relation.trim(),
        purpose: form.purpose.trim(),
        idProofType: form.idProofType.trim(),
        idProofNumber: form.idProofNumber.trim(),
        entryTime: form.entryTime ? new Date(form.entryTime).toISOString() : new Date().toISOString(),
        remarks: form.remarks.trim(),
      };

      await api.post('/hostel/visitor-logs', payload);
      toast.success('Visitor log created successfully');
      resetForm();
      setIsAddOpen(false);
      refetchLogs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create visitor log');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openApprove = (log) => {
    setSelectedLog(log);
    setIsApproveOpen(true);
  };

  const closeApprove = () => {
    setIsApproveOpen(false);
    setSelectedLog(null);
  };

  const handleApprove = async (approvalStatus) => {
    if (!selectedLog) return;

    setActionType('approve');
    setActionId(selectedLog.id);
    try {
      await api.put(`/hostel/visitor-logs/${selectedLog.id}/approve`, {
        approvalStatus,
      });
      toast.success(`Visitor ${approvalStatus === 'approved' ? 'approved' : 'rejected'}`);
      closeApprove();
      refetchLogs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update approval status');
    } finally {
      setActionId(null);
      setActionType(null);
    }
  };

  const handleCheckout = async (log) => {
    setActionType('checkout');
    setActionId(log.id);
    try {
      await api.put(`/hostel/visitor-logs/${log.id}/checkout`);
      toast.success('Visitor checked out successfully');
      refetchLogs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to check out visitor');
    } finally {
      setActionId(null);
      setActionType(null);
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
    { label: 'Total visits', value: stats.total, icon: Users, color: 'text-zinc-900' },
    { label: 'Pending approval', value: stats.pending, icon: Clock, color: 'text-amber-600' },
    { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'text-emerald-600' },
    { label: 'Checked in', value: stats.checkedIn, icon: DoorOpen, color: 'text-blue-600' },
  ];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Visitor Logs</h1>
          <p className="mt-1 text-sm text-zinc-500">Track, approve and manage hostel visitors</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus size={18} />
          Add visitor
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-2 gap-4 sm:grid-cols-4"
      >
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
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-3 lg:flex-row lg:items-end"
      >
        <div className="flex-1">
          <Input
            label="Search visitors"
            placeholder="Search by visitor name or phone"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            startIcon={<MagnifyingGlass size={18} />}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto">
          <Select
            label="Approval"
            value={filters.approvalStatus}
            onChange={(e) => handleFilterChange('approvalStatus', e.target.value)}
            options={APPROVAL_OPTIONS}
            startIcon={<Faders size={18} />}
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
      {logsError && (
        <motion.div
          variants={itemVariants}
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          role="alert"
        >
          <Warning size={18} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Failed to load visitor logs</p>
            <p className="mt-0.5 text-red-600">{logsError}</p>
          </div>
          <Button variant="outline" size="sm" onClick={refetchLogs}>
            Retry
          </Button>
        </motion.div>
      )}

      {/* Table */}
      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden">
          {logsLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <EmptyState
              title="No visitor logs"
              description={
                debouncedSearch || filters.status || filters.approvalStatus
                  ? 'Try adjusting your filters'
                  : 'Add a visitor entry to get started'
              }
              icon={Users}
              action={
                <Button onClick={() => setIsAddOpen(true)}>
                  <Plus size={18} />
                  Add visitor
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/50">
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Visitor</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Visiting</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Room</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Entry</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Exit</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Approval</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {logs.map((log) => {
                    const studentName = [log.student?.firstName, log.student?.lastName]
                      .filter(Boolean)
                      .join(' ');
                    const isActionLoading = actionId === log.id && actionType;

                    return (
                      <tr key={log.id} className="hover:bg-zinc-50/60">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
                              <User size={14} />
                            </div>
                            <div>
                              <p className="font-medium text-zinc-900">{log.visitorName}</p>
                              {log.relation && (
                                <p className="text-xs text-zinc-500">{log.relation}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-zinc-700">{studentName || '—'}</p>
                          {log.student?.admissionNo && (
                            <p className="text-xs text-zinc-500">{log.student.admissionNo}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-zinc-700">Room {log.room?.roomNo || '—'}</p>
                          {log.room?.hostel?.name && (
                            <p className="text-xs text-zinc-500">{log.room.hostel.name}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-zinc-600">{formatDate(log.entryTime)}</td>
                        <td className="px-4 py-3 text-zinc-600">
                          {log.exitTime ? formatDate(log.exitTime) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={APPROVAL_BADGE[log.approvalStatus] || 'neutral'}>
                            {log.approvalStatus}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={STATUS_BADGE[log.status] || 'neutral'}>
                            {log.status === 'checked_out' ? 'Checked out' : 'Checked in'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {log.approvalStatus === 'pending' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openApprove(log)}
                                disabled={isActionLoading}
                              >
                                <Check size={14} />
                                Approve
                              </Button>
                            )}
                            {log.status !== 'checked_out' && log.approvalStatus !== 'rejected' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCheckout(log)}
                                isLoading={actionType === 'checkout' && actionId === log.id}
                                disabled={isActionLoading}
                              >
                                <SignOut size={14} />
                                Check out
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Add Visitor Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => !isSubmitting && setIsAddOpen(false)}
        title="Add visitor"
        description="Record a new hostel visitor entry. Approval defaults to pending."
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Student"
              value={form.student}
              onChange={(e) => handleFormChange('student', e.target.value)}
              options={studentOptions}
              error={formErrors.student}
              required
              disabled={studentsLoading || isSubmitting}
              placeholder="Select a student"
            />
            <Select
              label="Room"
              value={form.room}
              onChange={(e) => handleFormChange('room', e.target.value)}
              options={roomOptions}
              error={formErrors.room}
              required
              disabled={roomsLoading || isSubmitting}
              placeholder="Select a room"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Visitor name"
              placeholder="e.g. Jane Doe"
              value={form.visitorName}
              onChange={(e) => handleFormChange('visitorName', e.target.value)}
              error={formErrors.visitorName}
              required
              disabled={isSubmitting}
            />
            <Input
              label="Phone number"
              placeholder="e.g. +254 712 345 678"
              value={form.visitorPhone}
              onChange={(e) => handleFormChange('visitorPhone', e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Relation to student"
              placeholder="e.g. Parent, Guardian"
              value={form.relation}
              onChange={(e) => handleFormChange('relation', e.target.value)}
              disabled={isSubmitting}
            />
            <Input
              label="Purpose"
              placeholder="e.g. Weekend visit"
              value={form.purpose}
              onChange={(e) => handleFormChange('purpose', e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="ID proof type"
              placeholder="e.g. National ID"
              value={form.idProofType}
              onChange={(e) => handleFormChange('idProofType', e.target.value)}
              disabled={isSubmitting}
            />
            <Input
              label="ID proof number"
              placeholder="e.g. 12345678"
              value={form.idProofNumber}
              onChange={(e) => handleFormChange('idProofNumber', e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <Input
            label="Entry time"
            type="datetime-local"
            value={form.entryTime}
            onChange={(e) => handleFormChange('entryTime', e.target.value)}
            disabled={isSubmitting}
          />

          <Input
            label="Remarks"
            placeholder="Any additional notes"
            value={form.remarks}
            onChange={(e) => handleFormChange('remarks', e.target.value)}
            disabled={isSubmitting}
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Create entry
            </Button>
          </div>
        </form>
      </Modal>

      {/* Approve/Reject Modal */}
      <Modal
        isOpen={isApproveOpen}
        onClose={closeApprove}
        title="Approve visitor"
        description={
          selectedLog
            ? `Review the visit request from ${selectedLog.visitorName}`
            : 'Review the visit request'
        }
        size="sm"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-sm">
            <p className="font-medium text-zinc-900">{selectedLog?.visitorName}</p>
            <p className="text-zinc-500">
              Visiting{' '}
              {[selectedLog?.student?.firstName, selectedLog?.student?.lastName]
                .filter(Boolean)
                .join(' ') || '—'}
            </p>
            <p className="text-zinc-500">Room {selectedLog?.room?.roomNo || '—'}</p>
          </div>

          <Input
            label="Remarks"
            placeholder="Optional remarks"
            value={selectedLog?.remarks || ''}
            onChange={(e) =>
              setSelectedLog((prev) => (prev ? { ...prev, remarks: e.target.value } : prev))
            }
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={closeApprove}
              disabled={actionType === 'approve'}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => handleApprove('rejected')}
              isLoading={actionType === 'approve' && actionId === selectedLog?.id}
              disabled={actionType === 'approve'}
            >
              <Prohibit size={16} />
              Reject
            </Button>
            <Button
              onClick={() => handleApprove('approved')}
              isLoading={actionType === 'approve' && actionId === selectedLog?.id}
              disabled={actionType === 'approve'}
            >
              <Check size={16} />
              Approve
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};

export default VisitorLog;
