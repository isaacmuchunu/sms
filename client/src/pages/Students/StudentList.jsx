import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { format } from 'date-fns';
import {
  Plus,
  MagnifyingGlass,
  Faders,
  Eye,
  PencilSimple,
  Trash,
  Student as StudentIcon,
  Check,
  X,
  UploadSimple,
} from '@phosphor-icons/react';
import useFetch from '../../hooks/useFetch';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import BulkImportModal from './BulkImportModal';
import toast from 'react-hot-toast';

const STATUS_VARIANTS = {
  active: 'success',
  inactive: 'neutral',
  pending: 'warning',
  transferred: 'danger',
  graduated: 'info',
  suspended: 'warning',
};

const STATUS_LABELS = {
  active: 'Active',
  inactive: 'Inactive',
  pending: 'Pending approval',
  transferred: 'Transferred',
  graduated: 'Graduated',
  suspended: 'Suspended',
};

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'pending', label: 'Pending approval' },
  { key: 'inactive', label: 'Inactive' },
];

const getStudentName = (student) =>
  student.fullName || [student.firstName, student.lastName].filter(Boolean).join(' ') || 'Unnamed';

const getClassLabel = (student) => {
  const cls = student.class;
  const section = student.sectionName || student.section?.name || student.currentSection;
  if (typeof cls === 'object' && cls) {
    return `${cls.name}${section ? ` - ${section}` : ''}`;
  }
  return [cls, section].filter(Boolean).join(' - ') || '-';
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.23, 1, 0.32, 1] } },
};

