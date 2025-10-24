import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Buildings,
  Calendar,
  Medal,
  Bell,
  Envelope,
  ChatText,
  Devices,
  Plus,
  Pencil,
  Trash,
  Warning,
  ToggleLeft,
  ToggleRight,
} from '@phosphor-icons/react';
import useFetch from '../../hooks/useFetch';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Sessions from './Sessions';

const TABS = [
  { id: 'school', label: 'School info', icon: Buildings },
  { id: 'academic', label: 'Academic years', icon: Calendar },
  { id: 'grading', label: 'Grading scale', icon: Medal },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'communications', label: 'Communications', icon: Envelope },
  { id: 'sessions', label: 'Sessions', icon: Devices },
];

const pageVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] },
  },
};

const listVariants = {
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

// Normalize backend snake_case responses to camelCase for forms.
const normalizeSchool = (school = {}) => ({
  id: school.id,
  name: school.name || '',
  address: school.address || '',
  phone: school.phone || '',
  email: school.email || '',
  website: school.website || '',
  affiliationNo: school.affiliation_no || '',
  board: school.board || '',
  establishedYear: school.established_year ?? '',
  principalName: school.principal_name || '',
  status: school.status || 'active',
  modules: school.modules || { transport: false, hostel: false, library: true },
});

const normalizeAcademicYear = (year = {}) => ({
  ...year,
  _id: year.id || year._id,
  startDate: year.start_date || year.startDate || '',
  endDate: year.end_date || year.endDate || '',
  isCurrent: year.is_current ?? year.isCurrent ?? false,
  lateThresholdMinutes: year.late_threshold_minutes ?? year.lateThresholdMinutes ?? 10,
  promotionCriteria: year.promotion_criteria || year.promotionCriteria || {
    minAggregatePercentage: 40,
    maxFailingSubjects: 2,
    minAttendancePercentage: 75,
  },
  terms: (year.terms || []).map((term) => ({
    ...term,
    _id: term.id || term._id,
    startDate: term.start_date || term.startDate || '',
    endDate: term.end_date || term.endDate || '',
  })),
});

const formatDateInput = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

// ---------- School Info Tab ----------

const SchoolInfoTab = ({ schoolId }) => {
  const params = useMemo(() => (schoolId ? { schoolId } : {}), [schoolId]);
  const { data, loading, error, refetch } = useFetch('/settings/school', { params });
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.school) {
      setForm(normalizeSchool(data.school));
    }
  }, [data]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      if (payload.establishedYear === '' || payload.establishedYear === undefined) {
        payload.establishedYear = null;
      }
      // modules are read-only in settings
      delete payload.modules;
      await api.put('/settings/school', payload, { params });
      toast.success('School details saved');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save school details');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <SchoolInfoSkeleton />;
  }

  if (error) {
    return <ErrorAlert message={error} onRetry={refetch} />;
  }

  return (
    <motion.div variants={listVariants} initial="hidden" animate="visible" className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Input
            label="School name"
            value={form.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Enter school name"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <Input
            label="Principal name"
            value={form.principalName || ''}
            onChange={(e) => handleChange('principalName', e.target.value)}
            placeholder="Enter principal name"
          />
        </motion.div>
        <motion.div variants={itemVariants} className="md:col-span-2">
          <Input
            label="Address"
            value={form.address || ''}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder="Enter school address"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <Input
            label="Phone"
            type="tel"
            value={form.phone || ''}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="+91-9876543210"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <Input
            label="Email"
            type="email"
            value={form.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="info@school.edu"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <Input
            label="Website"
            value={form.website || ''}
            onChange={(e) => handleChange('website', e.target.value)}
            placeholder="www.school.edu"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <Input
            label="Board"
            value={form.board || ''}
            onChange={(e) => handleChange('board', e.target.value)}
            placeholder="CBC / IGCSE / 8-4-4"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <Input
            label="Affiliation number"
            value={form.affiliationNo || ''}
            onChange={(e) => handleChange('affiliationNo', e.target.value)}
            placeholder="Enter affiliation number"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <Input
            label="Established year"
            type="number"
            value={form.establishedYear || ''}
            onChange={(e) => handleChange('establishedYear', e.target.value)}
            placeholder="e.g. 1995"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <Select
            label="Status"
            value={form.status || 'active'}
            onChange={(e) => handleChange('status', e.target.value)}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        </motion.div>
      </div>

      <motion.div variants={itemVariants}>
        <Card className="bg-zinc-50/50">
          <div className="p-4">
            <h4 className="text-sm font-semibold text-zinc-900">Active modules</h4>
            <p className="mt-0.5 text-xs text-zinc-500">
              Modules are managed by the super admin. School admins can request activation.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {['transport', 'hostel', 'library'].map((key) => {
                const enabled = (form.modules || {})[key] === true;
                return (
                  <span
                    key={key}
                    className={clsx(
                      'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium capitalize',
                      enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
                    )}
                  >
                    {enabled ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                    {key}
                  </span>
                );
              })}
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="flex items-center gap-3 pt-2">
        <Button onClick={handleSave} isLoading={saving}>
          Save changes
        </Button>
      </motion.div>
    </motion.div>
  );
};

const SchoolInfoSkeleton = () => (
  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
    ))}
  </div>
);

