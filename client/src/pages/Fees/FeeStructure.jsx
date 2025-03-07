import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  PencilSimple,
  Trash,
  FloppyDisk,
  MagnifyingGlass,
  CurrencyInr,
  Books,
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import useFetch from '../../hooks/useFetch';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

const FREQUENCIES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half_yearly', label: 'Half Yearly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'one_time', label: 'One Time' },
];

const FEE_HEAD_TYPES = [
  { value: 'tuition', label: 'Tuition' },
  { value: 'admission', label: 'Admission' },
  { value: 'examination', label: 'Examination' },
  { value: 'transport', label: 'Transport' },
  { value: 'hostel', label: 'Hostel' },
  { value: 'library', label: 'Library' },
  { value: 'activity', label: 'Activity' },
  { value: 'other', label: 'Other' },
];

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'scholarship', label: 'Scholarship' },
  { value: 'boarding', label: 'Boarding' },
  { value: 'day', label: 'Day' },
  { value: 'other', label: 'Other' },
];

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(value || 0);

const pageVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.23, 1, 0.32, 1] } },
};

const FeeStructure = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [structureItems, setStructureItems] = useState({});
  const [saving, setSaving] = useState(false);
  const [headModalOpen, setHeadModalOpen] = useState(false);
  const [editingHead, setEditingHead] = useState(null);
  const [headForm, setHeadForm] = useState({
    name: '',
    code: '',
    description: '',
    type: 'tuition',
    frequency: 'monthly',
    refundable: false,
    status: 'active',
  });
  const [headSaving, setHeadSaving] = useState(false);
  const [deleteHeadId, setDeleteHeadId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const {
    data: academicYears,
    loading: yearsLoading,
    error: yearsError,
  } = useFetch('/academic-years');

  const currentYear = useMemo(
    () => academicYears?.find((y) => y.isCurrent)?._id || academicYears?.[0]?._id || '',
    [academicYears]
  );

  useEffect(() => {
    if (currentYear && !selectedYear) setSelectedYear(currentYear);
  }, [currentYear, selectedYear]);

  const { data: classes, loading: classesLoading, error: classesError } = useFetch('/classes');

  const {
    data: feeHeads,
    loading: headsLoading,
    error: headsError,
    refetch: refetchHeads,
  } = useFetch('/fees/heads');

  const structureParams = useMemo(
    () =>
      selectedYear && selectedClass
        ? { academicYear: selectedYear, class: selectedClass, category: selectedCategory }
        : null,
    [selectedYear, selectedClass, selectedCategory]
  );

  const {
    data: feeStructures,
    loading: structuresLoading,
    error: structuresError,
    refetch: refetchStructures,
  } = useFetch('/fees/structures', { params: structureParams });

  const existingStructure = useMemo(() => feeStructures?.[0] || null, [feeStructures]);

  useEffect(() => {
    if (existingStructure?.items) {
      const map = {};
      existingStructure.items.forEach((item) => {
        const id = typeof item.feeHead === 'object' ? item.feeHead._id : item.feeHead;
        map[id] = item.amount;
      });
      setStructureItems(map);
    } else {
      setStructureItems({});
    }
  }, [existingStructure]);

  const classOptions = useMemo(() => {
    if (!classes) return [];
    return classes.map((cls) => ({
      value: cls._id,
      label: `${cls.name}`,
    }));
  }, [classes]);

  const yearOptions = useMemo(() => {
    if (!academicYears) return [];
    return academicYears.map((y) => ({
      value: y._id,
      label: `${y.name}${y.isCurrent ? ' (Current)' : ''}`,
    }));
  }, [academicYears]);

  const filteredHeads = useMemo(() => {
    if (!feeHeads) return [];
    if (!searchTerm.trim()) return feeHeads;
    const term = searchTerm.toLowerCase();
    return feeHeads.filter(
      (h) =>
        h.name?.toLowerCase().includes(term) ||
        h.code?.toLowerCase().includes(term) ||
        h.description?.toLowerCase().includes(term)
    );
  }, [feeHeads, searchTerm]);

  const handleAmountChange = (feeHeadId, amount) => {
    setStructureItems((prev) => ({ ...prev, [feeHeadId]: amount }));
  };

  const handleSaveStructure = async () => {
    if (!selectedYear || !selectedClass) {
      toast.error('Please select an academic year and class');
      return;
    }

    const items = (feeHeads || [])
      .filter((fh) => structureItems[fh._id] !== undefined && structureItems[fh._id] !== '')
      .map((fh) => ({
        feeHead: fh._id,
        amount: Number(structureItems[fh._id]) || 0,
        dueMonths: [],
      }));

    if (items.length === 0) {
      toast.error('Please enter amounts for at least one fee head');
      return;
    }

    const selectedClassObj = classes?.find((c) => c._id === selectedClass);
    const selectedYearObj = academicYears?.find((y) => y._id === selectedYear);
    const name = `${selectedClassObj?.name || 'Class'} - ${selectedCategory}`;
    const effectiveFrom = selectedYearObj?.startDate
      ? new Date(selectedYearObj.startDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    const effectiveTo = selectedYearObj?.endDate
      ? new Date(selectedYearObj.endDate).toISOString().split('T')[0]
      : null;

    if (effectiveFrom && effectiveTo && new Date(effectiveTo) <= new Date(effectiveFrom)) {
      toast.error('Effective to date must be after effective from date');
      return;
    }

    setSaving(true);
    try {
      if (existingStructure) {
        await api.put(`/fees/structures/${existingStructure._id}`, {
          items,
          effectiveFrom,
          effectiveTo,
          status: 'active',
        });
        toast.success('Fee structure updated');
      } else {
        await api.post('/fees/structures', {
          name,
          academicYear: selectedYear,
          class: selectedClass,
          category: selectedCategory,
          items,
          effectiveFrom,
          effectiveTo,
          status: 'active',
        });
        toast.success('Fee structure created');
      }
      refetchStructures();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save fee structure');
    } finally {
      setSaving(false);
    }
  };

  const openHeadModal = (head = null) => {
    if (head) {
      setEditingHead(head);
      setHeadForm({
        name: head.name || '',
        code: head.code || '',
        description: head.description || '',
        type: head.type || 'tuition',
        frequency: head.frequency || 'monthly',
        refundable: !!head.refundable,
        status: head.status || 'active',
      });
    } else {
      setEditingHead(null);
      setHeadForm({
        name: '',
        code: '',
        description: '',
        type: 'tuition',
        frequency: 'monthly',
        refundable: false,
        status: 'active',
      });
    }
    setHeadModalOpen(true);
  };

  const handleSaveHead = async (e) => {
    e.preventDefault();
    setHeadSaving(true);
    try {
      if (editingHead) {
        await api.put(`/fees/heads/${editingHead._id}`, headForm);
        toast.success('Fee head updated');
      } else {
        await api.post('/fees/heads', headForm);
        toast.success('Fee head created');
      }
      setHeadModalOpen(false);
      refetchHeads();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save fee head');
    } finally {
      setHeadSaving(false);
    }
  };

  const handleDeleteHead = async () => {
    if (!deleteHeadId) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/fees/heads/${deleteHeadId}`);
      toast.success('Fee head removed');
      setDeleteHeadId(null);
      refetchHeads();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove fee head');
    } finally {
      setDeleteLoading(false);
    }
  };

  const isStructureDisabled = !selectedYear || !selectedClass;
  const structureTotal = useMemo(() => {
    if (!feeHeads) return 0;
    return feeHeads.reduce((sum, fh) => sum + (Number(structureItems[fh._id]) || 0), 0);
  }, [feeHeads, structureItems]);

  const renderError = (message) => (
    <div className="rounded-lg border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
      {message}
    </div>
  );

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Fee Structure</h1>
        <p className="mt-1 text-sm text-zinc-500">Configure fee heads and class-wise fee amounts</p>
      </div>

      {/* Fee Heads */}
      <motion.div variants={cardVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Books size={18} className="text-zinc-400" />
              Fee Heads
            </CardTitle>
            <Button size="sm" onClick={() => openHeadModal()}>
              <Plus size={16} weight="bold" />
              Add Fee Head
            </Button>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <MagnifyingGlass
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <input
                  type="text"
                  placeholder="Search fee heads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/20"
                />
              </div>
            </div>

            {headsError && renderError(headsError)}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 text-left">
                    <th className="px-3 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Name
                    </th>
                    <th className="px-3 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Code
                    </th>
                    <th className="px-3 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Type
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Frequency
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Status
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {headsLoading &&
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        <td className="px-3 py-3">
                          <Skeleton className="h-4 w-32" />
                        </td>
                        <td className="px-3 py-3">
                          <Skeleton className="h-4 w-20" />
                        </td>
                        <td className="px-3 py-3">
                          <Skeleton className="h-4 w-20" />
                        </td>
                        <td className="px-3 py-3">
                          <Skeleton className="mx-auto h-4 w-16" />
                        </td>
                        <td className="px-3 py-3">
                          <Skeleton className="mx-auto h-5 w-14 rounded-full" />
                        </td>
                        <td className="px-3 py-3">
                          <Skeleton className="ml-auto h-4 w-16" />
                        </td>
                      </tr>
                    ))}
                  {!headsLoading && filteredHeads.length === 0 && (
                    <tr>
                      <td colSpan={6}>
                        <EmptyState
                          title="No fee heads found"
                          description="Add your first fee head to start building fee structures."
                          action={
                            <Button size="sm" onClick={() => openHeadModal()}>
                              <Plus size={16} weight="bold" />
                              Add Fee Head
                            </Button>
                          }
                        />
                      </td>
                    </tr>
                  )}
                  {!headsLoading &&
                    filteredHeads.map((head) => (
                      <tr key={head._id} className="transition-colors hover:bg-zinc-50/60">
                        <td className="px-3 py-3 font-medium text-zinc-900">
                          <div>{head.name}</div>
                          {head.description && (
                            <div className="text-xs text-zinc-500">{head.description}</div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-zinc-600">{head.code}</td>
                        <td className="px-3 py-3 capitalize text-zinc-600">
                          {head.type?.replace(/_/g, ' ')}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <Badge variant="neutral">
                            {FREQUENCIES.find((f) => f.value === head.frequency)?.label ||
                              head.frequency}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <Badge variant={head.status === 'active' ? 'success' : 'neutral'}>
                            {head.status === 'active' ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openHeadModal(head)}
                              className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                              aria-label="Edit fee head"
                            >
                              <PencilSimple size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteHeadId(head._id)}
                              className="rounded-lg p-1.5 text-danger-600 transition-colors hover:bg-danger-50"
                              aria-label="Delete fee head"
                            >
                              <Trash size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Class-wise Fee Structure */}
      <motion.div variants={cardVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CurrencyInr size={18} className="text-zinc-400" />
              Class-wise Fee Structure
            </CardTitle>
            <div className="text-sm font-medium text-zinc-900">
              Total: <span className="text-accent-700">{formatCurrency(structureTotal)}</span>
            </div>
          </CardHeader>
          <CardContent>
            {(yearsError || classesError || structuresError) &&
              renderError(yearsError || classesError || structuresError)}

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Select
                label="Academic Year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                options={yearOptions}
                placeholder={yearsLoading ? 'Loading...' : 'Select year'}
                disabled={yearsLoading || yearOptions.length === 0}
              />
              <Select
                label="Class"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                options={classOptions}
                placeholder={classesLoading ? 'Loading...' : 'Select class'}
                disabled={classesLoading || classOptions.length === 0}
              />
              <Select
                label="Category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                options={CATEGORIES}
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 text-left">
                    <th className="px-3 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Fee Head
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Frequency
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {structuresLoading &&
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        <td className="px-3 py-3">
                          <Skeleton className="h-4 w-32" />
                        </td>
                        <td className="px-3 py-3">
                          <Skeleton className="mx-auto h-4 w-16" />
                        </td>
                        <td className="px-3 py-3">
                          <Skeleton className="ml-auto h-9 w-32" />
                        </td>
                      </tr>
                    ))}
                  {!structuresLoading && (!feeHeads || feeHeads.length === 0) && (
                    <tr>
                      <td colSpan={3}>
                        <EmptyState
                          title="No fee heads available"
                          description="Create fee heads before configuring class-wise amounts."
                        />
                      </td>
                    </tr>
                  )}
                  {!structuresLoading &&
                    feeHeads?.map((fh) => (
                      <tr key={fh._id} className="transition-colors hover:bg-zinc-50/60">
                        <td className="px-3 py-3 font-medium text-zinc-900">
                          <div>{fh.name}</div>
                          <div className="text-xs text-zinc-500">{fh.code}</div>
                        </td>
                        <td className="px-3 py-3 text-center text-zinc-600">
                          {FREQUENCIES.find((f) => f.value === fh.frequency)?.label || fh.frequency}
                        </td>
                        <td className="px-3 py-3">
                          <div className="relative ml-auto w-36">
                            <CurrencyInr
                              size={16}
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                            />
                            <input
                              type="number"
                              min="0"
                              value={structureItems[fh._id] ?? ''}
                              onChange={(e) => handleAmountChange(fh._id, e.target.value)}
                              placeholder="0.00"
                              disabled={isStructureDisabled}
                              className="h-10 w-full rounded-lg border border-zinc-200 bg-white py-2 pr-3 pl-9 text-right text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/20 disabled:bg-zinc-50 disabled:text-zinc-400"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={handleSaveStructure} isLoading={saving} disabled={isStructureDisabled}>
                <FloppyDisk size={18} weight="bold" />
                {existingStructure ? 'Update Fee Structure' : 'Save Fee Structure'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Fee Head Modal */}
      <Modal
        isOpen={headModalOpen}
        onClose={() => setHeadModalOpen(false)}
        title={editingHead ? 'Edit Fee Head' : 'Add Fee Head'}
        size="md"
      >
        <form onSubmit={handleSaveHead} className="space-y-4">
          <Input
            label="Name"
            value={headForm.name}
            onChange={(e) => setHeadForm({ ...headForm, name: e.target.value })}
            placeholder="e.g. Tuition Fee"
            required
          />
          <Input
            label="Code"
            value={headForm.code}
            onChange={(e) => setHeadForm({ ...headForm, code: e.target.value })}
            placeholder="e.g. TUI"
            required
            disabled={!!editingHead}
          />
          <Input
            label="Description"
            value={headForm.description}
            onChange={(e) => setHeadForm({ ...headForm, description: e.target.value })}
            placeholder="Brief description"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Type"
              value={headForm.type}
              onChange={(e) => setHeadForm({ ...headForm, type: e.target.value })}
              options={FEE_HEAD_TYPES}
            />
            <Select
              label="Frequency"
              value={headForm.frequency}
              onChange={(e) => setHeadForm({ ...headForm, frequency: e.target.value })}
              options={FREQUENCIES}
            />
          </div>
          {editingHead && (
            <Select
              label="Status"
              value={headForm.status}
              onChange={(e) => setHeadForm({ ...headForm, status: e.target.value })}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
          )}
          <div className="flex items-center gap-2">
            <input
              id="refundable"
              type="checkbox"
              checked={headForm.refundable}
              onChange={(e) => setHeadForm({ ...headForm, refundable: e.target.checked })}
              className="h-4 w-4 rounded border-zinc-300 text-accent-600 focus:ring-accent-600/20"
            />
            <label htmlFor="refundable" className="text-sm text-zinc-700">
              Refundable
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setHeadModalOpen(false)}
              disabled={headSaving}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={headSaving}>
              {editingHead ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteHeadId}
        onClose={() => setDeleteHeadId(null)}
        title="Remove Fee Head"
        size="sm"
      >
        <p className="text-sm text-zinc-600">
          Are you sure you want to remove this fee head? It will be deactivated if it is already in
          use.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={() => setDeleteHeadId(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDeleteHead}
            isLoading={deleteLoading}
          >
            Remove
          </Button>
        </div>
      </Modal>
    </motion.div>
  );
};

export default FeeStructure;
