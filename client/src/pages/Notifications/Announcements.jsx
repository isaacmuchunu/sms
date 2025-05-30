import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Plus,
  MagnifyingGlass,
  Faders,
  CalendarBlank,
  Users,
  Pen,
  Trash,
  Eye,
  EyeSlash,
  Megaphone,
} from '@phosphor-icons/react';
import api from '../../services/api';
import useFetch from '../../hooks/useFetch';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

const CATEGORY_OPTIONS = [
  { value: '', label: 'All categories' },
  { value: 'general', label: 'General' },
  { value: 'academic', label: 'Academic' },
  { value: 'exam', label: 'Exam' },
  { value: 'fee', label: 'Fee' },
  { value: 'event', label: 'Event' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'urgent', label: 'Urgent' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'students', label: 'Students' },
  { value: 'teachers', label: 'Teachers' },
  { value: 'parents', label: 'Parents' },
  { value: 'staff', label: 'Staff' },
];

const CATEGORY_VARIANT = {
  general: 'neutral',
  academic: 'info',
  exam: 'warning',
  fee: 'warning',
  event: 'accent',
  holiday: 'info',
  urgent: 'danger',
};

const PRIORITY_VARIANT = {
  low: 'neutral',
  normal: 'info',
  high: 'warning',
  urgent: 'danger',
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

const initialForm = {
  title: '',
  content: '',
  category: 'general',
  priority: 'normal',
  targetAudience: 'all',
  publishDate: '',
  expiryDate: '',
  isPublished: true,
  sendEmail: false,
  sendSMS: false,
};

const Announcements = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryFilter = searchParams.get('category') || '';
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const shouldReduceMotion = useReducedMotion();

  const params = useMemo(
    () => ({
      search: search || undefined,
      category: categoryFilter || undefined,
      sort: '-publishDate',
    }),
    [search, categoryFilter]
  );

  const {
    data: announcements,
    loading,
    error,
    refetch,
  } = useFetch('/announcements', { params, immediate: true });

  const list = Array.isArray(announcements) ? announcements : [];

  useEffect(() => {
    if (!error) return;
    toast.error(error);
  }, [error]);

  const openCreate = () => {
    setEditingId(null);
    setForm(initialForm);
    setShowForm(true);
  };

  const openEdit = (announcement) => {
    setEditingId(announcement._id);
    setForm({
      title: announcement.title || '',
      content: announcement.content || '',
      category: announcement.category || 'general',
      priority: announcement.priority || 'normal',
      targetAudience: announcement.targetAudience || 'all',
      publishDate: announcement.publishDate
        ? new Date(announcement.publishDate).toISOString().slice(0, 16)
        : '',
      expiryDate: announcement.expiryDate
        ? new Date(announcement.expiryDate).toISOString().slice(0, 16)
        : '',
      isPublished: announcement.isPublished ?? true,
      sendEmail: false,
      sendSMS: false,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(initialForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      category: form.category,
      priority: form.priority,
      targetAudience: form.targetAudience,
      publishDate: form.publishDate ? new Date(form.publishDate).toISOString() : new Date().toISOString(),
      expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : null,
      isPublished: form.isPublished,
      sendEmail: form.sendEmail,
      sendSMS: form.sendSMS,
    };

    try {
      let response;
      if (editingId) {
        response = await api.put(`/announcements/${editingId}`, payload);
        toast.success('Announcement updated successfully');
      } else {
        response = await api.post('/announcements', payload);
        toast.success('Announcement created successfully');
      }

      const distribution = response?.data?.data?.distribution;
      if (distribution) {
        const email = distribution.email || {};
        const sms = distribution.sms || {};
        if (email.sent || sms.sent) {
          toast.success(`Sent ${email.sent || 0} email(s) and ${sms.sent || 0} SMS message(s)`);
        }
        if (email.errors || sms.errors) {
          toast.error(`Failed to send ${email.errors || 0} email(s) and ${sms.errors || 0} SMS message(s). Check server logs.`);
        }
      }

      closeForm();
      refetch();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to save announcement';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await api.delete(`/announcements/${deletingId}`);
      toast.success('Announcement deleted successfully');
      refetch();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to delete announcement';
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleTogglePublish = async (id) => {
    setTogglingId(id);
    try {
      await api.patch(`/announcements/${id}/publish`);
      toast.success('Announcement status updated');
      refetch();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update status';
      toast.error(message);
    } finally {
      setTogglingId(null);
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
      transition: { duration: shouldReduceMotion ? 0 : 0.25, ease: [0.23, 1, 0.32, 1] },
    },
  };

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
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Announcements</h1>
            <p className="mt-1 text-sm text-zinc-500">Create and manage school-wide announcements</p>
          </div>
          <Button onClick={openCreate} className="self-start sm:self-auto">
            <Plus size={18} weight="bold" />
            Create Announcement
          </Button>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.3, delay: shouldReduceMotion ? 0 : 0.05, ease: [0.23, 1, 0.32, 1] }}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          <div className="relative">
            <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input
              type="text"
              placeholder="Search announcements..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-10 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors duration-160 ease-out-strong focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/20"
            />
          </div>
          <div className="relative">
            <Faders className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <select
              value={categoryFilter}
              onChange={(e) => {
                const value = e.target.value;
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  if (value) next.set('category', value);
                  else next.delete('category');
                  return next;
                });
              }}
              className="h-10 w-full appearance-none rounded-lg border border-zinc-200 bg-white pl-10 pr-3 text-sm text-zinc-900 transition-colors duration-160 ease-out-strong focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/20"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* Content */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="mt-3 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-2/3" />
                <div className="mt-4 flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : list.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="rounded-xl border border-zinc-200 bg-white shadow-card"
          >
            <EmptyState
              icon={Megaphone}
              title="No announcements yet"
              description={
                search || categoryFilter
                  ? 'Try adjusting your search or filters.'
                  : 'Create your first announcement to share updates with students, teachers, and parents.'
              }
              action={
                !search && !categoryFilter ? (
                  <Button onClick={openCreate}>
                    <Plus size={18} weight="bold" />
                    Create Announcement
                  </Button>
                ) : null
              }
            />
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            {list.map((announcement) => (
              <motion.article
                key={announcement._id}
                variants={itemVariants}
                className="group flex flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-card transition-shadow duration-160 ease-out-strong hover:shadow-card-hover"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="line-clamp-1 text-base font-semibold text-zinc-900">{announcement.title}</h3>
                  <div className="flex shrink-0 gap-1.5">
                    <Badge variant={CATEGORY_VARIANT[announcement.category] || 'neutral'}>
                      {announcement.category ? announcement.category.charAt(0).toUpperCase() + announcement.category.slice(1) : 'General'}
                    </Badge>
                    <Badge variant={PRIORITY_VARIANT[announcement.priority] || 'neutral'}>
                      {announcement.priority ? announcement.priority.charAt(0).toUpperCase() + announcement.priority.slice(1) : 'Normal'}
                    </Badge>
                  </div>
                </div>

                <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-zinc-600">
                  {announcement.content}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarBlank size={14} />
                    {formatDate(announcement.publishDate)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users size={14} />
                    {AUDIENCE_OPTIONS.find((o) => o.value === announcement.targetAudience)?.label || announcement.targetAudience || 'All'}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    {announcement.isPublished ? (
                      <>
                        <Eye size={14} className="text-emerald-600" />
                        <span className="text-emerald-700">Published</span>
                      </>
                    ) : (
                      <>
                        <EyeSlash size={14} className="text-zinc-400" />
                        <span>Draft</span>
                      </>
                    )}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-4">
                  <span className="text-xs text-zinc-500">
                    By {announcement.postedBy?.name || 'Unknown'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(announcement)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                      aria-label="Edit announcement"
                    >
                      <Pen size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTogglePublish(announcement._id)}
                      disabled={togglingId === announcement._id}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50"
                      aria-label={announcement.isPublished ? 'Unpublish announcement' : 'Publish announcement'}
                    >
                      {announcement.isPublished ? <EyeSlash size={16} /> : <Eye size={16} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(announcement._id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600"
                      aria-label="Delete announcement"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                </div>
              </motion.article>
            ))}
          </motion.div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={showForm}
        onClose={closeForm}
        title={editingId ? 'Edit Announcement' : 'Create Announcement'}
        description={editingId ? 'Update the announcement details below.' : 'Fill in the details to share with the school.'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Title"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Enter announcement title"
            required
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="content" className="text-sm font-medium text-zinc-700">
              Message
            </label>
            <textarea
              id="content"
              value={form.content}
              onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
              rows={4}
              className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors duration-160 ease-out-strong focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/20"
              placeholder="Enter announcement message..."
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Category"
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              options={CATEGORY_OPTIONS.filter((o) => o.value !== '')}
            />
            <Select
              label="Priority"
              value={form.priority}
              onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
              options={PRIORITY_OPTIONS}
            />
          </div>

          <Select
            label="Target Audience"
            value={form.targetAudience}
            onChange={(e) => setForm((prev) => ({ ...prev, targetAudience: e.target.value }))}
            options={AUDIENCE_OPTIONS}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="publishDate" className="text-sm font-medium text-zinc-700">
                Publish Date
              </label>
              <input
                id="publishDate"
                type="datetime-local"
                value={form.publishDate}
                onChange={(e) => setForm((prev) => ({ ...prev, publishDate: e.target.value }))}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 transition-colors duration-160 ease-out-strong focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/20"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="expiryDate" className="text-sm font-medium text-zinc-700">
                Expiry Date
              </label>
              <input
                id="expiryDate"
                type="datetime-local"
                value={form.expiryDate}
                onChange={(e) => setForm((prev) => ({ ...prev, expiryDate: e.target.value }))}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 transition-colors duration-160 ease-out-strong focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, isPublished: !prev.isPublished }))}
              className={`flex h-5 w-9 items-center rounded-full transition-colors duration-160 ${form.isPublished ? 'bg-accent-600' : 'bg-zinc-300'}`}
              aria-pressed={form.isPublished}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-160 ${form.isPublished ? 'translate-x-4' : 'translate-x-0.5'}`}
              />
            </button>
            <span className="text-sm font-medium text-zinc-700">
              {form.isPublished ? 'Publish immediately' : 'Save as draft'}
            </span>
          </div>

          {form.isPublished && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-sm font-medium text-zinc-700">Notify audience</p>
              <p className="text-xs text-zinc-500">Requires email/SMS credentials in server settings.</p>
              <div className="mt-3 flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={form.sendEmail}
                    onChange={(e) => setForm((prev) => ({ ...prev, sendEmail: e.target.checked }))}
                    className="h-4 w-4 rounded border-zinc-300 text-accent-600 focus:ring-accent-600"
                  />
                  Send email
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={form.sendSMS}
                    onChange={(e) => setForm((prev) => ({ ...prev, sendSMS: e.target.checked }))}
                    className="h-4 w-4 rounded border-zinc-300 text-accent-600 focus:ring-accent-600"
                  />
                  Send SMS
                </label>
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={closeForm}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !form.title.trim() || !form.content.trim()} isLoading={submitting}>
              {editingId ? 'Update Announcement' : 'Create Announcement'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        title="Delete Announcement"
        description="Are you sure you want to delete this announcement? This action cannot be undone."
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

export default Announcements;
