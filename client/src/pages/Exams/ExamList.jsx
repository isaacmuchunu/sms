import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { motion, useReducedMotion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Plus,
  MagnifyingGlass,
  Eye,
  PencilSimple,
  Trash,
  PaperPlaneTilt,
} from '@phosphor-icons/react';
import useFetch from '../../hooks/useFetch';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

const EXAM_TYPES = [
  { value: 'unit_test', label: 'Unit Test' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half_yearly', label: 'Half Yearly' },
  { value: 'final', label: 'Final' },
  { value: 'entrance', label: 'Entrance' },
  { value: 'other', label: 'Other' },
];

const EXAM_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const typeBadgeVariant = (type) => {
  switch (type) {
    case 'unit_test':
    case 'quarterly':
      return 'info';
    case 'half_yearly':
      return 'warning';
    case 'final':
      return 'accent';
    case 'entrance':
      return 'neutral';
    default:
      return 'neutral';
  }
};

const statusBadgeVariant = (status, isPublished) => {
  if (isPublished) return 'success';
  switch (status) {
    case 'draft':
      return 'neutral';
    case 'scheduled':
      return 'info';
    case 'ongoing':
      return 'warning';
    case 'completed':
      return 'success';
    case 'cancelled':
      return 'danger';
    default:
      return 'neutral';
  }
};

const formatDate = (date) => {
  if (!date) return '-';
  try {
    return format(new Date(date), 'dd MMM yyyy');
  } catch {
    return '-';
  }
};

const emptyForm = {
  name: '',
  examType: 'unit_test',
  academicYear: '',
  startDate: '',
  endDate: '',
  description: '',
};

const ExamList = () => {
  const {
    data: exams,
    loading: examsLoading,
    error: examsError,
    refetch,
  } = useFetch('/exams');
  const { data: academicYears, loading: ayLoading } = useFetch('/academic-years');

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formLoading, setFormLoading] = useState(false);

  const [publishExam, setPublishExam] = useState(null);
  const [publishLoading, setPublishLoading] = useState(false);

  const [deleteExam, setDeleteExam] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const shouldReduceMotion = useReducedMotion();

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
      transition: { duration: shouldReduceMotion ? 0 : 0.25, ease: [0.23, 1, 0.32, 1] },
    },
  };

  const filteredExams = useMemo(() => {
    if (!Array.isArray(exams)) return [];
    return exams.filter((exam) => {
      const matchesSearch =
        !searchTerm ||
        exam.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = !typeFilter || exam.examType === typeFilter;
      const matchesStatus = !statusFilter || exam.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [exams, searchTerm, typeFilter, statusFilter]);

  const academicYearOptions = useMemo(() => {
    if (!Array.isArray(academicYears)) return [];
    return academicYears.map((ay) => ({ value: ay._id, label: ay.name }));
  }, [academicYears]);

  const openCreate = () => {
    setEditingExam(null);
    setForm({
      ...emptyForm,
      academicYear: academicYears?.find((ay) => ay.isCurrent)?._id || '',
    });
    setFormModalOpen(true);
  };

  const openEdit = (exam) => {
    setEditingExam(exam);
    setForm({
      name: exam.name || '',
      examType: exam.examType || 'unit_test',
      academicYear: exam.academicYear?._id || exam.academicYear || '',
      startDate: exam.startDate ? new Date(exam.startDate).toISOString().split('T')[0] : '',
      endDate: exam.endDate ? new Date(exam.endDate).toISOString().split('T')[0] : '',
      description: exam.description || '',
    });
    setFormModalOpen(true);
  };

  const closeForm = () => {
    setFormModalOpen(false);
    setEditingExam(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate)) {
      toast.error('End date must be on or after start date');
      return;
    }

    setFormLoading(true);
    try {
      if (editingExam) {
        await api.put(`/exams/${editingExam._id}`, form);
        toast.success('Exam updated successfully');
      } else {
        await api.post('/exams', form);
        toast.success('Exam created successfully');
      }
      closeForm();
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save exam');
    } finally {
      setFormLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!publishExam) return;
    setPublishLoading(true);
    try {
      await api.post(`/exams/${publishExam._id}/publish`);
      toast.success('Exam results published successfully');
      setPublishExam(null);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to publish exam');
    } finally {
      setPublishLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteExam) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/exams/${deleteExam._id}`);
      toast.success('Exam deleted successfully');
      setDeleteExam(null);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete exam');
    } finally {
      setDeleteLoading(false);
    }
  };

  const isLoading = examsLoading || ayLoading;

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
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Exams</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage exam schedules and results</p>
        </div>
        <Button onClick={openCreate} className="self-start">
          <Plus size={18} weight="bold" />
          Create Exam
        </Button>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-card">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="relative">
            <MagnifyingGlass
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              type="text"
              placeholder="Search exams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-10 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors hover:border-zinc-300 focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/20"
            />
          </div>
          <Select
            label=""
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            placeholder="All types"
            options={EXAM_TYPES}
          />
          <Select
            label=""
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            placeholder="All statuses"
            options={EXAM_STATUSES}
          />
        </div>
      </motion.div>

      {/* Table */}
      <motion.div variants={itemVariants} className="rounded-xl border border-zinc-200 bg-white shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/60">
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Name
                </th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Type
                </th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Academic Year
                </th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Start Date
                </th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  End Date
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
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="px-5 py-3">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="px-5 py-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-5 py-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-5 py-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-5 py-3">
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </td>
                    <td className="px-5 py-3">
                      <Skeleton className="ml-auto h-4 w-20" />
                    </td>
                  </tr>
                ))
              ) : examsError ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12">
                    <div className="rounded-lg border border-danger-200 bg-danger-50 p-4 text-center text-sm text-danger-700">
                      <p className="font-medium">Failed to load exams</p>
                      <p className="mt-1 text-danger-600">{examsError}</p>
                      <Button variant="outline" size="sm" onClick={refetch} className="mt-3">
                        Try again
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : filteredExams.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12">
                    <EmptyState
                      title="No exams found"
                      description={
                        searchTerm || typeFilter || statusFilter
                          ? 'Try adjusting your filters'
                          : 'Create an exam to get started'
                      }
                      icon={Eye}
                      action={
                        !searchTerm && !typeFilter && !statusFilter ? (
                          <Button size="sm" onClick={openCreate}>
                            Create Exam
                          </Button>
                        ) : undefined
                      }
                    />
                  </td>
                </tr>
              ) : (
                filteredExams.map((exam) => (
                  <tr
                    key={exam._id}
                    className="transition-colors hover:bg-zinc-50/60"
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-zinc-900">{exam.name}</div>
                      {exam.description && (
                        <div className="mt-0.5 line-clamp-1 text-xs text-zinc-500">
                          {exam.description}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={typeBadgeVariant(exam.examType)}>
                        {EXAM_TYPES.find((t) => t.value === exam.examType)?.label || exam.examType}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-700">
                      {exam.academicYear?.name || '-'}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-700">
                      {formatDate(exam.startDate)}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-700">
                      {formatDate(exam.endDate)}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={statusBadgeVariant(exam.status, exam.isResultPublished)}>
                        {exam.isResultPublished ? 'Published' : EXAM_STATUSES.find((s) => s.value === exam.status)?.label || exam.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(exam)}
                          className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                          aria-label="Edit exam"
                          title="Edit"
                        >
                          <PencilSimple size={16} />
                        </button>
                        {!exam.isResultPublished && exam.status !== 'cancelled' && (
                          <button
                            onClick={() => setPublishExam(exam)}
                            className="rounded-lg p-1.5 text-accent-600 transition-colors hover:bg-accent-50"
                            aria-label="Publish exam results"
                            title="Publish"
                          >
                            <PaperPlaneTilt size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteExam(exam)}
                          className="rounded-lg p-1.5 text-danger-600 transition-colors hover:bg-danger-50"
                          aria-label="Delete exam"
                          title="Delete"
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={formModalOpen}
        onClose={closeForm}
        title={editingExam ? 'Edit Exam' : 'Create Exam'}
        description="Enter the exam details below."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Exam Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Unit Test 1"
            required
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Exam Type"
              value={form.examType}
              onChange={(e) => setForm({ ...form, examType: e.target.value })}
              options={EXAM_TYPES}
              required
            />
            <Select
              label="Academic Year"
              value={form.academicYear}
              onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
              options={academicYearOptions}
              placeholder="Select academic year"
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Start Date"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              required
            />
          </div>
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Optional description"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={closeForm}>
              Cancel
            </Button>
            <Button type="submit" isLoading={formLoading}>
              {editingExam ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Publish Modal */}
      <Modal
        isOpen={!!publishExam}
        onClose={() => setPublishExam(null)}
        title="Publish Results"
        description={`This will publish the results for ${publishExam?.name || 'this exam'} to students and parents.`}
        size="sm"
      >
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setPublishExam(null)}>
            Cancel
          </Button>
          <Button onClick={handlePublish} isLoading={publishLoading}>
            Publish
          </Button>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={!!deleteExam}
        onClose={() => setDeleteExam(null)}
        title="Delete Exam"
        description={`Are you sure you want to delete ${deleteExam?.name || 'this exam'}? This action cannot be undone.`}
        size="sm"
      >
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteExam(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} isLoading={deleteLoading}>
            Delete
          </Button>
        </div>
      </Modal>
    </motion.div>
  );
};

export default ExamList;