// ---------- Academic Years Tab ----------

const emptyYear = {
  name: '',
  startDate: '',
  endDate: '',
  isCurrent: false,
  lateThresholdMinutes: 10,
  promotionCriteria: {
    minAggregatePercentage: 40,
    maxFailingSubjects: 2,
    minAttendancePercentage: 75,
  },
  terms: [],
};

const AcademicYearsTab = ({ schoolId }) => {
  const params = useMemo(() => (schoolId ? { schoolId } : {}), [schoolId]);
  const { data, loading, error, refetch } = useFetch('/settings/academic-years', { params });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyYear);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const academicYears = useMemo(() => {
    const list = Array.isArray(data) ? data : data?.academicYears || [];
    return list.map(normalizeAcademicYear);
  }, [data]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyYear);
    setModalOpen(true);
  };

  const openEdit = (year) => {
    setEditing(year);
    setForm({
      name: year.name || '',
      startDate: formatDateInput(year.startDate),
      endDate: formatDateInput(year.endDate),
      isCurrent: !!year.isCurrent,
      lateThresholdMinutes: year.lateThresholdMinutes ?? 10,
      promotionCriteria: {
        minAggregatePercentage: year.promotionCriteria?.minAggregatePercentage ?? 40,
        maxFailingSubjects: year.promotionCriteria?.maxFailingSubjects ?? 2,
        minAttendancePercentage: year.promotionCriteria?.minAttendancePercentage ?? 75,
      },
      terms: (year.terms || []).map((t) => ({
        ...t,
        startDate: formatDateInput(t.startDate),
        endDate: formatDateInput(t.endDate),
      })),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyYear);
  };

  const handleTermChange = (idx, field, value) => {
    setForm((prev) => ({
      ...prev,
      terms: prev.terms.map((t, i) => (i === idx ? { ...t, [field]: value } : t)),
    }));
  };

  const addTerm = () => {
    setForm((prev) => ({
      ...prev,
      terms: [...prev.terms, { name: '', startDate: '', endDate: '' }],
    }));
  };

  const removeTerm = (idx) => {
    setForm((prev) => ({
      ...prev,
      terms: prev.terms.filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        startDate: parseDate(form.startDate),
        endDate: parseDate(form.endDate),
        terms: form.terms.map((t) => ({
          ...t,
          startDate: parseDate(t.startDate),
          endDate: parseDate(t.endDate),
        })),
      };
      if (editing) {
        await api.put(`/settings/academic-years/${editing._id}`, payload, { params });
        toast.success('Academic year updated');
      } else {
        await api.post('/settings/academic-years', payload, { params });
        toast.success('Academic year created');
      }
      closeModal();
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save academic year');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await api.delete(`/settings/academic-years/${id}`, { params });
      toast.success('Academic year deleted');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete academic year');
    } finally {
      setDeletingId(null);
    }
  };

  const setCurrent = async (id) => {
    try {
      await api.patch(`/settings/academic-years/${id}/set-current`, null, { params });
      toast.success('Current academic year updated');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update current academic year');
    }
  };

  if (loading) {
    return <AcademicYearsSkeleton />;
  }

  if (error) {
    return <ErrorAlert message={error} onRetry={refetch} />;
  }

  return (
    <motion.div variants={listVariants} initial="hidden" animate="visible" className="space-y-4">
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">Manage academic sessions and terms.</p>
        <Button onClick={openCreate}>
          <Plus size={16} weight="bold" />
          Add year
        </Button>
      </motion.div>

      {academicYears.length === 0 ? (
        <EmptyState
          title="No academic years"
          description="Create an academic year to begin scheduling classes and exams."
          icon={Calendar}
          action={<Button onClick={openCreate}>Add year</Button>}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  <th className="px-5 py-3">Year</th>
                  <th className="px-5 py-3">Duration</th>
                  <th className="px-5 py-3">Terms</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {academicYears.map((year) => (
                  <tr key={year._id} className="hover:bg-zinc-50/60">
                    <td className="px-5 py-3 font-medium text-zinc-900">{year.name}</td>
                    <td className="px-5 py-3 text-zinc-600">
                      {formatDateInput(year.startDate)} - {formatDateInput(year.endDate)}
                    </td>
                    <td className="px-5 py-3 text-zinc-600">{(year.terms || []).length}</td>
                    <td className="px-5 py-3">
                      {year.isCurrent ? (
                        <Badge variant="success">Current</Badge>
                      ) : (
                        <Badge variant="neutral">Inactive</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {!year.isCurrent && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCurrent(year._id)}
                            aria-label="Set as current"
                          >
                            Set current
                          </Button>
                        )}
                        <button
                          onClick={() => openEdit(year)}
                          className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                          aria-label="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(year._id)}
                          disabled={deletingId === year._id}
                          className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          aria-label="Delete"
                        >
                          {deletingId === year._id ? (
                            <span className="block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : (
                            <Trash size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit academic year' : 'Add academic year'}
        description="Define the session dates and terms."
        size="lg"
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <Input
              label="Year name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="2025-2026"
            />
            <Input
              label="Start date"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
            />
            <Input
              label="End date"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={form.isCurrent}
              onChange={(e) => setForm((prev) => ({ ...prev, isCurrent: e.target.checked }))}
              className="h-4 w-4 rounded border-zinc-300 text-accent-600 focus:ring-accent-600"
            />
            Mark as current academic year
          </label>

          <div className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-4">
            <h4 className="mb-3 text-sm font-semibold text-zinc-900">Promotion criteria</h4>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <Input
                label="Min aggregate %"
                type="number"
                min={0}
                max={100}
                value={form.promotionCriteria?.minAggregatePercentage ?? 40}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    promotionCriteria: {
                      ...prev.promotionCriteria,
                      minAggregatePercentage: Number(e.target.value),
                    },
                  }))
                }
              />
              <Input
                label="Max failing subjects"
                type="number"
                min={0}
                value={form.promotionCriteria?.maxFailingSubjects ?? 2}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    promotionCriteria: {
                      ...prev.promotionCriteria,
                      maxFailingSubjects: Number(e.target.value),
                    },
                  }))
                }
              />
              <Input
                label="Min attendance %"
                type="number"
                min={0}
                max={100}
                value={form.promotionCriteria?.minAttendancePercentage ?? 75}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    promotionCriteria: {
                      ...prev.promotionCriteria,
                      minAttendancePercentage: Number(e.target.value),
                    },
                  }))
                }
              />
            </div>
            <div className="mt-4">
              <Input
                label="Late threshold (minutes)"
                type="number"
                min={0}
                value={form.lateThresholdMinutes ?? 10}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, lateThresholdMinutes: Number(e.target.value) }))
                }
                className="md:w-1/3"
              />
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-medium text-zinc-900">Terms</h4>
              <Button type="button" variant="outline" size="sm" onClick={addTerm}>
                <Plus size={14} weight="bold" />
                Add term
              </Button>
            </div>
            <div className="space-y-3">
              {form.terms.map((term, idx) => (
                <div key={idx} className="grid grid-cols-1 gap-3 rounded-lg border border-zinc-100 bg-zinc-50/50 p-3 md:grid-cols-4">
                  <Input
                    label={idx === 0 ? 'Name' : ''}
                    value={term.name}
                    onChange={(e) => handleTermChange(idx, 'name', e.target.value)}
                    placeholder="Term 1"
                    className="md:col-span-1"
                  />
                  <Input
                    label={idx === 0 ? 'Start' : ''}
                    type="date"
                    value={term.startDate}
                    onChange={(e) => handleTermChange(idx, 'startDate', e.target.value)}
                    className="md:col-span-1"
                  />
                  <Input
                    label={idx === 0 ? 'End' : ''}
                    type="date"
                    value={term.endDate}
                    onChange={(e) => handleTermChange(idx, 'endDate', e.target.value)}
                    className="md:col-span-1"
                  />
                  <div className={idx === 0 ? 'flex items-end' : 'flex items-center'}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTerm(idx)}
                      className="text-danger-600 hover:bg-danger-50 hover:text-danger-700"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} isLoading={submitting}>
              {editing ? 'Update year' : 'Create year'}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};

