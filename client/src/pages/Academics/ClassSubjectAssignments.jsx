import React, { useMemo, useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Plus,
  MagnifyingGlass,
  PencilSimple,
  Trash,
  Books,
  Calendar,
  Chalkboard,
  Users,
  Clock,
  Check,
  X,
} from '@phosphor-icons/react';
import useFetch from '../../hooks/useFetch';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const rowVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] },
  },
};

const subjectTypeLabel = {
  core: 'Core',
  elective: 'Elective',
  language: 'Language',
  co_curricular: 'Co-curricular',
  extra_curricular: 'Extra-curricular',
};

const typeBadgeVariant = (type) => {
  switch (type) {
    case 'core':
      return 'accent';
    case 'elective':
      return 'info';
    case 'language':
      return 'warning';
    case 'co_curricular':
    case 'extra_curricular':
      return 'success';
    default:
      return 'neutral';
  }
};

const formatTeacherName = (teacher) => {
  if (!teacher) return '—';
  return [teacher.firstName, teacher.lastName].filter(Boolean).join(' ') || '—';
};

const ClassSubjectAssignments = () => {
  const shouldReduceMotion = useReducedMotion();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterAcademicYear, setFilterAcademicYear] = useState('');
  const [filterElective, setFilterElective] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [form, setForm] = useState({
    class: '',
    section: '',
    subject: '',
    teacher: '',
    academicYear: '',
    weeklyPeriods: '5',
    isElective: false,
  });

  const { data: academicYears = [], loading: ayLoading } = useFetch('/academic-years');
  const { data: currentYearData, loading: currentYearLoading } = useFetch('/academic-years/current');
  const { data: classes = [], loading: classesLoading } = useFetch('/classes');
  const { data: subjects = [], loading: subjectsLoading } = useFetch('/subjects');
  const { data: teachers = [], loading: teachersLoading } = useFetch('/teachers');

  const academicYearList = useMemo(() => {
    const list = Array.isArray(academicYears) ? academicYears : academicYears.items || [];
    return list.map((y) => ({ value: y._id || y.id, label: y.name }));
  }, [academicYears]);

  const currentAcademicYear = useMemo(() => {
    if (currentYearData?.academicYear) return currentYearData.academicYear;
    if (currentYearData?._id || currentYearData?.id) return currentYearData;
    return null;
  }, [currentYearData]);

  useEffect(() => {
    if (currentAcademicYear && !filterAcademicYear) {
      setFilterAcademicYear(currentAcademicYear._id || currentAcademicYear.id);
    }
  }, [currentAcademicYear, filterAcademicYear]);

  const classOptions = useMemo(() => {
    const list = Array.isArray(classes) ? classes : classes.items || [];
    return list
      .filter((c) => c.status !== 'inactive')
      .map((c) => ({ value: c._id || c.id, label: c.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [classes]);

  const sectionOptionsForFilter = useMemo(() => {
    if (!filterClass) return [];
    const list = Array.isArray(classes) ? classes : classes.items || [];
    const cls = list.find((c) => (c._id || c.id) === filterClass);
    if (!cls || !Array.isArray(cls.sections)) return [];
    return cls.sections
      .filter((s) => s.status !== 'inactive')
      .map((s) => ({ value: s._id || s.id, label: s.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [filterClass, classes]);

  const subjectOptions = useMemo(() => {
    const list = Array.isArray(subjects) ? subjects : subjects.items || [];
    return list
      .filter((s) => s.status !== 'inactive')
      .map((s) => ({
        value: s._id || s.id,
        label: `${s.name}${s.code ? ` (${s.code})` : ''}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [subjects]);

  const teacherOptions = useMemo(() => {
    const list = Array.isArray(teachers) ? teachers : teachers.items || [];
    return list
      .filter((t) => t.status === 'active')
      .map((t) => ({
        value: t._id || t.id,
        label: [t.firstName, t.lastName].filter(Boolean).join(' ') || t.employeeId || 'Unnamed',
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [teachers]);

  const queryParams = useMemo(() => {
    const params = {};
    if (filterAcademicYear) params.academicYear = filterAcademicYear;
    if (filterClass) params.class = filterClass;
    if (filterSection) params.section = filterSection;
    if (filterTeacher) params.teacher = filterTeacher;
    if (filterElective) params.isElective = filterElective === 'true';
    if (searchTerm.trim()) params.search = searchTerm.trim();
    return params;
  }, [filterAcademicYear, filterClass, filterSection, filterTeacher, filterElective, searchTerm]);

  const {
    data: allocations = [],
    loading,
    error,
    refetch,
  } = useFetch('/class-subjects', { params: queryParams });

  const sectionOptionsForForm = useMemo(() => {
    if (!form.class) return [];
    const list = Array.isArray(classes) ? classes : classes.items || [];
    const cls = list.find((c) => (c._id || c.id) === form.class);
    if (!cls || !Array.isArray(cls.sections)) return [];
    return cls.sections
      .filter((s) => s.status !== 'inactive')
      .map((s) => ({ value: s._id || s.id, label: s.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [form.class, classes]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const openCreate = () => {
    setEditingAllocation(null);
    setForm({
      class: '',
      section: '',
      subject: '',
      teacher: '',
      academicYear: filterAcademicYear || (currentAcademicYear?._id || currentAcademicYear?.id) || '',
      weeklyPeriods: '5',
      isElective: false,
    });
    setShowForm(true);
  };

  const openEdit = (allocation) => {
    setEditingAllocation(allocation);
    setForm({
      class: allocation.class?._id || '',
      section: allocation.section || '',
      subject: allocation.subject?._id || '',
      teacher: allocation.teacher?._id || '',
      academicYear: allocation.academicYear?._id || '',
      weeklyPeriods: allocation.weeklyPeriods?.toString() || '5',
      isElective: !!allocation.isElective,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const payload = {
        teacher: form.teacher || null,
        weeklyPeriods: Number(form.weeklyPeriods),
        isElective: form.isElective,
      };

      if (editingAllocation) {
        await api.put(`/class-subjects/${editingAllocation._id}`, payload);
        toast.success('Allocation updated successfully');
      } else {
        payload.class = form.class;
        payload.section = form.section;
        payload.subject = form.subject;
        payload.academicYear = form.academicYear;
        await api.post('/class-subjects', payload);
        toast.success('Allocation created successfully');
      }
      setShowForm(false);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save allocation');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/class-subjects/${deleteId}`);
      toast.success('Allocation removed successfully');
      setDeleteId(null);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete allocation');
    } finally {
      setDeleteLoading(false);
    }
  };

  const isLoading =
    loading ||
    ayLoading ||
    currentYearLoading ||
    classesLoading ||
    subjectsLoading ||
    teachersLoading;

  const electiveOptions = [
    { value: '', label: 'All allocations' },
    { value: 'false', label: 'Core' },
    { value: 'true', label: 'Elective' },
  ];

  const hasActiveFilters =
    searchTerm || filterClass || filterSection || filterTeacher || filterAcademicYear || filterElective;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Class-subject assignments</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage subject allocations across classes and sections</p>
        </div>
        <Button onClick={openCreate} className="self-start sm:self-auto">
          <Plus size={18} weight="bold" />
          Add assignment
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="relative flex-1">
                <MagnifyingGlass
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <input
                  type="text"
                  placeholder="Search by subject name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors duration-160 ease-out-strong focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/20"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:w-48">
                <label className="text-xs font-medium text-zinc-500">Academic year</label>
                <Select
                  value={filterAcademicYear}
                  onChange={(e) => {
                    setFilterAcademicYear(e.target.value);
                    setFilterClass('');
                    setFilterSection('');
                  }}
                  options={academicYearList}
                  placeholder="All years"
                  startIcon={<Calendar size={18} />}
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:w-48">
                <label className="text-xs font-medium text-zinc-500">Class</label>
                <Select
                  value={filterClass}
                  onChange={(e) => {
                    setFilterClass(e.target.value);
                    setFilterSection('');
                  }}
                  options={classOptions}
                  placeholder="All classes"
                  startIcon={<Chalkboard size={18} />}
                />
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex flex-col gap-1.5 sm:w-48">
                <label className="text-xs font-medium text-zinc-500">Section</label>
                <Select
                  value={filterSection}
                  onChange={(e) => setFilterSection(e.target.value)}
                  options={sectionOptionsForFilter}
                  placeholder="All sections"
                  disabled={!filterClass}
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:w-56">
                <label className="text-xs font-medium text-zinc-500">Teacher</label>
                <Select
                  value={filterTeacher}
                  onChange={(e) => setFilterTeacher(e.target.value)}
                  options={teacherOptions}
                  placeholder="All teachers"
                  startIcon={<Users size={18} />}
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:w-44">
                <label className="text-xs font-medium text-zinc-500">Type</label>
                <Select
                  value={filterElective}
                  onChange={(e) => setFilterElective(e.target.value)}
                  options={electiveOptions}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-zinc-100 px-5 py-4">
          <CardTitle>Assignments</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/60">
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Class</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Section</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Subject</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Teacher</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Type</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Periods / week</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Academic year</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Actions</th>
              </tr>
            </thead>
            {isLoading ? (
              <tbody className="divide-y divide-zinc-50">
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-5 py-3">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="px-5 py-3">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="px-5 py-3">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="px-5 py-3">
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </td>
                    <td className="px-5 py-3">
                      <Skeleton className="h-4 w-12" />
                    </td>
                    <td className="px-5 py-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-5 py-3">
                      <Skeleton className="ml-auto h-4 w-20" />
                    </td>
                  </tr>
                ))}
              </tbody>
            ) : error ? (
              <tbody>
                <tr>
                  <td colSpan={8} className="px-5 py-8">
                    <div className="rounded-lg border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
                      {error}
                    </div>
                  </td>
                </tr>
              </tbody>
            ) : (
              <motion.tbody
                variants={containerVariants}
                initial={shouldReduceMotion ? 'visible' : 'hidden'}
                animate="visible"
                className="divide-y divide-zinc-50"
              >
                {allocations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12">
                      <EmptyState
                        title="No assignments found"
                        description={
                          hasActiveFilters
                            ? 'Try adjusting your filters'
                            : 'Assign subjects to classes and sections to get started'
                        }
                        icon={Books}
                        action={
                          <Button onClick={openCreate} variant="outline" size="sm">
                            <Plus size={16} weight="bold" />
                            Add assignment
                          </Button>
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  allocations.map((allocation) => (
                    <motion.tr
                      key={allocation._id}
                      variants={rowVariants}
                      className="transition-colors hover:bg-zinc-50/60"
                    >
                      <td className="px-5 py-3 font-medium text-zinc-900">
                        {allocation.class?.name || '—'}
                      </td>
                      <td className="px-5 py-3 text-zinc-700">{allocation.sectionName || '—'}</td>
                      <td className="px-5 py-3 text-zinc-700">
                        <div className="font-medium text-zinc-900">{allocation.subject?.name || '—'}</div>
                        {allocation.subject?.code && (
                          <div className="text-xs text-zinc-500">{allocation.subject.code}</div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-zinc-700">{formatTeacherName(allocation.teacher)}</td>
                      <td className="px-5 py-3">
                        <Badge variant={allocation.isElective ? 'info' : typeBadgeVariant(allocation.subject?.type)}>
                          {allocation.isElective ? 'Elective' : subjectTypeLabel[allocation.subject?.type] || 'Core'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 tabular-nums text-zinc-700">
                        <div className="flex items-center gap-1.5">
                          <Clock size={14} className="text-zinc-400" />
                          {allocation.weeklyPeriods ?? '—'}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-zinc-700">
                        {allocation.academicYear?.name || '—'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(allocation)}
                            aria-label="Edit assignment"
                          >
                            <PencilSimple size={18} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(allocation._id)}
                            aria-label="Delete assignment"
                            className="text-danger-600 hover:bg-danger-50 hover:text-danger-700"
                          >
                            <Trash size={18} />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </motion.tbody>
            )}
          </table>
        </div>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingAllocation ? 'Edit assignment' : 'Add assignment'}
        description={
          editingAllocation
            ? 'Update teacher, periods or elective status'
            : 'Assign a subject to a class-section for an academic year'
        }
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {!editingAllocation && (
              <>
                <Select
                  label="Academic year"
                  name="academicYear"
                  value={form.academicYear}
                  onChange={handleChange}
                  options={academicYearList}
                  placeholder="Select academic year"
                  required
                />
                <Select
                  label="Class"
                  name="class"
                  value={form.class}
                  onChange={(e) => {
                    setForm((prev) => ({
                      ...prev,
                      class: e.target.value,
                      section: '',
                    }));
                  }}
                  options={classOptions}
                  placeholder="Select class"
                  required
                />
                <Select
                  label="Section"
                  name="section"
                  value={form.section}
                  onChange={handleChange}
                  options={sectionOptionsForForm}
                  placeholder={form.class ? 'Select section' : 'Select a class first'}
                  disabled={!form.class}
                  required
                />
                <Select
                  label="Subject"
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  options={subjectOptions}
                  placeholder="Select subject"
                  required
                />
              </>
            )}
            <Select
              label="Teacher"
              name="teacher"
              value={form.teacher}
              onChange={handleChange}
              options={[{ value: '', label: 'Unassigned' }, ...teacherOptions]}
              placeholder="Select teacher"
            />
            <Input
              label="Weekly periods"
              name="weeklyPeriods"
              type="number"
              min={1}
              value={form.weeklyPeriods}
              onChange={handleChange}
              required
              startIcon={<Clock size={18} />}
            />
            <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 sm:col-span-2">
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, isElective: !prev.isElective }))}
                className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                  form.isElective
                    ? 'border-accent-600 bg-accent-600 text-white'
                    : 'border-zinc-300 bg-white text-transparent'
                }`}
                aria-pressed={form.isElective}
              >
                <Check size={12} weight="bold" />
              </button>
              <span className="text-sm text-zinc-700">Elective subject</span>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={formLoading}>
              {editingAllocation ? 'Update assignment' : 'Create assignment'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete assignment"
        description="This will remove the subject allocation from the class-section. Timetable entries that depend on it must be removed first."
        size="sm"
      >
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} isLoading={deleteLoading} disabled={deleteLoading}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default ClassSubjectAssignments;
