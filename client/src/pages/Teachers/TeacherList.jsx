import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Plus,
  MagnifyingGlass,
  Eye,
  Pencil,
  Trash,
  ChalkboardTeacher,
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import useFetch from '../../hooks/useFetch';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'resigned', label: 'Resigned' },
];

const STATUS_VARIANTS = {
  active: 'success',
  inactive: 'danger',
  resigned: 'warning',
};

const STATUS_LABELS = {
  active: 'Active',
  inactive: 'Inactive',
  resigned: 'Resigned',
};

const formatName = (teacher) => {
  if (teacher.user?.name) return teacher.user.name;
  return [teacher.firstName, teacher.lastName].filter(Boolean).join(' ') || 'Unnamed';
};

const formatSubjects = (subjects) => {
  if (!Array.isArray(subjects) || subjects.length === 0) return '—';
  const names = subjects.map((s) => (typeof s === 'object' ? s.name : s)).filter(Boolean);
  const visible = names.slice(0, 2);
  const extra = names.length - visible.length;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((name, i) => (
        <span key={i} className="inline-flex rounded-md bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-700">
          {name}
        </span>
      ))}
      {extra > 0 && <span className="text-xs text-zinc-400">+{extra}</span>}
    </div>
  );
};

const TeacherList = () => {
  const { data: teachers = [], loading, error, refetch } = useFetch('/teachers');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const departments = useMemo(() => {
    const list = (teachers || []).map((t) => t.department).filter(Boolean);
    return [...new Set(list)].sort();
  }, [teachers]);

  const filteredTeachers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return (teachers || []).filter((t) => {
      const name = formatName(t).toLowerCase();
      const matchesSearch =
        !term || name.includes(term) || t.employeeId?.toLowerCase().includes(term);
      const matchesDept = !filterDept || t.department === filterDept;
      const matchesStatus = !filterStatus || t.status === filterStatus;
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [teachers, searchTerm, filterDept, filterStatus]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/teachers/${deleteId}`);
      toast.success('Teacher deactivated successfully');
      setDeleteId(null);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deactivate teacher');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Teachers</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage teaching staff and their assignments</p>
        </div>
        <Button as={Link} to="/teachers/new">
          <Plus size={18} weight="bold" />
          Add teacher
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
          {error}
        </div>
      )}

      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1], delay: 0.05 }}
        className="rounded-xl border border-zinc-200 bg-white p-4 shadow-card"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1">
            <Input
              placeholder="Search by name or employee ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              startIcon={<MagnifyingGlass size={18} />}
              aria-label="Search teachers"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 md:w-[28rem]">
            <Select
              label="Department"
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              options={departments.map((d) => ({ value: d, label: d }))}
              placeholder="All departments"
            />
            <Select
              label="Status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              options={STATUS_OPTIONS}
              placeholder="All statuses"
            />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1], delay: 0.1 }}
        className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-card"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/60">
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Employee ID
                </th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Name
                </th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Department
                </th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Designation
                </th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Subjects
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
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx}>
                    <td className="px-5 py-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-5 py-3">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="px-5 py-3">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="px-5 py-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-5 py-3">
                      <Skeleton className="h-4 w-36" />
                    </td>
                    <td className="px-5 py-3">
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </td>
                    <td className="px-5 py-3">
                      <Skeleton className="ml-auto h-4 w-20" />
                    </td>
                  </tr>
                ))
              ) : filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12">
                    <EmptyState
                      icon={ChalkboardTeacher}
                      title="No teachers found"
                      description={
                        searchTerm || filterDept || filterStatus
                          ? 'Try adjusting your filters or search query'
                          : 'Teaching staff records will appear here once added'
                      }
                      action={
                        <Button as={Link} to="/teachers/new" variant="outline" size="sm">
                          <Plus size={16} weight="bold" />
                          Add teacher
                        </Button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher, idx) => (
                  <motion.tr
                    key={teacher._id}
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.2,
                      ease: [0.23, 1, 0.32, 1],
                      delay: shouldReduceMotion ? 0 : idx * 0.04,
                    }}
                    className="transition-colors hover:bg-zinc-50/60"
                  >
                    <td className="px-5 py-3 font-mono text-zinc-700">{teacher.employeeId}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-zinc-900">{formatName(teacher)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-zinc-600">{teacher.department || '—'}</td>
                    <td className="px-5 py-3 text-zinc-600">{teacher.designation || '—'}</td>
                    <td className="px-5 py-3">{formatSubjects(teacher.subjects)}</td>
                    <td className="px-5 py-3">
                      <Badge variant={STATUS_VARIANTS[teacher.status] || 'neutral'}>
                        {STATUS_LABELS[teacher.status] || teacher.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          as={Link}
                          to={`/teachers/${teacher._id}`}
                          variant="ghost"
                          size="icon"
                          aria-label="View teacher"
                        >
                          <Eye size={18} />
                        </Button>
                        <Button
                          as={Link}
                          to={`/teachers/${teacher._id}/edit`}
                          variant="ghost"
                          size="icon"
                          aria-label="Edit teacher"
                        >
                          <Pencil size={18} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(teacher._id)}
                          aria-label="Deactivate teacher"
                        >
                          <Trash size={18} />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Deactivate teacher"
        description="This will mark the teacher as inactive and revoke their class teacher assignment. You can reactivate them later."
        size="sm"
      >
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteId(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            isLoading={deleteLoading}
            disabled={deleteLoading}
          >
            Deactivate
          </Button>
        </div>
      </Modal>
    </motion.div>
  );
};

export default TeacherList;
