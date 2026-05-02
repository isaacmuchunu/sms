import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { motion, useReducedMotion } from 'framer-motion';
import { formatDistanceToNow, isValid, format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  MagnifyingGlass,
  Faders,
  EnvelopeOpen,
  Envelope,
  Trash,
  CheckCircle,
  Bell,
  CaretLeft,
  CaretRight,
  Clock,
} from '@phosphor-icons/react';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import Modal from '../../components/ui/Modal';

const NOTIFICATION_TYPES = [
  { value: '', label: 'All types' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'fee', label: 'Fee' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'exam', label: 'Exam' },
  { value: 'general', label: 'General' },
  { value: 'alert', label: 'Alert' },
];

const READ_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'false', label: 'Unread' },
  { value: 'true', label: 'Read' },
];

const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Newest first' },
  { value: 'createdAt', label: 'Oldest first' },
];

const TYPE_VARIANT = {
  announcement: 'info',
  fee: 'warning',
  attendance: 'accent',
  exam: 'info',
  general: 'neutral',
  alert: 'danger',
};

const LIMIT = 10;

const formatTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (!isValid(date)) return '—';
  return formatDistanceToNow(date, { addSuffix: true });
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (!isValid(date)) return '—';
  return format(date, 'dd MMM yyyy, h:mm a');
};

