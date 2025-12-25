import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  Chalkboard,
  Clock,
  Gauge,
  Stack,
  User,
  Warning,
} from '@phosphor-icons/react';
import useFetch from '../../hooks/useFetch';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

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

const StatCard = ({ icon: Icon, label, value, helper, accent = 'accent' }) => {
  const accentClasses = {
    accent: 'bg-accent-subtle text-accent-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
  };

  return (
    <Card className="h-full">
      <CardContent className="flex items-start gap-4 p-5">
        <div
          className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${accentClasses[accent]}`}
        >
          <Icon size={22} weight="duotone" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">{value}</p>
          {helper && <p className="mt-1 text-xs text-zinc-500">{helper}</p>}
        </div>
      </CardContent>
    </Card>
  );
};

const TeacherWorkload = () => {
  const { id } = useParams();
  const shouldReduceMotion = useReducedMotion();
  const [academicYear, setAcademicYear] = useState('');

  const { data: academicYears = [] } = useFetch('/academic-years');

  const workloadUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (academicYear) params.append('academicYear', academicYear);
    return params.toString()
      ? `/teachers/${id}/workload?${params.toString()}`
      : `/teachers/${id}/workload`;
  }, [id, academicYear]);

  const timetableUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (academicYear) params.append('academicYear', academicYear);
    return params.toString()
      ? `/timetables/teacher/${id}?${params.toString()}`
      : `/timetables/teacher/${id}`;
  }, [id, academicYear]);

  const {
    data: workloadData,
    loading: workloadLoading,
    error: workloadError,
  } = useFetch(workloadUrl);

  const {
    data: timetableData,
    loading: timetableLoading,
    error: timetableError,
  } = useFetch(timetableUrl);

  const workload = workloadData?.workload || workloadData || {};
  const assignments = useMemo(() => workload.assignments || [], [workload]);
  const classTeacherOf = useMemo(() => workload.classTeacherOf || [], [workload]);
  const totalPeriods = workload.totalPeriods ?? 0;
  const totalClassesAsClassTeacher = workload.totalClassesAsClassTeacher ?? classTeacherOf.length;

  const entries = useMemo(() => {
    if (!timetableData) return [];
    return Array.isArray(timetableData) ? timetableData : timetableData.items || timetableData.timetable || [];
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

  const academicYearOptions = useMemo(() => {
    const list = Array.isArray(academicYears) ? academicYears : academicYears.items || [];
    return list
      .map((y) => ({ value: y._id || y.id, label: y.name }))
      .sort((a, b) => b.label.localeCompare(a.label));
  }, [academicYears]);

  const teacherName = useMemo(() => {
    if (!entries.length) return 'Teacher';
    const first = entries[0]?.teacher;
    if (!first) return 'Teacher';
    return [first.firstName, first.lastName].filter(Boolean).join(' ') || 'Teacher';
  }, [entries]);

  const isLoading = workloadLoading || timetableLoading;
  const hasError = workloadError || timetableError;

  const wrapperProps = shouldReduceMotion
    ? {}
    : { variants: containerVariants, initial: 'hidden', animate: 'visible' };
  const itemProps = shouldReduceMotion ? {} : { variants: itemVariants };

  return (
    <motion.div className="space-y-6" {...wrapperProps}>
      <motion.div
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        {...itemProps}
      >
        <div className="flex items-start gap-4">
          <Button variant="outline" size="icon" as={Link} to={`/teachers/${id}`} aria-label="Back">
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Workload</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {teacherName !== 'Teacher' ? teacherName : 'Teacher'} schedule and assignments
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div {...itemProps}>
        <Card className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="min-w-[14rem] flex-1">
              <Select
                label="Academic year"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                options={academicYearOptions}
                placeholder="All academic years"
                startIcon={<Calendar size={18} />}
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Clock size={16} />
              <span>Current load: {totalPeriods} period{totalPeriods === 1 ? '' : 's'}/week</span>
            </div>
          </div>
        </Card>
      </motion.div>

      {hasError && !isLoading && (
        <motion.div
          {...itemProps}
          className="rounded-lg border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700"
        >
          <div className="flex items-center gap-2">
            <Warning size={18} weight="fill" />
            <span>{workloadError || timetableError}</span>
          </div>
        </motion.div>
      )}

      <motion.div
        {...itemProps}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          icon={Gauge}
          label="Total periods"
          value={isLoading ? <Skeleton className="h-8 w-16" /> : totalPeriods}
          helper="Scheduled teaching periods per week"
          accent="accent"
        />
        <StatCard
          icon={Stack}
          label="Subject assignments"
          value={isLoading ? <Skeleton className="h-8 w-16" /> : assignments.length}
          helper="Unique class-subject combinations"
          accent="emerald"
        />
        <StatCard
          icon={Chalkboard}
          label="Classes as class teacher"
          value={isLoading ? <Skeleton className="h-8 w-16" /> : totalClassesAsClassTeacher}
          helper="Sections assigned as class teacher"
          accent="amber"
        />
        <StatCard
          icon={User}
          label="Timetable entries"
          value={isLoading ? <Skeleton className="h-8 w-16" /> : entries.length}
          helper="Total scheduled slots"
          accent="blue"
        />
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <motion.div {...itemProps} className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : assignments.length === 0 ? (
                <EmptyState
                  icon={Stack}
                  title="No assignments"
                  description="This teacher does not have any class-subject assignments for the selected period."
                />
              ) : (
                <div className="space-y-3">
                  {assignments.map((assignment, idx) => (
                    <motion.div
                      key={`${assignment.class?._id || idx}-${assignment.sectionId || idx}-${assignment.subject?._id || idx}`}
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.2,
                        ease: [0.23, 1, 0.32, 1],
                        delay: shouldReduceMotion ? 0 : idx * 0.04,
                      }}
                      className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/50 p-3 transition-colors hover:border-zinc-200"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-900">
                          {assignment.subject?.name || 'Subject'}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {assignment.class?.name || 'Class'}
                          {assignment.sectionName ? ` · ${assignment.sectionName}` : assignment.sectionId ? ` · Section` : ''}
                        </p>
                      </div>
                      <Badge variant="info">{assignment.periods} period{assignment.periods === 1 ? '' : 's'}</Badge>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...itemProps} className="lg:col-span-2">
          <Card className="h-full overflow-hidden">
            <CardHeader>
              <CardTitle>Weekly timetable</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-4 p-5">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-64 w-full" />
                </div>
              ) : timetableError ? (
                <div className="p-8 text-center text-sm text-danger-700">{timetableError}</div>
              ) : entries.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    icon={Clock}
                    title="No timetable entries"
                    description={
                      academicYear
                        ? 'No scheduled periods found for the selected academic year.'
                        : 'Select an academic year to view the teacher timetable.'
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
                            <div className="font-semibold text-zinc-900">
                              Period {period.periodNumber}
                            </div>
                            <div className="mt-0.5 text-xs text-zinc-500">
                              {formatTime(period.startTime)} - {formatTime(period.endTime)}
                            </div>
                          </td>
                          {Array.from({ length: 7 }).map((_, dayIndex) => {
                            const entry = grid[period.periodNumber]?.[dayIndex];
                            return (
                              <td key={dayIndex} className="px-2 py-2 align-top">
                                {entry ? (
                                  <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-2.5 transition-colors hover:border-emerald-200 hover:bg-emerald-50">
                                    <div className="font-medium text-emerald-900">
                                      {entry.subject?.name || 'Subject'}
                                    </div>
                                    <div className="mt-0.5 text-xs text-emerald-700">
                                      {entry.class?.name || 'Class'}
                                      {entry.sectionName ? ` · ${entry.sectionName}` : ''}
                                    </div>
                                    {entry.roomNumber && (
                                      <div className="mt-1 text-[10px] uppercase tracking-wide text-emerald-600">
                                        Room {entry.roomNumber}
                                      </div>
                                    )}
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
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {classTeacherOf.length > 0 && !isLoading && (
        <motion.div {...itemProps}>
          <Card>
            <CardHeader>
              <CardTitle>Class teacher of</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {classTeacherOf.map((section) => (
                  <span
                    key={section._id || `${section.classId}-${section.sectionName}`}
                    className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-700"
                  >
                    {section.className} {section.sectionName && `· ${section.sectionName}`}
                    {section.roomNumber && (
                      <span className="ml-2 text-xs text-zinc-500">(Room {section.roomNumber})</span>
                    )}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};

export default TeacherWorkload;