const AcademicYearsSkeleton = () => (
  <div className="space-y-4">
    <div className="flex justify-end">
      <Skeleton className="h-10 w-28" />
    </div>
    <Card>
      <div className="space-y-3 p-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </Card>
  </div>
);

// ---------- Grading Scale Tab ----------

const defaultGradeRow = { grade: '', minPercent: '', maxPercent: '', points: '', remarks: '' };

const GradingScaleTab = ({ schoolId }) => {
  const params = useMemo(() => (schoolId ? { schoolId } : {}), [schoolId]);
  const { data, loading, error, refetch } = useFetch('/settings/grading-scale', { params });
  const [grades, setGrades] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.gradingScale?.grades) {
      setGrades(data.gradingScale.grades);
    }
  }, [data]);

  const updateGrade = (idx, field, value) => {
    setGrades((prev) => prev.map((g, i) => (i === idx ? { ...g, [field]: value } : g)));
  };

  const addGrade = () => {
    setGrades((prev) => [...prev, { ...defaultGradeRow }]);
  };

  const removeGrade = (idx) => {
    setGrades((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = grades.map((g) => ({
        ...g,
        minPercent: Number(g.minPercent),
        maxPercent: Number(g.maxPercent),
        points: Number(g.points) || 0,
      }));
      await api.put('/settings/grading-scale', { grades: payload }, { params });
      toast.success('Grading scale saved');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save grading scale');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <GradingScaleSkeleton />;
  }

  if (error) {
    return <ErrorAlert message={error} onRetry={refetch} />;
  }

  return (
    <motion.div variants={listVariants} initial="hidden" animate="visible" className="space-y-4">
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">Define grade ranges and grade points.</p>
        <Button onClick={addGrade} variant="outline">
          <Plus size={16} weight="bold" />
          Add grade
        </Button>
      </motion.div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                <th className="px-5 py-3">Grade</th>
                <th className="px-5 py-3 text-center">Min %</th>
                <th className="px-5 py-3 text-center">Max %</th>
                <th className="px-5 py-3 text-center">Points</th>
                <th className="px-5 py-3">Remarks</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {grades.map((g, idx) => (
                <tr key={idx} className="hover:bg-zinc-50/60">
                  <td className="px-5 py-2">
                    <input
                      type="text"
                      value={g.grade}
                      onChange={(e) => updateGrade(idx, 'grade', e.target.value)}
                      className="h-9 w-20 rounded-lg border border-zinc-200 px-2 text-center text-sm text-zinc-900 transition-colors focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/20"
                      placeholder="A+"
                    />
                  </td>
                  <td className="px-5 py-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={g.minPercent}
                      onChange={(e) => updateGrade(idx, 'minPercent', e.target.value)}
                      className="mx-auto block h-9 w-20 rounded-lg border border-zinc-200 px-2 text-center text-sm text-zinc-900 transition-colors focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/20"
                    />
                  </td>
                  <td className="px-5 py-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={g.maxPercent}
                      onChange={(e) => updateGrade(idx, 'maxPercent', e.target.value)}
                      className="mx-auto block h-9 w-20 rounded-lg border border-zinc-200 px-2 text-center text-sm text-zinc-900 transition-colors focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/20"
                    />
                  </td>
                  <td className="px-5 py-2">
                    <input
                      type="number"
                      min={0}
                      value={g.points}
                      onChange={(e) => updateGrade(idx, 'points', e.target.value)}
                      className="mx-auto block h-9 w-20 rounded-lg border border-zinc-200 px-2 text-center text-sm text-zinc-900 transition-colors focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/20"
                    />
                  </td>
                  <td className="px-5 py-2">
                    <input
                      type="text"
                      value={g.remarks || ''}
                      onChange={(e) => updateGrade(idx, 'remarks', e.target.value)}
                      className="h-9 w-full min-w-[140px] rounded-lg border border-zinc-200 px-3 text-sm text-zinc-900 transition-colors focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/20"
                      placeholder="Remarks"
                    />
                  </td>
                  <td className="px-5 py-2">
                    <div className="flex justify-end">
                      <button
                        onClick={() => removeGrade(idx)}
                        className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600"
                        aria-label="Remove grade"
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
      </Card>

      <motion.div variants={itemVariants} className="flex items-center gap-3 pt-2">
        <Button onClick={handleSave} isLoading={saving}>
          Save changes
        </Button>
      </motion.div>
    </motion.div>
  );
};

const GradingScaleSkeleton = () => (
  <Card>
    <div className="space-y-3 p-5">
      {Array.from({ length: 7 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  </Card>
);

// ---------- Notifications Tab ----------

const notificationItems = [
  { key: 'emailAnnouncements', label: 'Email announcements', desc: 'Receive school announcements via email' },
  { key: 'smsAlerts', label: 'SMS alerts', desc: 'Get urgent alerts as text messages' },
  { key: 'pushNotifications', label: 'Push notifications', desc: 'Browser push notifications for updates' },
  { key: 'feeReminders', label: 'Fee reminders', desc: 'Reminders before fee payment deadlines' },
  { key: 'attendanceAlerts', label: 'Attendance alerts', desc: 'Notifications for absent or low attendance' },
  { key: 'examResults', label: 'Exam results', desc: 'Get notified when exam results are published' },
];

const NotificationsTab = () => {
  const { data, loading, error, refetch } = useFetch('/settings/notifications');
  const [settings, setSettings] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.notifications) {
      setSettings(data.notifications);
    }
  }, [data]);

  const toggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/settings/notifications', settings);
      toast.success('Notification preferences saved');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save notification preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <NotificationsSkeleton />;
  }

  if (error) {
    return <ErrorAlert message={error} onRetry={refetch} />;
  }

  return (
    <motion.div variants={listVariants} initial="hidden" animate="visible" className="max-w-2xl">
      <Card>
        <div className="divide-y divide-zinc-100">
          {notificationItems.map((item) => {
            const enabled = !!settings[item.key];
            return (
              <motion.div
                key={item.key}
                variants={itemVariants}
                className="flex items-center justify-between px-5 py-4 first:pt-2 last:pb-2"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900">{item.label}</p>
                  <p className="text-xs text-zinc-500">{item.desc}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  onClick={() => toggle(item.key)}
                  className={`relative h-6 w-11 rounded-full transition-colors duration-180 ${
                    enabled ? 'bg-accent-600' : 'bg-zinc-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-180 ${
                      enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </motion.div>
            );
          })}
        </div>
      </Card>
      <motion.div variants={itemVariants} className="flex items-center gap-3 pt-5">
        <Button onClick={handleSave} isLoading={saving}>
          Save changes
        </Button>
      </motion.div>
    </motion.div>
  );
};

const NotificationsSkeleton = () => (
  <Card className="max-w-2xl">
    <div className="divide-y divide-zinc-100">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between px-5 py-4 first:pt-2 last:pb-2">
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-6 w-11 rounded-full" />
        </div>
      ))}
    </div>
  </Card>
);

// ---------- Communications Tab ----------

const CommunicationsTab = () => {
  const { data: status, loading, error, refetch } = useFetch('/communications/status');
  const [emailTo, setEmailTo] = useState('');
  const [smsTo, setSmsTo] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingSMS, setTestingSMS] = useState(false);

  const handleTestEmail = async (e) => {
    e.preventDefault();
    setTestingEmail(true);
    try {
      await api.post('/communications/test-email', { to: emailTo.trim() });
      toast.success(`Test email sent to ${emailTo.trim()}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send test email');
    } finally {
      setTestingEmail(false);
    }
  };

  const handleTestSMS = async (e) => {
    e.preventDefault();
    setTestingSMS(true);
    try {
      await api.post('/communications/test-sms', { to: smsTo.trim() });
      toast.success(`Test SMS sent to ${smsTo.trim()}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send test SMS');
    } finally {
      setTestingSMS(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error) {
    return <ErrorAlert message={error} onRetry={refetch} />;
  }

  const emailEnabled = status?.email?.enabled;
  const smsEnabled = status?.sms?.enabled;

  return (
    <motion.div variants={listVariants} initial="hidden" animate="visible" className="max-w-2xl space-y-6">
      <motion.div variants={itemVariants}>
        <Card>
          <div className="space-y-4 p-5">
            <h3 className="text-sm font-semibold text-zinc-900">Configuration status</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className={`rounded-lg border p-3 ${emailEnabled ? 'border-emerald-200 bg-emerald-50' : 'border-zinc-200 bg-zinc-50'}`}>
                <div className="flex items-center gap-2">
                  <Envelope size={18} className={emailEnabled ? 'text-emerald-600' : 'text-zinc-400'} />
                  <span className="text-sm font-medium text-zinc-900">Email</span>
                </div>
                <p className={`mt-1 text-xs ${emailEnabled ? 'text-emerald-700' : 'text-zinc-500'}`}>
                  {emailEnabled ? 'Configured and ready' : 'Not configured on server'}
                </p>
              </div>
              <div className={`rounded-lg border p-3 ${smsEnabled ? 'border-emerald-200 bg-emerald-50' : 'border-zinc-200 bg-zinc-50'}`}>
                <div className="flex items-center gap-2">
                  <ChatText size={18} className={smsEnabled ? 'text-emerald-600' : 'text-zinc-400'} />
                  <span className="text-sm font-medium text-zinc-900">SMS</span>
                </div>
                <p className={`mt-1 text-xs ${smsEnabled ? 'text-emerald-700' : 'text-zinc-500'}`}>
                  {smsEnabled ? 'Configured and ready' : 'Not configured on server'}
                </p>
              </div>
            </div>
            {(!emailEnabled || !smsEnabled) && (
              <p className="text-xs text-zinc-500">
                Add the required environment variables to the server <code className="rounded bg-zinc-100 px-1 py-0.5">.env</code> file and restart the server.
              </p>
            )}
          </div>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card>
          <form onSubmit={handleTestEmail} className="space-y-4 p-5">
            <h3 className="text-sm font-semibold text-zinc-900">Send test email</h3>
            <Input
              type="email"
              placeholder="recipient@example.com"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              required
            />
            <Button type="submit" isLoading={testingEmail} disabled={testingEmail || !emailTo.trim()}>
              <Envelope size={16} />
              Send test email
            </Button>
          </form>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card>
          <form onSubmit={handleTestSMS} className="space-y-4 p-5">
            <h3 className="text-sm font-semibold text-zinc-900">Send test SMS</h3>
            <Input
              type="tel"
              placeholder="+254712345678"
              value={smsTo}
              onChange={(e) => setSmsTo(e.target.value)}
              required
            />
            <Button type="submit" isLoading={testingSMS} disabled={testingSMS || !smsTo.trim()}>
              <ChatText size={16} />
              Send test SMS
            </Button>
          </form>
        </Card>
      </motion.div>
    </motion.div>
  );
};

// ---------- Shared Error Alert ----------

const ErrorAlert = ({ message, onRetry }) => (
  <div className="rounded-xl border border-red-200 bg-red-50 p-5">
    <div className="flex items-start gap-3">
      <Warning size={20} className="mt-0.5 text-red-600" />
      <div className="flex-1">
        <p className="text-sm font-medium text-red-800">Failed to load settings</p>
        <p className="text-xs text-red-700">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  </div>
);

// ---------- Main Settings Page ----------

const tabContent = {
  school: SchoolInfoTab,
  academic: AcademicYearsTab,
  grading: GradingScaleTab,
  notifications: NotificationsTab,
  communications: CommunicationsTab,
  sessions: Sessions,
};

const Settings = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const [activeTab, setActiveTab] = useState('school');
  const ActiveComponent = tabContent[activeTab];

  const { data: schoolsResponse } = useFetch(isSuperAdmin ? '/schools?limit=100' : null);
  const schools = useMemo(() => {
    if (!schoolsResponse) return [];
    return Array.isArray(schoolsResponse) ? schoolsResponse : schoolsResponse.items || [];
  }, [schoolsResponse]);

  const [selectedSchoolId, setSelectedSchoolId] = useState('');

  useEffect(() => {
    if (!isSuperAdmin) {
      setSelectedSchoolId('');
      return;
    }
    if (schools.length > 0 && !selectedSchoolId) {
      setSelectedSchoolId(schools[0].id);
    }
  }, [isSuperAdmin, schools, selectedSchoolId]);

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl">Settings</h1>
          <p className="mt-1 text-sm text-zinc-500">Configure school profile, academic calendar, grading and notifications.</p>
        </div>
        {isSuperAdmin && (
          <div className="min-w-[16rem]">
            <Select
              label="School"
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              options={[
                { value: '', label: 'Select a school' },
                ...schools.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          </div>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="flex overflow-x-auto border-b border-zinc-100">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-5 py-4 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-accent-600 text-accent-700'
                    : 'border-transparent text-zinc-500 hover:text-zinc-700'
                }`}
              >
                <Icon size={18} weight={isActive ? 'fill' : 'regular'} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-5 sm:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            >
              <ActiveComponent schoolId={selectedSchoolId} />
            </motion.div>
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  );
};

export default Settings;
