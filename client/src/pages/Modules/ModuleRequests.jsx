import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import clsx from 'clsx';
import {
  Bus,
  House,
  Books,
  CheckCircle,
  XCircle,
  Clock,
  PaperPlaneRight,
  SpinnerGap,
} from '@phosphor-icons/react';
import { useAuth } from '../../context/AuthContext';
import useFetch from '../../hooks/useFetch';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import EmptyState from '../../components/ui/EmptyState';
import toast from 'react-hot-toast';

const MODULE_META = {
  transport: {
    label: 'Transport',
    description: 'Manage buses, routes, stops and student transport allocations.',
    icon: Bus,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  hostel: {
    label: 'Hostel',
    description: 'Manage hostels, rooms, beds and boarding allocations.',
    icon: House,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  library: {
    label: 'Library',
    description: 'Manage books, issues, reservations and fines.',
    icon: Books,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
};

const STATUS_VARIANTS = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

const STATUS_ICONS = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
};

const ModuleRequests = () => {
  const { user, refreshUser } = useAuth();
  const schoolId = user?.schoolId;

  const [requestModal, setRequestModal] = useState({ open: false, module: null });
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      refreshUser();
    }
  }, [user?.role, refreshUser]);

  const {
    data: requestsResponse,
    loading: requestsLoading,
    error: requestsError,
    refetch: refetchRequests,
  } = useFetch(`/schools/${schoolId}/module-requests?limit=100`, { immediate: !!schoolId });

  const requests = useMemo(() => {
    if (!requestsResponse) return [];
    return Array.isArray(requestsResponse) ? requestsResponse : requestsResponse.items || [];
  }, [requestsResponse]);

  const modules = useMemo(() => {
    return user?.modules || { transport: false, hostel: false, library: true };
  }, [user?.modules]);

  const pendingByModule = useMemo(() => {
    const map = {};
    requests.forEach((r) => {
      if (r.status === 'pending') {
        map[r.module] = r;
      }
    });
    return map;
  }, [requests]);

  const openRequestModal = (module) => {
    setNotes('');
    setRequestModal({ open: true, module });
  };

  const closeRequestModal = () => {
    setRequestModal({ open: false, module: null });
    setNotes('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!schoolId || !requestModal.module) return;
    setSubmitting(true);
    try {
      await api.post(`/schools/${schoolId}/module-requests`, {
        module: requestModal.module,
        notes: notes.trim(),
      });
      toast.success('Module activation request submitted');
      closeRequestModal();
      refetchRequests();
      refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (!schoolId) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Module Requests</h1>
        <EmptyState
          title="No school associated"
          description="Your account is not linked to a school."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Module Requests</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Request activation of optional modules for your school.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Object.entries(MODULE_META).map(([key, meta]) => {
          const Icon = meta.icon;
          const enabled = modules[key] === true;
          const pending = pendingByModule[key];
          return (
            <Card key={key} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col">
                <div className="flex items-start justify-between">
                  <div className={clsx('flex h-10 w-10 items-center justify-center rounded-lg', meta.bg)}>
                    <Icon size={20} className={meta.color} />
                  </div>
                  <Badge variant={enabled ? 'success' : pending ? 'warning' : 'neutral'}>
                    {enabled ? 'Active' : pending ? 'Pending' : 'Disabled'}
                  </Badge>
                </div>
                <h3 className="mt-4 text-base font-semibold text-zinc-900">{meta.label}</h3>
                <p className="mt-1 text-sm text-zinc-500">{meta.description}</p>
                <div className="mt-auto pt-4">
                  {enabled ? (
                    <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                      <CheckCircle size={16} />
                      Already active
                    </p>
                  ) : pending ? (
                    <p className="flex items-center gap-1.5 text-sm font-medium text-amber-700">
                      <Clock size={16} />
                      Awaiting approval
                    </p>
                  ) : (
                    <Button size="sm" onClick={() => openRequestModal(key)}>
                      <PaperPlaneRight size={16} />
                      Request activation
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request history</CardTitle>
        </CardHeader>
        <CardContent>
          {requestsLoading ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="h-12 rounded-lg bg-zinc-100" />
              ))}
            </div>
          ) : requestsError ? (
            <div className="rounded-lg border border-danger-200 bg-danger-50 p-4 text-center text-sm text-danger-700">
              {requestsError}
            </div>
          ) : requests.length === 0 ? (
            <EmptyState
              title="No requests yet"
              description="Submit a request to activate transport, hostel or library modules."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100">
                    <th className="py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Module</th>
                    <th className="py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Status</th>
                    <th className="py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Notes</th>
                    <th className="py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Requested</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {requests.map((request) => {
                    const StatusIcon = STATUS_ICONS[request.status];
                    const meta = MODULE_META[request.module];
                    return (
                      <tr key={request.id}>
                        <td className="py-3 font-medium text-zinc-900">{meta?.label || request.module}</td>
                        <td className="py-3">
                          <Badge variant={STATUS_VARIANTS[request.status] || 'neutral'}>
                            <span className="flex items-center gap-1">
                              <StatusIcon size={12} />
                              {request.status}
                            </span>
                          </Badge>
                        </td>
                        <td className="max-w-xs truncate py-3 text-zinc-600">
                          {request.notes || '-'}
                        </td>
                        <td className="py-3 text-zinc-500">
                          {request.createdAt ? format(new Date(request.createdAt), 'dd MMM yyyy') : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={requestModal.open}
        onClose={closeRequestModal}
        title={`Request ${MODULE_META[requestModal.module]?.label || 'module'} activation`}
        description="Add an optional note for the super admin."
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Note (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. We are starting a school transport service this term."
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={closeRequestModal}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              <PaperPlaneRight size={16} />
              Submit request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ModuleRequests;