const NotificationList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const shouldReduceMotion = useReducedMotion();

  const typeFilter = searchParams.get('type') || '';
  const readFilter = searchParams.get('isRead') || '';
  const searchQuery = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || '-createdAt';
  const page = Math.max(1, parseInt(searchParams.get('page'), 10) || 1);

  const [search, setSearch] = useState(searchQuery);
  const [notifications, setNotifications] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: LIMIT, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: LIMIT,
        sort,
      };
      if (typeFilter) params.type = typeFilter;
      if (readFilter) params.isRead = readFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const response = await api.get('/notifications', { params });
      const payload = response.data?.data || {};
      setNotifications(Array.isArray(payload.items) ? payload.items : []);
      setMeta(payload.meta || { page: 1, limit: LIMIT, total: 0, totalPages: 0 });
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to fetch notifications';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [page, sort, typeFilter, readFilter, searchQuery]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (search !== searchQuery) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set('page', '1');
          if (search.trim()) next.set('search', search.trim());
          else next.delete('search');
          return next;
        });
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, searchQuery, setSearchParams]);

  const updateFilter = (key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', '1');
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  };

  const goToPage = (newPage) => {
    if (newPage < 1 || newPage > meta.totalPages) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(newPage));
      return next;
    });
  };

  const handleMarkAsRead = async (id) => {
    setActionLoading(id);
    try {
      await api.put(`/notifications/${id}/read`);
      toast.success('Marked as read');
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to mark as read';
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    setActionLoading('all');
    try {
      const response = await api.put('/notifications/read-all');
      toast.success(response.data?.message || 'All notifications marked as read');
      fetchNotifications();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to mark all as read';
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await api.delete(`/notifications/${deletingId}`);
      toast.success('Notification deleted');
      setDeletingId(null);
      fetchNotifications();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to delete notification';
      toast.error(message);
    }
  };

  const hasUnread = notifications.some((n) => !n.isRead);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: shouldReduceMotion ? 0 : 0.04 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 6 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: shouldReduceMotion ? 0 : 0.2, ease: [0.23, 1, 0.32, 1] },
    },
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, meta.page - Math.floor(maxVisible / 2));
    let end = Math.min(meta.totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i += 1) pages.push(i);
    return pages;
  };

  const startItem = (meta.page - 1) * meta.limit + 1;
  const endItem = Math.min(meta.page * meta.limit, meta.total);

  return (
    <>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Notifications</h1>
            <p className="mt-1 text-sm text-zinc-500">View and manage your notifications</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleMarkAllAsRead}
              disabled={!hasUnread || actionLoading === 'all'}
              isLoading={actionLoading === 'all'}
            >
              <CheckCircle size={18} />
              Mark all as read
            </Button>
            <Button onClick={() => navigate('/announcements')}>
              <Bell size={18} />
              Announcements
            </Button>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.3, delay: shouldReduceMotion ? 0 : 0.05, ease: [0.23, 1, 0.32, 1] }}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <Input
            startIcon={<MagnifyingGlass size={18} className="text-zinc-400" />}
            placeholder="Search notifications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            startIcon={<Faders size={18} className="text-zinc-400" />}
            value={typeFilter}
            onChange={(e) => updateFilter('type', e.target.value)}
            options={NOTIFICATION_TYPES}
          />
          <Select
            value={readFilter}
            onChange={(e) => updateFilter('isRead', e.target.value)}
            options={READ_OPTIONS}
          />
          <Select
            value={sort}
            onChange={(e) => updateFilter('sort', e.target.value)}
            options={SORT_OPTIONS}
          />
        </motion.div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-8 w-24 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="rounded-xl border border-zinc-200 bg-white shadow-card"
          >
            <EmptyState
              icon={Bell}
              title="No notifications"
              description={
                searchQuery || typeFilter || readFilter
                  ? 'Try adjusting your search or filters.'
                  : 'You have no notifications at the moment.'
              }
            />
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {notifications.map((notification) => (
              <motion.article
                key={notification.id}
                variants={itemVariants}
                className={clsx(
                  'group rounded-xl border bg-white p-4 shadow-card transition-shadow duration-160 ease-out-strong hover:shadow-card-hover',
                  notification.isRead ? 'border-zinc-200' : 'border-accent-200 bg-accent-50/30'
                )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-zinc-900">{notification.title}</h3>
                      <Badge variant={TYPE_VARIANT[notification.type] || 'neutral'}>
                        {notification.type
                          ? notification.type.charAt(0).toUpperCase() + notification.type.slice(1)
                          : 'General'}
                      </Badge>
                      {!notification.isRead && (
                        <span className="inline-flex h-2 w-2 rounded-full bg-accent-500" aria-hidden="true" />
                      )}
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">
                      {notification.message}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                      <span className="inline-flex items-center gap-1.5" title={formatDateTime(notification.createdAt)}>
                        <Clock size={13} />
                        {formatTime(notification.createdAt)}
                      </span>
                      {notification.sender?.name && (
                        <span>By {notification.sender.name}</span>
                      )}
                      <span className={notification.isRead ? 'text-zinc-400' : 'font-medium text-accent-700'}>
                        {notification.isRead ? 'Read' : 'Unread'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMarkAsRead(notification.id)}
                        disabled={actionLoading === notification.id}
                        isLoading={actionLoading === notification.id}
                        aria-label="Mark as read"
                        title="Mark as read"
                      >
                        <EnvelopeOpen size={18} />
                      </Button>
                    )}
                    {notification.isRead && (
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled
                        aria-label="Already read"
                        title="Already read"
                      >
                        <Envelope size={18} className="text-zinc-400" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingId(notification.id)}
                      aria-label="Delete notification"
                      title="Delete notification"
                    >
                      <Trash size={18} />
                    </Button>
                  </div>
                </div>
              </motion.article>
            ))}
          </motion.div>
        )}

        {/* Pagination */}
        {!loading && notifications.length > 0 && meta.totalPages > 1 && (
          <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-card sm:flex-row">
            <p className="text-sm text-zinc-500">
              Showing <span className="font-medium text-zinc-900">{startItem}</span> to{' '}
              <span className="font-medium text-zinc-900">{endItem}</span> of{' '}
              <span className="font-medium text-zinc-900">{meta.total}</span> results
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(meta.page - 1)}
                disabled={meta.page <= 1}
                className={clsx(
                  'rounded-lg p-1.5 text-zinc-500 transition-colors',
                  meta.page <= 1 ? 'cursor-not-allowed opacity-40' : 'hover:bg-zinc-100 hover:text-zinc-700'
                )}
                aria-label="Previous page"
              >
                <CaretLeft size={18} />
              </button>
              {getPageNumbers().map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  className={clsx(
                    'h-8 min-w-[2rem] rounded-lg px-2 text-sm font-medium transition-colors',
                    pageNum === meta.page
                      ? 'bg-accent-600 text-white'
                      : 'text-zinc-600 hover:bg-zinc-100'
                  )}
                >
                  {pageNum}
                </button>
              ))}
              <button
                onClick={() => goToPage(meta.page + 1)}
                disabled={meta.page >= meta.totalPages}
                className={clsx(
                  'rounded-lg p-1.5 text-zinc-500 transition-colors',
                  meta.page >= meta.totalPages
                    ? 'cursor-not-allowed opacity-40'
                    : 'hover:bg-zinc-100 hover:text-zinc-700'
                )}
                aria-label="Next page"
              >
                <CaretRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        title="Delete Notification"
        description="Are you sure you want to delete this notification? This action cannot be undone."
        size="sm"
      >
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => setDeletingId(null)}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={handleDelete}>
            <Trash size={16} />
            Delete
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default NotificationList;
