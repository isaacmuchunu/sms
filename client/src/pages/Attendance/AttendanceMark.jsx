import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  CalendarBlank,
  CheckCircle,
  FloppyDisk,
  Users,
  Student,
  Warning,
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import useFetch from '../../hooks/useFetch';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

const STATUS_CONFIG = {
  Present: {
    label: 'P',
    display: 'Present',
    variant: 'success',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  Absent: {
    label: 'A',
    display: 'Absent',
    variant: 'danger',
    chip: 'bg-red-50 text-red-700 border-red-200',
  },
  Late: {
    label: 'L',
    display: 'Late',
    variant: 'warning',
    chip: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  HalfDay: {
    label: 'H',
    display: 'Half Day',
    variant: 'info',
    chip: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  OnLeave: {
    label: 'O',
    display: 'On Leave',
    variant: 'neutral',
    chip: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  },
};

const STATUS_ORDER = ['Present', 'Absent', 'Late', 'HalfDay', 'OnLeave'];

const STATUS_TO_API = {
  Present: 'present',
  Absent: 'absent',
  Late: 'late',
  HalfDay: 'half_day',
  OnLeave: 'on_leave',
};

const API_TO_STATUS = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  half_day: 'HalfDay',
  on_leave: 'OnLeave',
};

const getFullName = (student) =>
  student?.fullName ||
  [student?.firstName, student?.lastName].filter(Boolean).join(' ') ||
  'Unnamed';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

const AttendanceMark = () => {
  const shouldReduceMotion = useReducedMotion();
  const { data: classes = [], loading: classesLoading } = useFetch('/classes');

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const classOptions = useMemo(() => {
    return (classes || []).map((cls) => ({
      value: cls._id,
      label: cls.name,
    }));
  }, [classes]);

  const selectedClass = useMemo(
    () => (classes || []).find((c) => c._id === selectedClassId),
    [classes, selectedClassId]
  );

  const sectionOptions = useMemo(() => {
    if (!selectedClass?.sections) return [];
    return selectedClass.sections
      .filter((s) => s.status !== 'inactive')
      .map((s) => ({
        value: s._id,
        label: s.name,
      }));
  }, [selectedClass]);

  const subjectOptions = useMemo(() => {
    const base = [{ value: '', label: 'Daily attendance (all subjects)' }];
    if (!selectedClass?.subjects) return base;
    const active = selectedClass.subjects
      .filter((s) => s.status !== 'inactive')
      .map((s) => ({
        value: s._id,
        label: s.name,
      }));
    return [...base, ...active];
  }, [selectedClass]);

  // Reset section and subject when class changes
  useEffect(() => {
    setSelectedSectionId('');
    setSelectedSubjectId('');
    setStudents([]);
    setLoadError('');
  }, [selectedClassId]);

  // Load students + existing attendance when filters are complete
  useEffect(() => {
    const loadAttendance = async () => {
      if (!selectedClassId || !selectedSectionId || !selectedDate) {
        setStudents([]);
        return;
      }

      setLoadingStudents(true);
      setLoadError('');

      try {
        const type = selectedSubjectId ? 'subject' : 'daily';
        const params = { type };
        if (type === 'subject') params.subjectId = selectedSubjectId;

        const res = await api.get(
          `/attendance/date/${selectedDate}/class/${selectedClassId}/section/${selectedSectionId}`,
          { params }
        );
        const payload = res.data.data || {};
        const studentAttendance = payload.attendance || [];

        const mapped = studentAttendance.map((item) => {
          const existing = item.attendance;
          return {
            _id: item.student._id,
            fullName: getFullName(item.student),
            rollNo: item.student.rollNo,
            status: existing ? API_TO_STATUS[existing.status] || 'Present' : 'Present',
            attendanceId: existing ? existing._id : null,
            originalStatus: existing ? API_TO_STATUS[existing.status] : null,
          };
        });

        setStudents(mapped);
        setIsEditMode(studentAttendance.some((item) => item.attendance !== null));
      } catch (err) {
        const message = err.response?.data?.message || 'Failed to load attendance data';
        setLoadError(message);
        toast.error(message);
        setStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    };

    loadAttendance();
  }, [selectedClassId, selectedSectionId, selectedDate, selectedSubjectId]);

  const updateStatus = (id, status) => {
    setStudents((prev) => prev.map((s) => (s._id === id ? { ...s, status } : s)));
  };

  const markAllPresent = () => {
    setStudents((prev) => prev.map((s) => ({ ...s, status: 'Present' })));
    toast.success('All students marked present');
  };

  const handleSave = async () => {
    if (!selectedClassId || !selectedSectionId || students.length === 0) return;

    setSaving(true);
    const type = selectedSubjectId ? 'subject' : 'daily';

    try {
      if (isEditMode) {
        // Update or create individual records
        await Promise.all(
          students.map(async (s) => {
            if (s.attendanceId) {
              await api.put(`/attendance/${s.attendanceId}`, {
                status: STATUS_TO_API[s.status],
              });
            } else {
              await api.post('/attendance/mark', {
                studentId: s._id,
                classId: selectedClassId,
                sectionId: selectedSectionId,
                date: selectedDate,
                status: STATUS_TO_API[s.status],
                type,
                ...(type === 'subject' ? { subjectId: selectedSubjectId } : {}),
              });
            }
          })
        );
        toast.success('Attendance updated successfully');
      } else {
        await api.post('/attendance/bulk-mark', {
          classId: selectedClassId,
          sectionId: selectedSectionId,
          date: selectedDate,
          type,
          ...(type === 'subject' ? { subjectId: selectedSubjectId } : {}),
          records: students.map((s) => ({
            studentId: s._id,
            status: STATUS_TO_API[s.status],
            remarks: '',
          })),
        });
        toast.success('Attendance saved successfully');
        setIsEditMode(true);
      }

      // Refresh attendance IDs after a successful save
      const refreshType = selectedSubjectId ? 'subject' : 'daily';
      const refreshParams = { type: refreshType };
      if (refreshType === 'subject') refreshParams.subjectId = selectedSubjectId;

      const res = await api.get(
        `/attendance/date/${selectedDate}/class/${selectedClassId}/section/${selectedSectionId}`,
        { params: refreshParams }
      );
      const payload = res.data.data || {};
      const refreshed = (payload.attendance || []).map((item) => ({
        _id: item.student._id,
        fullName: getFullName(item.student),
        rollNo: item.student.rollNo,
        status: item.attendance ? API_TO_STATUS[item.attendance.status] : 'Present',
        attendanceId: item.attendance ? item.attendance._id : null,
        originalStatus: item.attendance ? API_TO_STATUS[item.attendance.status] : null,
      }));
      setStudents(refreshed);
      setIsEditMode(refreshed.some((s) => s.attendanceId));
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to save attendance';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const summary = useMemo(() => {
    return {
      total: students.length,
      Present: students.filter((s) => s.status === 'Present').length,
      Absent: students.filter((s) => s.status === 'Absent').length,
      Late: students.filter((s) => s.status === 'Late').length,
      HalfDay: students.filter((s) => s.status === 'HalfDay').length,
      OnLeave: students.filter((s) => s.status === 'OnLeave').length,
    };
  }, [students]);

  const presentCount = summary.Present;
  const absentCount = summary.Absent;

  const canShowTable = selectedClassId && selectedSectionId;
  const hasStudents = students.length > 0;

  const motionProps = shouldReduceMotion
    ? {}
    : { variants: containerVariants, initial: 'hidden', animate: 'visible' };
  const itemMotionProps = shouldReduceMotion ? {} : { variants: itemVariants };

  return (
    <motion.div className="space-y-6" {...motionProps}>
      {/* Header */}
      <motion.div {...itemMotionProps}>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Mark attendance</h1>
        <p className="mt-1 text-sm text-zinc-500">Record daily or subject-wise attendance for a class section.</p>
      </motion.div>

      {/* Filters */}
      <motion.div {...itemMotionProps}>
        <Card>
          <div className="p-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <Select
                label="Class"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                disabled={classesLoading}
                placeholder="Select class"
                options={classOptions}
              />
              <Select
                label="Section"
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                disabled={!selectedClassId || sectionOptions.length === 0}
                placeholder="Select section"
                options={sectionOptions}
              />
              <Input
                type="date"
                label="Date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              <Select
                label="Subject (optional)"
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                disabled={!selectedClassId}
                options={subjectOptions}
              />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Summary */}
      {canShowTable && (
        <motion.div {...itemMotionProps}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {STATUS_ORDER.map((status) => {
              const count = summary[status] || 0;
              const config = STATUS_CONFIG[status];
              return (
                <Card key={status} className="p-4">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold ${config.chip}`}>
                      {config.label}
                    </span>
                    <div>
                      <p className="text-xs text-zinc-500">{config.display}</p>
                      <p className="text-lg font-semibold text-zinc-900">{count}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Table */}
      {canShowTable && (
        <motion.div {...itemMotionProps}>
          <Card className="overflow-hidden">
            {loadingStudents ? (
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-9 w-28" />
                </div>
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-12" />
                      <Skeleton className="h-10 flex-1" />
                      <Skeleton className="h-10 w-28" />
                      <Skeleton className="h-10 w-48" />
                    </div>
                  ))}
                </div>
              </div>
            ) : loadError ? (
              <div className="p-8">
                <EmptyState
                  title="Could not load attendance"
                  description={loadError}
                  icon={Warning}
                />
              </div>
            ) : !hasStudents ? (
              <div className="p-8">
                <EmptyState
                  title="No students found"
                  description="There are no active students in the selected class section."
                  icon={Student}
                />
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-4 border-b border-zinc-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <Users size={18} />
                    <span>
                      {summary.total} student{summary.total !== 1 ? 's' : ''} ·{' '}
                      <span className="font-medium text-emerald-600">{presentCount} present</span> ·{' '}
                      <span className="font-medium text-red-600">{absentCount} absent</span>
                    </span>
                  </div>
                  <Button variant="outline" size="sm" onClick={markAllPresent}>
                    <CheckCircle size={16} weight="bold" />
                    Mark all present
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-100 bg-zinc-50/60">
                        <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Roll no</th>
                        <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Name</th>
                        <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">Status</th>
                        <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {students.map((student) => (
                        <tr key={student._id} className="hover:bg-zinc-50/60 transition-colors">
                          <td className="px-5 py-3 font-medium text-zinc-900 tabular-nums">{student.rollNo || '—'}</td>
                          <td className="px-5 py-3 text-zinc-700">{student.fullName}</td>
                          <td className="px-5 py-3 text-center">
                            <Badge variant={STATUS_CONFIG[student.status].variant}>
                              {STATUS_CONFIG[student.status].display}
                            </Badge>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              {STATUS_ORDER.map((status) => {
                                const active = student.status === status;
                                return (
                                  <button
                                    key={status}
                                    type="button"
                                    onClick={() => updateStatus(student._id, status)}
                                    title={STATUS_CONFIG[status].display}
                                    aria-label={`Mark ${student.fullName} as ${STATUS_CONFIG[status].display}`}
                                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold transition-all duration-120 ease-out-strong active:scale-[0.97] ${
                                      active
                                        ? `${STATUS_CONFIG[status].chip} ring-2 ring-zinc-300 ring-offset-1`
                                        : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                                    }`}
                                  >
                                    {STATUS_CONFIG[status].label}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>
        </motion.div>
      )}

      {/* Empty prompt before filters selected */}
      {!canShowTable && (
        <motion.div {...itemMotionProps}>
          <Card className="p-8">
            <EmptyState
              title="Select a class and section"
              description="Choose a class, section, and date to start marking attendance."
              icon={CalendarBlank}
            />
          </Card>
        </motion.div>
      )}

      {/* Footer actions */}
      {canShowTable && hasStudents && !loadingStudents && (
        <motion.div {...itemMotionProps} className="flex items-center justify-between">
          <div className="text-sm text-zinc-500">
            {isEditMode ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Editing existing attendance
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                New attendance entry
              </span>
            )}
          </div>
          <Button onClick={handleSave} disabled={saving} isLoading={saving}>
            <FloppyDisk size={18} weight="bold" />
            {saving ? 'Saving…' : isEditMode ? 'Update attendance' : 'Save attendance'}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default AttendanceMark;
