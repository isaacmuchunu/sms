import React, { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Clock,
  Calendar,
  Plus,
  Wrench,
  Trash,
  Warning,
} from '@phosphor-icons/react';
import useFetch from '../../hooks/useFetch';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Card from '../../components/ui/Card';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.23, 1, 0.32, 1] } },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const formatTime = (time) => {
  if (!time) return '-';
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${minutes} ${ampm}`;
};

const Timetable = () => {
  const shouldReduceMotion = useReducedMotion();
  const [academicYear, setAcademicYear] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [generating, setGenerating] = useState(false);
  const [deleteEntry, setDeleteEntry] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { data: academicYears = [] } = useFetch('/academic-years');
  const { data: classes = [], loading: classesLoading } = useFetch('/classes');

  const classOptions = useMemo(() => {
    const list = Array.isArray(classes) ? classes : classes?.items || [];
    return list
      .filter((c) => c.status !== 'inactive')
      .map((c) => ({ value: c._id || c.id, label: c.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [classes]);

  const sectionOptions = useMemo(() => {
    if (!selectedClass) return [];
    const list = Array.isArray(classes) ? classes : classes?.items || [];
    const cls = list.find((c) => (c._id || c.id) === selectedClass);
    if (!cls || !Array.isArray(cls.sections)) return [];
    return cls.sections
      .filter((s) => s.status !== 'inactive')
      .map((s) => ({ value: s._id || s.id, label: s.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [selectedClass, classes]);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (academicYear) params.append('academicYear', academicYear);
    if (selectedClass) params.append('class', selectedClass);
    if (selectedSection) params.append('section', selectedSection);
    return params.toString();
  }, [academicYear, selectedClass, selectedSection]);

  const {
    data: timetableData,
    loading,
    error,
    refetch,
  } = useFetch(queryParams ? `/timetables?${queryParams}` : '/timetables');

  const entries = useMemo(() => {
    if (!timetableData) return [];
    return Array.isArray(timetableData) ? timetableData : timetableData.items || [];
  }, [timetableData]);

  const periods = useMemo(() => {
    const map = new Map();
    entries.forEach((entry) => {
      const key = entry.periodNumber;
      if (!map.has(key)) {
        map.set(key, {
          periodNumber: key,
          startTime: entry.startTime,
          endTime: entry.endTime,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.periodNumber - b.periodNumber);
  }, [entries]);

  const grid = useMemo(() => {
    const matrix = {};
    periods.forEach((p) => {
      matrix[p.periodNumber] = Array(7).fill(null);
    });
    entries.forEach((entry) => {
      if (matrix[entry.periodNumber]) {
        matrix[entry.periodNumber][entry.dayOfWeek] = entry;
      }
    });
    return matrix;
  }, [entries, periods]);

  const handleGenerate = async () => {
    if (!academicYear) {
      toast.error('Please select an academic year');
      return;
    }
    setGenerating(true);
    try {
      const payload = { academicYear };
      if (selectedClass) payload.classId = selectedClass;
      if (selectedSection) payload.sectionId = selectedSection;
      await api.post('/timetables/generate', payload);
      toast.success('Timetable generated successfully');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate timetable');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteEntry) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/timetables/${deleteEntry.id}`);
      toast.success('Timetable entry deleted');
      setDeleteEntry(null);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete entry');
    } finally {
      setDeleteLoading(false);
    }
  };

  const wrapperProps = shouldReduceMotion
    ? {}
    : { variants: containerVariants, initial: 'hidden', animate: 'visible' };
  const itemProps = shouldReduceMotion ? {} : { variants: itemVariants };

  const academicYearOptions = useMemo(() => {
    const list = Array.isArray(academicYears) ? academicYears : academicYears.items || [];
    return list
      .map((y) => ({ value: y._id || y.id, label: y.name }))
      .sort((a, b) => b.label.localeCompare(a.label));
  }, [academicYears]);

  return (
    <motion.div className="space-y-6" {...wrapperProps}>
      <motion.div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" {...itemProps}>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Timetable</h1>
          <p className="mt-1 text-sm text-zinc-500">View and generate class schedules.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleGenerate} isLoading={generating}>
            <Wrench size={18} weight="bold" className="mr-1.5" />
            Generate
          </Button>
          <Button onClick={() => toast('Manual entry coming soon')}>
            <Plus size={18} weight="bold" className="mr-1.5" />
            Add entry
          </Button>
        </div>
      </motion.div>

      <motion.div {...itemProps}>
        <Card>
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end">
            <div className="min-w-[12rem] flex-1">
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">Academic year</label>
              <Select
                value={academicYear}
                onChange={(e) => {
                  setAcademicYear(e.target.value);
                  setSelectedClass('');
                  setSelectedSection('');
                }}
                options={academicYearOptions}
                placeholder="Select academic year"
                startIcon={<Calendar size={18} />}
              />
            </div>
            <div className="min-w-[12rem] flex-1">
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">Class</label>
              <Select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedSection('');
                }}
                options={classOptions}
                placeholder="All classes"
                disabled={classesLoading}
              />
            </div>
            <div className="min-w-[12rem] flex-1">
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">Section</label>
              <Select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                options={sectionOptions}
                placeholder="All sections"
                disabled={!selectedClass}
              />
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div {...itemProps}>
        <Card className="overflow-hidden">
          {loading ? (
            <div className="space-y-4 p-5">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-100 text-danger-600">
                <Warning size={24} weight="fill" />
              </div>
              <p className="text-sm text-danger-700">{error}</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Clock}
                title="No timetable entries"
                description={
                  academicYear
                    ? 'Select filters and generate a timetable to get started.'
                    : 'Select an academic year to view or generate the timetable.'
                }
                action={
                  academicYear ? (
                    <Button onClick={handleGenerate} isLoading={generating}>
                      <Wrench size={18} weight="bold" className="mr-1.5" />
                      Generate timetable
                    </Button>
                  ) : null
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/60">
                    <th className="w-24 px-3 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Period
                    </th>
                    {DAYS.map((day) => (
                      <th
                        key={day}
                        className="min-w-[140px] px-3 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500"
                      >
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {periods.map((period) => (
                    <tr key={period.periodNumber}>
                      <td className="border-r border-zinc-100 bg-zinc-50/40 px-3 py-3 align-top">
                        <div className="font-semibold text-zinc-900">Period {period.periodNumber}</div>
                        <div className="mt-0.5 text-xs text-zinc-500">
                          {formatTime(period.startTime)} - {formatTime(period.endTime)}
                        </div>
                      </td>
                      {Array.from({ length: 7 }).map((_, dayIndex) => {
                        const entry = grid[period.periodNumber]?.[dayIndex];
                        return (
                          <td key={dayIndex} className="px-2 py-2 align-top">
                            {entry ? (
                              <div className="group relative rounded-lg border border-emerald-100 bg-emerald-50/60 p-2.5 transition-colors hover:border-emerald-200 hover:bg-emerald-50">
                                <div className="font-medium text-emerald-900">
                                  {entry.subject?.name || 'Subject'}
                                </div>
                                <div className="mt-0.5 text-xs text-emerald-700">
                                  {entry.teacher
                                    ? `${entry.teacher.firstName} ${entry.teacher.lastName}`
                                    : 'No teacher'}
                                </div>
                                <div className="mt-1 text-[10px] uppercase tracking-wide text-emerald-600">
                                  {entry.sectionName || 'Section'}
                                </div>
                                <button
                                  onClick={() => setDeleteEntry(entry)}
                                  className="absolute right-1.5 top-1.5 rounded p-1 text-emerald-600 opacity-0 transition-opacity hover:bg-emerald-100 group-hover:opacity-100"
                                  title="Delete entry"
                                >
                                  <Trash size={14} />
                                </button>
                              </div>
                            ) : (
                              <div className="h-full min-h-[80px] rounded-lg border border-dashed border-zinc-200 bg-zinc-50/30" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </motion.div>

      <Modal
        isOpen={!!deleteEntry}
        onClose={() => setDeleteEntry(null)}
        title="Delete timetable entry"
        description="This will remove the selected session from the timetable."
        size="sm"
      >
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => setDeleteEntry(null)} disabled={deleteLoading}>
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

export default Timetable;