const StudentList = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isTeacher = user?.role === 'teacher';
  const [statusTab, setStatusTab] = useState('all');
  const studentsUrl = statusTab === 'all' ? '/students' : `/students?status=${statusTab}`;
  const { data: students = [], loading, error, refetch } = useFetch(studentsUrl);
  const { data: classes = [] } = useFetch('/classes');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const classOptions = useMemo(() => {
    const list = Array.isArray(classes) ? classes : classes?.items || [];
    return list
      .filter((c) => c.status !== 'inactive')
      .map((c) => ({ value: c._id, label: c.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [classes]);

  const sectionOptions = useMemo(() => {
    if (!filterClass) return [];
    const list = Array.isArray(classes) ? classes : classes?.items || [];
    const cls = list.find((c) => c._id === filterClass);
    if (!cls || !Array.isArray(cls.sections)) return [];
    return cls.sections
      .filter((s) => s.status !== 'inactive')
      .map((s) => ({ value: s._id, label: s.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [filterClass, classes]);

  const filteredStudents = useMemo(() => {
    const list = Array.isArray(students) ? students : [];
    return list.filter((s) => {
      const name = getStudentName(s).toLowerCase();
      const query = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        name.includes(query) ||
        s.admissionNo?.toLowerCase().includes(query) ||
        s.rollNo?.toLowerCase().includes(query);
      const matchesClass = !filterClass || s.class?._id === filterClass || s.class === filterClass;
      const matchesSection = !filterSection || s.section?._id === filterSection || s.section === filterSection;
      return matchesSearch && matchesClass && matchesSection;
    });
  }, [students, searchTerm, filterClass, filterSection]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/students/${deleteId}`);
      toast.success('Student deleted successfully');
      setDeleteId(null);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete student');
    } finally {
      setDeleteLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterClass('');
    setFilterSection('');
  };

  const handleApprove = async (id) => {
    setActionId(id);
    setActionLoading(true);
    try {
      await api.patch(`/students/${id}/approve`);
      toast.success('Student approved successfully');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve student');
    } finally {
      setActionLoading(false);
      setActionId(null);
    }
  };

  const handleReject = async (id) => {
    setActionId(id);
    setActionLoading(true);
    try {
      await api.patch(`/students/${id}/reject`);
      toast.success('Student registration rejected');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject student');
    } finally {
      setActionLoading(false);
      setActionId(null);
    }
  };

  const wrapperProps = shouldReduceMotion
    ? {}
    : { variants: containerVariants, initial: 'hidden', animate: 'visible' };
  const itemProps = shouldReduceMotion ? {} : { variants: itemVariants };

  return (
    <motion.div className="space-y-6" {...wrapperProps}>
      <motion.div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" {...itemProps}>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Students</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {isTeacher
              ? 'Register provisional students pending admin approval'
              : 'Manage all students in the school'}
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <UploadSimple size={18} weight="bold" />
              Bulk import
            </Button>
            <Button as={Link} to="/students/new">
              <Plus size={18} weight="bold" />
              Add student
            </Button>
          </div>
        )}
      </motion.div>

      <motion.div {...itemProps}>
        <div className="flex gap-2 border-b border-zinc-200">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                statusTab === tab.key
                  ? 'border-b-2 border-accent-600 text-accent-700'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div {...itemProps}>
        <Card>
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                placeholder="Search by name, admission or roll number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                startIcon={<MagnifyingGlass size={18} />}
              />
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="min-w-[12rem]">
                <Select
                  value={filterClass}
                  onChange={(e) => {
                    setFilterClass(e.target.value);
                    setFilterSection('');
                  }}
                  options={classOptions}
                  placeholder="All classes"
                  startIcon={<Faders size={18} />}
                />
              </div>
              <div className="min-w-[10rem]">
                <Select
                  value={filterSection}
                  onChange={(e) => setFilterSection(e.target.value)}
                  options={sectionOptions}
                  placeholder="All sections"
                  disabled={!filterClass}
                />
              </div>
              {(searchTerm || filterClass || filterSection) && (
                <Button type="button" variant="ghost" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div {...itemProps}>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/60">
                  <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Student
                  </th>
                  <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Admission no
                  </th>
                  <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Class
                  </th>
                  <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Gender
                  </th>
                  <th className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Date of birth
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
                {loading ? (
                  Array.from({ length: 6 }).map((_, idx) => (
                    <tr key={idx}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-9 w-9 rounded-full" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-16" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-20" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Skeleton className="h-8 w-8 rounded-lg" />
                          <Skeleton className="h-8 w-8 rounded-lg" />
                          <Skeleton className="h-8 w-8 rounded-lg" />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12">
                      <div className="rounded-lg border border-danger-200 bg-danger-50 p-4 text-center text-sm text-danger-700">
                        {error}
                      </div>
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12">
                      <EmptyState
                        icon={StudentIcon}
                        title="No students found"
                        description={
                          searchTerm || filterClass || filterSection
                            ? 'Try adjusting your filters'
                            : 'Add a student to get started'
                        }
                        action={
                          isAdmin && (
                            <Button as={Link} to="/students/new">
                              <Plus size={16} weight="bold" />
                              Add student
                            </Button>
                          )
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr
                      key={student._id}
                      className="transition-colors hover:bg-zinc-50/60"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-subtle text-xs font-semibold text-accent-700">
                            {getStudentName(student)
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium text-zinc-900">{getStudentName(student)}</p>
                            <p className="text-xs text-zinc-500">Roll no: {student.rollNo || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-zinc-700">
                        {student.admissionNo || '-'}
                      </td>
                      <td className="px-5 py-4 text-zinc-700">{getClassLabel(student)}</td>
                      <td className="px-5 py-4 capitalize text-zinc-700">{student.gender || '-'}</td>
                      <td className="px-5 py-4 text-zinc-700">
                        {student.dob ? format(new Date(student.dob), 'dd MMM yyyy') : '-'}
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={STATUS_VARIANTS[student.status] || 'neutral'}>
                          {STATUS_LABELS[student.status] || student.status || 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/students/${student._id}`}
                            className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                            aria-label="View student"
                            title="View"
                          >
                            <Eye size={18} />
                          </Link>
                          {student.status === 'pending' && isAdmin && (
                            <>
                              <button
                                onClick={() => handleApprove(student._id)}
                                disabled={actionLoading && actionId === student._id}
                                className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-accent-subtle hover:text-accent-700 disabled:opacity-50"
                                aria-label="Approve student"
                                title="Approve"
                              >
                                <Check size={18} />
                              </button>
                              <button
                                onClick={() => handleReject(student._id)}
                                disabled={actionLoading && actionId === student._id}
                                className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-danger-50 hover:text-danger-600 disabled:opacity-50"
                                aria-label="Reject student"
                                title="Reject"
                              >
                                <X size={18} />
                              </button>
                            </>
                          )}
                          {student.status !== 'pending' && (
                            <>
                              <Link
                                to={`/students/${student._id}?edit=true`}
                                className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                                aria-label="Edit student"
                                title="Edit"
                              >
                                <PencilSimple size={18} />
                              </Link>
                              <button
                                onClick={() => setDeleteId(student._id)}
                                className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-danger-50 hover:text-danger-600"
                                aria-label="Delete student"
                                title="Delete"
                              >
                                <Trash size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!loading && !error && filteredStudents.length > 0 && (
            <div className="border-t border-zinc-100 px-5 py-3 text-xs text-zinc-500">
              Showing {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
            </div>
          )}
        </Card>
      </motion.div>

      <BulkImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => refetch()}
      />

      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete student"
        description="This action cannot be undone. The student will be marked inactive."
        size="sm"
      >
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleteLoading}>
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

export default StudentList;
