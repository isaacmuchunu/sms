import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  CalendarBlank,
  DownloadSimple,
  MagnifyingGlass,
  Student,
  TrendUp,
  Warning,
  Users,
  CaretRight,
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import useFetch from '../../hooks/useFetch';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

const MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const YEARS = Array.from({ length: 5 }, (_, i) => {
  const year = new Date().getFullYear() - i;
  return { value: String(year), label: String(year) };
});

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

const AttendanceReport = () => {
  const shouldReduceMotion = useReducedMotion();
  const { data: classes = [], loading: classesLoading } = useFetch('/classes');

  const today = new Date();
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(String(today.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(today.getFullYear()));
  const [searchTerm, setSearchTerm] = useState('');

  const [report, setReport] = useState([]);
  const [classAverage, setClassAverage] = useState('0.00');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  useEffect(() => {
    setSelectedSectionId('');
    setReport([]);
  }, [selectedClassId]);

  useEffect(() => {
    const loadReport = async () => {
      if (!selectedClassId || !selectedMonth || !selectedYear) {
        setReport([]);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const params = {
          classId: selectedClassId,
          month: Number(selectedMonth),
          year: Number(selectedYear),
        };
        if (selectedSectionId) params.sectionId = selectedSectionId;

        const res = await api.get('/attendance/monthly-report', { params });
        const data = res.data.data || {};
        setReport(data.report || []);
        setClassAverage(data.classAverage || '0.00');
      } catch (err) {
        const message = err.response?.data?.message || 'Failed to load attendance report';
        setError(message);
        toast.error(message);
        setReport([]);
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [selectedClassId, selectedSectionId, selectedMonth, selectedYear]);

  const filteredReport = useMemo(() => {
    if (!searchTerm) return report;
    const lower = searchTerm.toLowerCase();
    return report.filter((item) => getFullName(item.student).toLowerCase().includes(lower));
  }, [report, searchTerm]);

  const totalStudents = filteredReport.length;
  const avgAttendance = totalStudents > 0
    ? (
        filteredReport.reduce((sum, item) => sum + Number(item.attendance?.percentage || 0), 0) /
        totalStudents
      ).toFixed(1)
    : '0.0';
  const defaulters = filteredReport.filter((item) => Number(item.attendance?.percentage || 0) < 75).length;
  const mostAbsent = useMemo(() => {
    if (filteredReport.length === 0) return null;
    return [...filteredReport].sort(
      (a, b) => Number(b.attendance?.absent || 0) - Number(a.attendance?.absent || 0)
    )[0];
  }, [filteredReport]);

  const exportCSV = () => {
    if (filteredReport.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Roll No', 'Name', 'Total Days', 'Present', 'Absent', 'Late', 'Half Day', 'On Leave', 'Percentage'];
    const rows = filteredReport.map((item) => [
      item.student?.rollNo || '',
      getFullName(item.student),
      item.attendance?.total || 0,
      item.attendance?.present || 0,
      item.attendance?.absent || 0,
      item.attendance?.late || 0,
      item.attendance?.halfDay || 0,
      item.attendance?.onLeave || 0,
      `${item.attendance?.percentage || 0}%`,
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-report-${selectedMonth}-${selectedYear}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Report exported as CSV');
  };

  const getProgressColor = (percentage) => {
    const pct = Number(percentage);
    if (pct < 75) return 'bg-red-500';
    if (pct < 90) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const canShowReport = selectedClassId && selectedMonth && selectedYear;

  const motionProps = shouldReduceMotion
    ? {}
    : { variants: containerVariants, initial: 'hidden', animate: 'visible' };
  const itemMotionProps = shouldReduceMotion ? {} : { variants: itemVariants };

  return (
    <motion.div className="space-y-6" {...motionProps}>
      {/* Header */}
      <motion.div {...itemMotionProps} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Attendance report</h1>
          <p className="mt-1 text-sm text-zinc-500">View monthly attendance summaries by class and section.</p>
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={!canShowReport || filteredReport.length === 0}>
          <DownloadSimple size={18} weight="bold" />
          Export CSV
        </Button>
      </motion.div>

      {/* Filters */}
      <motion.div {...itemMotionProps}>
        <Card>
          <div className="p-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
              <Select
                label="Class"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                disabled={classesLoading}
                placeholder="Select class"
                options={classOptions}
              />
              <Select
                label="Section (optional)"
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                disabled={!selectedClassId || sectionOptions.length === 0}
                options={[{ value: '', label: 'All sections' }, ...sectionOptions]}
              />
              <Select
                label="Month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                options={MONTHS}
              />
              <Select
                label="Year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                options={YEARS}
              />
              <div className="flex items-end">
                <div className="relative w-full">
                  <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search student..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 pl-10 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors duration-160 ease-out-strong focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/20 hover:border-zinc-300"
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Summary cards */}
      {canShowReport && (
        <motion.div {...itemMotionProps}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
                  <Users size={22} weight="bold" />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500">Total students</p>
                  <p className="text-2xl font-bold text-zinc-900">{totalStudents}</p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <TrendUp size={22} weight="bold" />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500">Average attendance</p>
                  <p className="text-2xl font-bold text-zinc-900">{avgAttendance}%</p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <Warning size={22} weight="bold" />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500">Defaulters (&lt;75%)</p>
                  <p className="text-2xl font-bold text-red-600">{defaulters}</p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <CaretRight size={22} weight="bold" />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500">Most absent</p>
                  <p className="text-sm font-bold text-zinc-900">
                    {mostAbsent ? getFullName(mostAbsent.student) : '—'}
                  </p>
                  {mostAbsent && (
                    <p className="text-xs text-zinc-500">{mostAbsent.attendance?.absent || 0} days absent</p>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </motion.div>
      )}

      {/* Table */}
      {canShowReport && (
        <motion.div {...itemMotionProps}>
          <Card className="overflow-hidden">
            {loading ? (
              <div className="p-5 space-y-4">
                <Skeleton className="h-6 w-48" />
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-16" />
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-16" />
                    <Skeleton className="h-10 w-16" />
                    <Skeleton className="h-10 w-16" />
                    <Skeleton className="h-10 w-16" />
                    <Skeleton className="h-10 w-16" />
                    <Skeleton className="h-10 w-20" />
                    <Skeleton className="h-10 w-24" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-8">
                <EmptyState title="Could not load report" description={error} icon={Warning} />
              </div>
            ) : filteredReport.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="No records found"
                  description="Try changing the month, year, or class selection."
                  icon={Student}
                />
              </div>
            ) : (
              <>
                <div className="border-b border-zinc-100 px-5 py-4">
                  <h3 className="text-base font-semibold text-zinc-900">
                    Monthly attendance · {MONTHS.find((m) => m.value === selectedMonth)?.label} {selectedYear}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-100 bg-zinc-50/60">
                        <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Roll no</th>
                        <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Name</th>
                        <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">Total</th>
                        <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">Present</th>
                        <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">Absent</th>
                        <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">Late</th>
                        <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">Half day</th>
                        <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">On leave</th>
                        <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">%</th>
                        <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Progress</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {filteredReport.map((item) => {
                        const percentage = Number(item.attendance?.percentage || 0);
                        const isDefaulter = percentage < 75;
                        return (
                          <tr
                            key={item.student?._id}
                            className={`hover:bg-zinc-50/60 transition-colors ${isDefaulter ? 'bg-red-50/40' : ''}`}
                          >
                            <td className="px-5 py-3 font-medium text-zinc-900 tabular-nums">{item.student?.rollNo || '—'}</td>
                            <td className="px-5 py-3 text-zinc-700">{getFullName(item.student)}</td>
                            <td className="px-5 py-3 text-center tabular-nums">{item.attendance?.total || 0}</td>
                            <td className="px-5 py-3 text-center font-medium text-emerald-600 tabular-nums">{item.attendance?.present || 0}</td>
                            <td className="px-5 py-3 text-center font-medium text-red-600 tabular-nums">{item.attendance?.absent || 0}</td>
                            <td className="px-5 py-3 text-center font-medium text-amber-600 tabular-nums">{item.attendance?.late || 0}</td>
                            <td className="px-5 py-3 text-center font-medium text-blue-600 tabular-nums">{item.attendance?.halfDay || 0}</td>
                            <td className="px-5 py-3 text-center font-medium text-zinc-600 tabular-nums">{item.attendance?.onLeave || 0}</td>
                            <td className="px-5 py-3 text-center">
                              <Badge variant={isDefaulter ? 'danger' : 'success'}>{percentage.toFixed(1)}%</Badge>
                            </td>
                            <td className="px-5 py-3">
                              <div className="ml-auto h-2 w-24 overflow-hidden rounded-full bg-zinc-200">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${getProgressColor(percentage)}`}
                                  style={{ width: `${Math.min(percentage, 100)}%` }}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>
        </motion.div>
      )}

      {!canShowReport && (
        <motion.div {...itemMotionProps}>
          <Card className="p-8">
            <EmptyState
              title="Select a class and month"
              description="Choose a class, section, month, and year to view the attendance report."
              icon={CalendarBlank}
            />
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};

export default AttendanceReport;
