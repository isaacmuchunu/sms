import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  CurrencyInr,
  ClipboardText,
  GraduationCap,
  TrendUp,
  Exam,
  ArrowCounterClockwise,
  Warning,
  Chalkboard,
} from '@phosphor-icons/react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import useFetch from '../../hooks/useFetch';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
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

const PIE_COLORS = ['#059669', '#d97706', '#dc2626', '#2563eb', '#71717a', '#0891b2'];
const BAR_COLOR = '#059669';
const GRID_COLOR = '#f4f4f5';
const TEXT_COLOR = '#52525b';

const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: reducedMotion ? 0 : 0.05 },
  },
};

const itemVariants = {
  hidden: reducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.23, 1, 0.32, 1] },
  },
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(value || 0);

const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`;

const ErrorAlert = ({ title, message, onRetry }) => (
  <div className="rounded-xl border border-red-200 bg-red-50 p-4">
    <div className="flex items-start gap-3">
      <Warning className="mt-0.5 h-5 w-5 text-red-600" weight="bold" />
      <div className="flex-1">
        <h4 className="text-sm font-semibold text-red-800">{title}</h4>
        {message && <p className="mt-1 text-sm text-red-700">{message}</p>}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <ArrowCounterClockwise size={16} className="mr-1.5" />
          Retry
        </Button>
      )}
    </div>
  </div>
);

const StatSkeleton = () => (
  <Card>
    <CardContent>
      <div className="flex items-start justify-between">
        <Skeleton className="h-11 w-11 rounded-xl" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-7 w-24" />
      <Skeleton className="mt-2 h-4 w-32" />
    </CardContent>
  </Card>
);

const ChartSkeleton = ({ height = 280 }) => (
  <Card className="h-full">
    <CardHeader>
      <Skeleton className="h-5 w-40" />
    </CardHeader>
    <CardContent>
      <Skeleton className="w-full" style={{ height }} />
    </CardContent>
  </Card>
);

const KpiCard = ({ title, value, subtitle, icon: Icon, badge }) => (
  <Card>
    <CardContent>
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <Icon size={24} weight="duotone" />
        </div>
        {badge && (
          <Badge variant={badge.variant === 'success' ? 'success' : 'warning'}>{badge.text}</Badge>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-semibold tracking-tight text-zinc-900">{value}</p>
        <p className="mt-1 text-sm font-medium text-zinc-500">{title}</p>
        {subtitle && <p className="mt-1 text-xs text-zinc-400">{subtitle}</p>}
      </div>
    </CardContent>
  </Card>
);

const Analytics = () => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear().toString());
  const [month, setMonth] = useState((today.getMonth() + 1).toString());
  const [examId, setExamId] = useState('');

  const yearOptions = useMemo(() => {
    const current = today.getFullYear();
    return Array.from({ length: 5 }, (_, i) => {
      const y = current - 2 + i;
      return { value: y.toString(), label: y.toString() };
    });
  }, [today]);

  const {
    data: dashboardData,
    loading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useFetch('/reports/dashboard');

  const {
    data: studentStats,
    loading: studentLoading,
    error: studentError,
    refetch: refetchStudents,
  } = useFetch('/reports/students');

  const {
    data: feeStats,
    loading: feeLoading,
    error: feeError,
    refetch: refetchFees,
  } = useFetch('/reports/fees', { params: { year } });

  const {
    data: attendanceStats,
    loading: attendanceLoading,
    error: attendanceError,
    refetch: refetchAttendance,
  } = useFetch('/reports/attendance', { params: { month, year } });

  const {
    data: examListData,
    loading: examListLoading,
    error: examListError,
  } = useFetch('/reports/exams');

  const examOptions = useMemo(() => {
    const exams = examListData?.exams || [];
    return exams.map((exam) => ({ value: exam._id, label: exam.name }));
  }, [examListData]);

  useEffect(() => {
    if (examOptions.length > 0 && !examId) {
      setExamId(examOptions[0].value);
    }
  }, [examOptions, examId]);

  const {
    data: examStats,
    loading: examStatsLoading,
    error: examStatsError,
    refetch: refetchExamStats,
  } = useFetch(`/reports/exams`, { params: { examId }, immediate: !!examId });

  const dashboardStats = dashboardData?.stats || {};

  const genderData = useMemo(() => {
    const ratio = studentStats?.genderRatio || [];
    return ratio.map((item) => ({
      name: item._id ? item._id.charAt(0).toUpperCase() + item._id.slice(1) : 'Unknown',
      value: item.count,
    }));
  }, [studentStats]);

  const enrollmentByClass = useMemo(() => studentStats?.enrollmentByClass || [], [studentStats]);
  const monthlyAdmissions = useMemo(() => studentStats?.monthlyAdmissions || [], [studentStats]);

  const monthlyCollection = useMemo(() => feeStats?.monthlyCollection || [], [feeStats]);
  const paymentModeDistribution = useMemo(() => {
    const modes = feeStats?.paymentModeDistribution || [];
    return modes.map((item) => ({
      name: item._id ? item._id.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) : 'Unknown',
      value: item.total || 0,
      count: item.count || 0,
    }));
  }, [feeStats]);

  const attendanceTrend = useMemo(() => {
    const trend = attendanceStats?.monthlyTrend || [];
    return trend.map((item) => ({
      label: `${item._id.month}/${item._id.year.toString().slice(-2)}`,
      total: item.total,
      present: item.present,
      percentage: item.total > 0 ? (item.present / item.total) * 100 : 0,
    }));
  }, [attendanceStats]);

  const classWiseAttendance = useMemo(() => attendanceStats?.classWiseAttendance || [], [attendanceStats]);

  const passFailData = useMemo(() => {
    const ratio = examStats?.passFailRatio || { pass: 0, fail: 0 };
    return [
      { name: 'Pass', value: ratio.pass },
      { name: 'Fail', value: ratio.fail },
    ];
  }, [examStats]);

  const gradeDistribution = useMemo(() => {
    const grades = examStats?.gradeDistribution || {};
    return Object.entries(grades)
      .map(([grade, count]) => ({ grade, count }))
      .sort((a, b) => b.count - a.count);
  }, [examStats]);

  const subjectAverages = useMemo(() => examStats?.subjectWiseAverages || [], [examStats]);

  const hasErrors = dashboardError || studentError || feeError || attendanceError || examListError || examStatsError;

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Page Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">Analytics</h1>
          <p className="mt-1 text-sm text-zinc-500">Comprehensive school reports and performance insights</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Select
            label="Academic year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            options={yearOptions}
            className="min-w-[8rem]"
          />
          <Select
            label="Attendance month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            options={MONTHS}
            className="min-w-[10rem]"
          />
          <Button variant="outline" onClick={() => { refetchDashboard(); refetchStudents(); refetchFees(); refetchAttendance(); if (examId) refetchExamStats(); }}>
            <ArrowCounterClockwise size={16} />
            Refresh
          </Button>
        </div>
      </motion.div>

      {hasErrors && (
        <motion.div variants={itemVariants}>
          <ErrorAlert
            title="Some reports failed to load"
            message="Check your connection or try refreshing the data."
            onRetry={() => { refetchDashboard(); refetchStudents(); refetchFees(); refetchAttendance(); if (examId) refetchExamStats(); }}
          />
        </motion.div>
      )}

      {/* KPI Cards */}
      <motion.div variants={itemVariants}>
        {dashboardLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => <StatSkeleton key={i} />)}
          </div>
        ) : dashboardError ? (
          <Card>
            <CardContent>
              <EmptyState
                title="Dashboard stats unavailable"
                description={dashboardError}
                icon={Warning}
                action={<Button variant="outline" size="sm" onClick={refetchDashboard}>Retry</Button>}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KpiCard title="Total Students" value={dashboardStats.totalStudents ?? 0} icon={Users} />
            <KpiCard title="Total Teachers" value={dashboardStats.totalTeachers ?? 0} icon={GraduationCap} />
            <KpiCard title="Total Classes" value={dashboardStats.totalClasses ?? 0} icon={Chalkboard} />
            <KpiCard title="Present Today" value={dashboardStats.presentToday ?? 0} icon={ClipboardText} />
            <KpiCard title="Fee Collected Today" value={formatCurrency(dashboardStats.feeCollectedToday)} icon={CurrencyInr} />
            <KpiCard title="Outstanding Dues" value={formatCurrency(dashboardStats.outstandingDues)} icon={TrendUp} badge={{ text: 'Due', variant: 'warning' }} />
          </div>
        )}
      </motion.div>

      {/* Students Section */}
      <motion.div variants={itemVariants} className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-900">Student reports</h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {studentLoading ? (
            <>
              <div className="lg:col-span-2"><ChartSkeleton height={280} /></div>
              <ChartSkeleton height={280} />
            </>
          ) : studentError ? (
            <div className="lg:col-span-3">
              <Card>
                <CardContent>
                  <EmptyState
                    title="Student stats unavailable"
                    description={studentError}
                    icon={Warning}
                    action={<Button variant="outline" size="sm" onClick={refetchStudents}>Retry</Button>}
                  />
                </CardContent>
              </Card>
            </div>
          ) : (
            <>
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Class-wise enrollment</CardTitle>
                </CardHeader>
                <CardContent>
                  {enrollmentByClass.length === 0 ? (
                    <EmptyState title="No enrollment data" description="Student enrollment by class will appear here once records are added." />
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={enrollmentByClass} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                        <XAxis dataKey="className" tick={{ fontSize: 11, fill: TEXT_COLOR }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 12, fill: TEXT_COLOR }} axisLine={false} tickLine={false} />
                        <Tooltip formatter={(value) => [value, 'Students']} />
                        <Bar dataKey="count" fill={BAR_COLOR} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Gender distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {genderData.length === 0 ? (
                    <EmptyState title="No gender data" description="Gender distribution will appear here once records are added." />
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={genderData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {genderData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Monthly admissions ({year})</CardTitle>
          </CardHeader>
          <CardContent>
            {studentLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : studentError ? null : monthlyAdmissions.length === 0 ? (
              <EmptyState title="No admission data" description="Monthly admission trends will appear here." />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={monthlyAdmissions} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                  <defs>
                    <linearGradient id="admissionsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={BAR_COLOR} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={BAR_COLOR} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: TEXT_COLOR }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: TEXT_COLOR }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke={BAR_COLOR} fill="url(#admissionsFill)" strokeWidth={2} name="Admissions" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Fees Section */}
      <motion.div variants={itemVariants} className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-900">Fee reports</h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {feeLoading ? (
            <>
              <div className="lg:col-span-2"><ChartSkeleton height={280} /></div>
              <ChartSkeleton height={280} />
            </>
          ) : feeError ? (
            <div className="lg:col-span-3">
              <Card>
                <CardContent>
                  <EmptyState
                    title="Fee stats unavailable"
                    description={feeError}
                    icon={Warning}
                    action={<Button variant="outline" size="sm" onClick={refetchFees}>Retry</Button>}
                  />
                </CardContent>
              </Card>
            </div>
          ) : (
            <>
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Monthly fee collection ({year})</CardTitle>
                </CardHeader>
                <CardContent>
                  {monthlyCollection.every((m) => m.total === 0) ? (
                    <EmptyState title="No collection data" description="Fee collection records will appear here once payments are recorded." />
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={monthlyCollection} margin={{ top: 8, right: 8, bottom: 8, left: -8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 12, fill: TEXT_COLOR }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 12, fill: TEXT_COLOR }} axisLine={false} tickLine={false} tickFormatter={(v) => `KSh${v / 1000}k`} />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Bar dataKey="total" fill={BAR_COLOR} radius={[4, 4, 0, 0]} name="Collected" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment modes</CardTitle>
                </CardHeader>
                <CardContent>
                  {paymentModeDistribution.length === 0 ? (
                    <EmptyState title="No payment data" description="Payment mode distribution will appear here." />
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={paymentModeDistribution}
                          cx="50%"
                          cy="45%"
                          outerRadius={90}
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {paymentModeDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </motion.div>

      {/* Attendance Section */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Attendance reports</h2>
          {!attendanceLoading && !attendanceError && (
            <div className="flex items-center gap-3 text-sm text-zinc-600">
              <Badge variant="danger">{attendanceStats?.defaulterCount ?? 0} defaulters</Badge>
              <span>Below 75%: {formatPercent(attendanceStats?.defaulterPercentage)}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {attendanceLoading ? (
            <>
              <div className="lg:col-span-2"><ChartSkeleton height={280} /></div>
              <ChartSkeleton height={280} />
            </>
          ) : attendanceError ? (
            <div className="lg:col-span-3">
              <Card>
                <CardContent>
                  <EmptyState
                    title="Attendance stats unavailable"
                    description={attendanceError}
                    icon={Warning}
                    action={<Button variant="outline" size="sm" onClick={refetchAttendance}>Retry</Button>}
                  />
                </CardContent>
              </Card>
            </div>
          ) : (
            <>
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Attendance trend (last 6 months)</CardTitle>
                </CardHeader>
                <CardContent>
                  {attendanceTrend.length === 0 ? (
                    <EmptyState title="No attendance trend" description="Attendance records will appear here once marked." />
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={attendanceTrend} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 12, fill: TEXT_COLOR }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 12, fill: TEXT_COLOR }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                        <Tooltip formatter={(value) => [formatPercent(value), 'Attendance']} />
                        <Line type="monotone" dataKey="percentage" stroke={BAR_COLOR} strokeWidth={2} dot={{ r: 4, fill: BAR_COLOR }} name="Attendance %" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Class-wise attendance</CardTitle>
                </CardHeader>
                <CardContent>
                  {classWiseAttendance.length === 0 ? (
                    <EmptyState title="No class data" description="Class-wise attendance will appear here." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-zinc-100 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
                            <th className="pb-3 pr-4">Class</th>
                            <th className="pb-3 pr-4">Present</th>
                            <th className="pb-3">%</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                          {classWiseAttendance.map((row) => (
                            <tr key={row.className || row._id} className="group hover:bg-zinc-50/60">
                              <td className="py-3 pr-4 font-medium text-zinc-900">{row.className || 'Unassigned'}</td>
                              <td className="py-3 pr-4 tabular-nums text-zinc-600">
                                {row.present} / {row.total}
                              </td>
                              <td className="py-3">
                                <Badge variant={row.percentage >= 75 ? 'success' : 'warning'}>
                                  {formatPercent(row.percentage)}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </motion.div>

      {/* Exams Section */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Exam reports</h2>
          <Select
            label="Select exam"
            value={examId}
            onChange={(e) => setExamId(e.target.value)}
            options={examOptions}
            placeholder={examListLoading ? 'Loading exams...' : 'Choose an exam'}
            className="min-w-[16rem]"
          />
        </div>

        {!examId && !examListLoading ? (
          <Card>
            <CardContent>
              <EmptyState
                title="Select an exam"
                description="Choose an exam from the dropdown to view result analytics."
                icon={Exam}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {examStatsLoading ? (
              <>
                <ChartSkeleton height={260} />
                <div className="lg:col-span-2"><ChartSkeleton height={260} /></div>
              </>
            ) : examStatsError ? (
              <div className="lg:col-span-3">
                <Card>
                  <CardContent>
                    <EmptyState
                      title="Exam stats unavailable"
                      description={examStatsError}
                      icon={Warning}
                      action={<Button variant="outline" size="sm" onClick={refetchExamStats}>Retry</Button>}
                    />
                  </CardContent>
                </Card>
              </div>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Pass / fail ratio</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {passFailData.every((d) => d.value === 0) ? (
                      <EmptyState title="No result data" description="Published marks will appear here." />
                    ) : (
                      <ResponsiveContainer width="100%" height={240}>
                        <PieChart>
                          <Pie
                            data={passFailData}
                            cx="50%"
                            cy="45%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={4}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {passFailData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? '#059669' : '#dc2626'} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Grade distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {gradeDistribution.length === 0 ? (
                      <EmptyState title="No grade data" description="Grades will appear here once results are published." />
                    ) : (
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={gradeDistribution} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                          <XAxis dataKey="grade" tick={{ fontSize: 12, fill: TEXT_COLOR }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 12, fill: TEXT_COLOR }} axisLine={false} tickLine={false} />
                          <Tooltip />
                          <Bar dataKey="count" fill={BAR_COLOR} radius={[4, 4, 0, 0]} name="Students" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {examId && !examStatsLoading && !examStatsError && (
          <Card>
            <CardHeader>
              <CardTitle>Subject-wise performance</CardTitle>
            </CardHeader>
            <CardContent>
              {subjectAverages.length === 0 ? (
                <EmptyState title="No subject data" description="Subject averages will appear here once marks are published." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-100 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
                        <th className="pb-3 pr-4">Subject</th>
                        <th className="pb-3 pr-4">Students</th>
                        <th className="pb-3 pr-4">Average</th>
                        <th className="pb-3 pr-4">Highest</th>
                        <th className="pb-3">Lowest</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {subjectAverages.map((row) => (
                        <tr key={row.subject?._id || row.subject?.name} className="group hover:bg-zinc-50/60">
                          <td className="py-3 pr-4 font-medium text-zinc-900">
                            {row.subject?.name || 'Unknown'}
                            {row.subject?.code && <span className="ml-2 text-xs text-zinc-400">({row.subject.code})</span>}
                          </td>
                          <td className="py-3 pr-4 tabular-nums text-zinc-600">{row.totalStudents}</td>
                          <td className="py-3 pr-4 tabular-nums font-medium text-zinc-900">{Number(row.average).toFixed(1)}</td>
                          <td className="py-3 pr-4 tabular-nums text-zinc-600">{row.highest}</td>
                          <td className="py-3 tabular-nums text-zinc-600">{row.lowest}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </motion.div>
    </motion.div>
  );
};

export default Analytics;
