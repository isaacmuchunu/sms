import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Desktop, DeviceMobile, Trash, Warning } from '@phosphor-icons/react';
import useFetch from '../../hooks/useFetch';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Skeleton from '../../components/ui/Skeleton';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const SessionIcon = ({ deviceInfo = '' }) => {
  const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(deviceInfo);
  return isMobile ? <DeviceMobile size={20} /> : <Desktop size={20} />;
};

const Sessions = () => {
  const { data, loading, error, refetch } = useFetch('/sessions/me');
  const [revokingId, setRevokingId] = useState(null);
  const [revokingOthers, setRevokingOthers] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const sessions = Array.isArray(data) ? data : data?.sessions || [];

  const handleRevoke = async (id) => {
    setRevokingId(id);
    try {
      await api.delete(`/sessions/${id}`);
      toast.success('Session revoked');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to revoke session');
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeOthers = async () => {
    setRevokingOthers(true);
    try {
      await api.delete('/sessions/others');
      toast.success('All other sessions revoked');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to revoke other sessions');
    } finally {
      setRevokingOthers(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5">
        <div className="flex items-start gap-3">
          <Warning size={20} className="mt-0.5 text-red-600" />
          <div>
            <p className="text-sm font-medium text-red-800">Failed to load sessions</p>
            <p className="text-xs text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      className="max-w-2xl space-y-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">Active sessions</h3>
          <p className="text-sm text-zinc-500">Manage devices where your account is signed in.</p>
        </div>
        {sessions.length > 1 && (
          <Button
            variant="outline"
            onClick={handleRevokeOthers}
            isLoading={revokingOthers}
            disabled={revokingOthers}
          >
            <Trash size={16} />
            Sign out all other devices
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {sessions.length === 0 ? (
          <Card>
            <div className="p-6 text-center text-sm text-zinc-500">
              No active sessions found.
            </div>
          </Card>
        ) : (
          sessions.map((session) => (
            <Card key={session._id}>
              <div className="flex items-start gap-4 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
                  <SessionIcon deviceInfo={session.deviceInfo} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-zinc-900">
                      {session.deviceInfo || 'Unknown device'}
                    </p>
                    {session.isCurrent && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">
                    IP: {session.ip || '-'} · Last active: {formatDate(session.lastActiveAt)}
                  </p>
                </div>
                {!session.isCurrent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevoke(session._id)}
                    isLoading={revokingId === session._id}
                    disabled={revokingId === session._id}
                    className="shrink-0"
                  >
                    <Trash size={16} />
                    Sign out
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default Sessions;
