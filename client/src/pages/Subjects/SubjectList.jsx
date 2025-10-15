import React, { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Plus,
  MagnifyingGlass,
  PencilSimple,
  Trash,
  BookOpen,
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

const SubjectList = () => {
  const shouldReduceMotion = useReducedMotion();
  const { data: subjects, loading, error, refetch } = useFetch('/subjects');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [form, setForm] = useState({
    code: '',
    name: '',
    type: 'core',
    credits: '',
    maxMarks: '100',
    passMarks: '40',
    status: 'active',
  });

  const filteredSubjects = useMemo(() => {
    if (!subjects) return [];
    return subjects.filter((s) => {
      const matchesSearch =
        !searchTerm ||
        s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.code?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = !filterType || s.type === filterType;
      const matchesStatus = !filterStatus || s.status === filterStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [subjects, searchTerm, filterType, filterStatus]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const openCreate = () => {
    setEditingSubject(null);
    setForm({
      code: '',
      name: '',
      type: 'core',
      credits: '',
      maxMarks: '100',
      passMarks: '40',
      status: 'active',
    });
    setShowForm(true);
  };

  const openEdit = (subject) => {
    setEditingSubject(subject);
    setForm({
      code: subject.code || '',
      name: subject.name || '',
      type: subject.type || 'core',
      credits: subject.credits ?? '',
      maxMarks: subject.maxMarks ?? '100',
      passMarks: subject.passMarks ?? '40',
      status: subject.status || 'active',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const payload = {
        ...form,
        credits: form.credits === '' ? 1 : Number(form.credits),
        maxMarks: Number(form.maxMarks),
        passMarks: Number(form.passMarks),
      };
      if (editingSubject) {
        await api.put(`/subjects/${editingSubject._id}`, payload);
        toast.success('Subject updated successfully');
      } else {
        await api.post('/subjects', payload);
        toast.success('Subject created successfully');
      }
      setShowForm(false);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save subject');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/subjects/${deleteId}`);
      toast.success('Subject removed successfully');
      setDeleteId(null);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete subject');
    }
  };

  const typeOptions = [
    { value: '', label: 'All types' },
    { value: 'core', label: 'Core' },
    { value: 'elective', label: 'Elective' },
    { value: 'language', label: 'Language' },
    { value: 'co_curricular', label: 'Co-curricular' },
    { value: 'extra_curricular', label: 'Extra-curricular' },
  ];

  const statusOptions = [
    { value: '', label: 'All statuses' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full max-w-md" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Subjects</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage all subjects in the curriculum</p>
        </div>
        <Card>
          <CardContent>
            <div className="rounded-lg border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
              {error}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Subjects</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage all subjects in the curriculum</p>
        </div>
        <Button onClick={openCreate} className="self-start sm:self-auto">
          <Plus size={18} weight="bold" />
          Add subject
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="relative flex-1">
              <MagnifyingGlass
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                placeholder="Search by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors duration-160 ease-out-strong focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/20"
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:w-44">
              <label className="text-xs font-medium text-zinc-500">Type</label>
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                options={typeOptions}
                className="gap-0"
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:w-44">
              <label className="text-xs font-medium text-zinc-500">Status</label>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                options={statusOptions}
                className="gap-0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-zinc-100 px-5 py-4">
          <CardTitle>Subject catalog</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/60">
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Code</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Name</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Type</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Credits</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Max marks</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Pass marks</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Status</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Actions</th>
              </tr>
            </thead>
            <motion.tbody
              variants={containerVariants}
              initial={shouldReduceMotion ? 'visible' : 'hidden'}
              animate="visible"
              className="divide-y divide-zinc-50"
            >
              {filteredSubjects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12">
                    <EmptyState
                      title="No subjects found"
                      description={
                        searchTerm || filterType || filterStatus
                          ? 'Try adjusting your filters'
                          : 'Add a subject to build the curriculum'
                      }
                      icon={BookOpen}
                      action={
                        <Button onClick={openCreate} variant="outline" size="sm">
                          <Plus size={16} weight="bold" />
                          Add subject
                        </Button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                filteredSubjects.map((subject) => (
                  <motion.tr
                    key={subject._id}
                    variants={rowVariants}
                    className="transition-colors hover:bg-zinc-50/60"
                  >
                    <td className="px-5 py-3 font-medium text-zinc-900">{subject.code}</td>
                    <td className="px-5 py-3 text-zinc-700">{subject.name}</td>
                    <td className="px-5 py-3">
                      <Badge variant={typeBadgeVariant(subject.type)}>
                        {subjectTypeLabel[subject.type] || subject.type}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 tabular-nums text-zinc-700">{subject.credits ?? '—'}</td>
                    <td className="px-5 py-3 tabular-nums text-zinc-700">{subject.maxMarks ?? '—'}</td>
                    <td className="px-5 py-3 tabular-nums text-zinc-700">{subject.passMarks ?? '—'}</td>
                    <td className="px-5 py-3">
                      <Badge variant={subject.status === 'active' ? 'success' : 'neutral'}>
                        {subject.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(subject)}
                          aria-label="Edit subject"
                        >
                          <PencilSimple size={18} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(subject._id)}
                          aria-label="Delete subject"
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
          </table>
        </div>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingSubject ? 'Edit subject' : 'Add subject'}
        description={editingSubject ? 'Update subject details' : 'Add a new subject to the curriculum'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Subject code"
              name="code"
              value={form.code}
              onChange={handleChange}
              placeholder="e.g. MAT05"
              required
            />
            <Input
              label="Subject name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Mathematics"
              required
            />
            <Select
              label="Type"
              name="type"
              value={form.type}
              onChange={handleChange}
              options={typeOptions.filter((o) => o.value !== '')}
            />
            <Input
              label="Credits"
              name="credits"
              type="number"
              min={0}
              value={form.credits}
              onChange={handleChange}
            />
            <Input
              label="Maximum marks"
              name="maxMarks"
              type="number"
              min={0}
              value={form.maxMarks}
              onChange={handleChange}
              required
            />
            <Input
              label="Passing marks"
              name="passMarks"
              type="number"
              min={0}
              value={form.passMarks}
              onChange={handleChange}
              required
            />
            <Select
              label="Status"
              name="status"
              value={form.status}
              onChange={handleChange}
              options={statusOptions.filter((o) => o.value !== '')}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={formLoading}>
              {editingSubject ? 'Update subject' : 'Create subject'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete subject"
        description="Subjects in use will be marked inactive instead of removed."
        size="sm"
      >
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteId(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default SubjectList;
