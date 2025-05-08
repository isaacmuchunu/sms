import React, { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Plus,
  MagnifyingGlass,
  PencilSimple,
  Trash,
  Chalkboard,
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

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(value || 0);

const ClassList = () => {
  const shouldReduceMotion = useReducedMotion();
  const { data: classes, loading, error, refetch } = useFetch('/classes');
  const { data: academicYearData, loading: ayLoading } = useFetch('/academic-years/current');
  const academicYear = academicYearData?.academicYear;

  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    numericName: '',
    sectionName: 'A',
    capacity: 40,
    monthlyFee: 0,
    status: 'active',
  });

  const filteredClasses = useMemo(() => {
    if (!classes) return [];
    if (!searchTerm) return classes;
    const lower = searchTerm.toLowerCase();
    return classes.filter(
      (c) =>
        c.name?.toLowerCase().includes(lower) ||
        c.numericName?.toString().includes(lower) ||
        c.sections?.some((s) => s.name?.toLowerCase().includes(lower))
    );
  }, [classes, searchTerm]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const openCreate = () => {
    setEditingClass(null);
    setForm({ name: '', numericName: '', sectionName: 'A', capacity: 40, monthlyFee: 0, status: 'active' });
    setShowForm(true);
  };

  const openEdit = (cls) => {
    setEditingClass(cls);
    setForm({
      name: cls.name || '',
      numericName: cls.numericName || '',
      sectionName: cls.sections?.[0]?.name || 'A',
      capacity: cls.sections?.[0]?.capacity || 40,
      monthlyFee: cls.monthlyFee || 0,
      status: cls.status || 'active',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!academicYear?._id) {
      toast.error('Current academic year is not configured');
      return;
    }
    setFormLoading(true);
    try {
      const payload = {
        name: form.name,
        numericName: Number(form.numericName),
        academicYear: academicYear._id,
        monthlyFee: Number(form.monthlyFee) || 0,
        status: form.status,
        sections: editingClass
          ? undefined
          : [
              {
                name: form.sectionName,
                capacity: Number(form.capacity) || 40,
                status: 'active',
              },
            ],
      };
      if (editingClass) {
        await api.put(`/classes/${editingClass._id}`, payload);
        toast.success('Class updated successfully');
      } else {
        await api.post('/classes', payload);
        toast.success('Class created successfully');
      }
      setShowForm(false);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save class');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/classes/${deleteId}`);
      toast.success('Class removed successfully');
      setDeleteId(null);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete class');
    }
  };

  if (loading || ayLoading) {
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
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Classes</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage all classes</p>
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
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Classes</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage all classes</p>
        </div>
        <Button onClick={openCreate} className="self-start sm:self-auto">
          <Plus size={18} weight="bold" />
          Add class
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <MagnifyingGlass
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              type="text"
              placeholder="Search classes by name, grade or section..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors duration-160 ease-out-strong focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/20"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-zinc-100 px-5 py-4">
          <CardTitle>Class catalog</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/60">
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Name</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Grade</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Sections</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Monthly fee</th>
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
              {filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12">
                    <EmptyState
                      title="No classes found"
                      description={
                        searchTerm
                          ? 'Try adjusting your search query'
                          : 'Add a class to start managing sections and students'
                      }
                      icon={Chalkboard}
                      action={
                        <Button onClick={openCreate} variant="outline" size="sm">
                          <Plus size={16} weight="bold" />
                          Add class
                        </Button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                filteredClasses.map((cls) => (
                  <motion.tr
                    key={cls._id}
                    variants={rowVariants}
                    className="transition-colors hover:bg-zinc-50/60"
                  >
                    <td className="px-5 py-3 font-medium text-zinc-900">{cls.name}</td>
                    <td className="px-5 py-3 tabular-nums text-zinc-700">{cls.numericName}</td>
                    <td className="px-5 py-3 text-zinc-700">
                      {cls.sections?.length
                        ? cls.sections.map((s) => s.name).join(', ')
                        : '—'}
                    </td>
                    <td className="px-5 py-3 tabular-nums text-zinc-700">
                      {formatCurrency(cls.monthlyFee)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={cls.status === 'active' ? 'success' : 'neutral'}>
                        {cls.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(cls)}
                          aria-label="Edit class"
                        >
                          <PencilSimple size={18} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(cls._id)}
                          aria-label="Delete class"
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
        title={editingClass ? 'Edit class' : 'Add class'}
        description={editingClass ? 'Update class details' : 'Create a new class with an initial section'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Class name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Class 5"
              required
            />
            <Input
              label="Numeric grade"
              name="numericName"
              type="number"
              min={1}
              value={form.numericName}
              onChange={handleChange}
              placeholder="e.g. 5"
              required
            />
            {!editingClass && (
              <>
                <Input
                  label="Initial section"
                  name="sectionName"
                  value={form.sectionName}
                  onChange={handleChange}
                  placeholder="e.g. A"
                  required
                />
                <Input
                  label="Section capacity"
                  name="capacity"
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={handleChange}
                  required
                />
              </>
            )}
            <Input
              label="Monthly fee"
              name="monthlyFee"
              type="number"
              min={0}
              value={form.monthlyFee}
              onChange={handleChange}
            />
            <Select
              label="Status"
              name="status"
              value={form.status}
              onChange={handleChange}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={formLoading}>
              {editingClass ? 'Update class' : 'Create class'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete class"
        description="This action cannot be undone. Active classes with students will be archived instead."
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

export default ClassList;
