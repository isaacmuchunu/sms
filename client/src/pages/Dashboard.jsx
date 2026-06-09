import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow, isValid } from 'date-fns';
import {
  Users,
  ChalkboardTeacher,
  ClipboardText,
  CurrencyInr,
  ChartLineUp,
  ChartPie,
  ChartBar,
  Wallet,
  ArrowRight,
  Bell,
  SpinnerGap,
  Exam,
  Books,
  Bus,
  House,
  ToggleRight,
  PaperPlaneRight,
} from '@phosphor-icons/react';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import useFetch from '../hooks/useFetch';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';

const GRID_STROKE = '#e4e4e7'; // zinc-200

const PALETTE = {
  emerald: '#059669',
  emerald50: '#ecfdf5',
  blue: '#2563eb',
  blue50: '#eff6ff',
  rose: '#f43f5e',
  rose50: '#fff1f2',
  amber: '#d97706',
  amber50: '#fffbeb',
  purple: '#7c3aed',
  purple50: '#f5f3ff',
  zinc: '#71717a',
  zinc100: '#f4f4f5',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] },
  },
};

const formatCurrency = (value) => {
  const num = Number(value) || 0;
  return `KSh${num.toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const normalizeData = (data) => {
  if (!data || typeof data !== 'object') {
    return {
      stats: {},
      enrollmentTrend: [],
      genderDistribution: [],
      classWiseCounts: [],
      feeCollection: [],
      recentActivities: [],
    };
  }

  const rawStats = data.stats || {};
  const stats = {
    ...rawStats,
    students: rawStats.totalStudents ?? rawStats.students ?? 0,
    teachers: rawStats.totalTeachers ?? rawStats.teachers ?? 0,
    classes: rawStats.totalClasses ?? rawStats.classes ?? 0,
    presentToday: rawStats.presentToday ?? 0,
    feeCollectedToday: rawStats.feeCollectedToday ?? 0,
  };

  return {
    stats,
    enrollmentTrend: data.trends?.enrollment || data.enrollmentTrend || [],
    genderDistribution: data.distribution?.gender || data.genderDistribution || [],
    classWiseCounts: data.distribution?.classWise || data.classWiseCounts || [],
    feeCollection: data.trends?.feeCollection || data.feeCollection || [],
    recentActivities: data.recentActivity || data.recentActivities || [],
  };
};

const kpis = [
  {
    key: 'students',
    title: 'Total Students',
    icon: Users,
    color: 'emerald',
    subtitle: 'Active enrollment',
  },
  {
    key: 'teachers',
    title: 'Total Teachers',
    icon: ChalkboardTeacher,
    color: 'blue',
    subtitle: 'Active staff',
  },
  {
    key: 'presentToday',
    title: 'Present Today',
    icon: ClipboardText,
    color: 'amber',
    subtitle: 'Marked attendance',
  },
  {
    key: 'feeCollectedToday',
    title: 'Fee Collected Today',
    icon: CurrencyInr,
    color: 'emerald',
    subtitle: 'Recorded payments',
    isCurrency: true,
  },
];

const quickActions = [
  { label: 'Add Student', path: '/students/new', icon: Users, variant: 'primary' },
  { label: 'Collect Fee', path: '/fees/collection', icon: CurrencyInr, variant: 'secondary' },
  { label: 'Mark Attendance', path: '/attendance', icon: ClipboardText, variant: 'outline' },
  { label: 'Add Teacher', path: '/teachers/new', icon: ChalkboardTeacher, variant: 'outline' },
];

const activityConfig = {
  student: { icon: Users, color: 'emerald', label: 'New student admitted' },
  fee: { icon: CurrencyInr, color: 'blue', label: 'Fee payment received' },
  payment: { icon: CurrencyInr, color: 'blue', label: 'Fee payment received' },
  attendance: { icon: ClipboardText, color: 'amber', label: 'Attendance marked' },
  teacher: { icon: ChalkboardTeacher, color: 'purple', label: 'Teacher added' },
  exam: { icon: Exam, color: 'rose', label: 'Exam scheduled' },
  library: { icon: Books, color: 'zinc', label: 'Library update' },
  default: { icon: Bell, color: 'zinc', label: 'Activity' },
};

const getActivityMeta = (type) => activityConfig[type] || activityConfig.default;

const formatRelativeTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return isValid(date) ? formatDistanceToNow(date, { addSuffix: true }) : '';
};

const StatCard = ({ title, value, icon: Icon, subtitle, trend, loading }) => {
  if (loading) {
    return (
      <Card>
        <CardContent>
          <div className="flex items-start justify-between">
            <div className="w-full space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const trendValue = trend != null ? Number(trend) : null;
  const hasTrend = trendValue !== null && !Number.isNaN(trendValue);

  return (
    <Card className="hover:shadow-card-hover">
      <CardContent>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-500">{title}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">{value}</p>
            <div className="mt-2 flex items-center gap-2">
              <p className="text-xs text-zinc-500">{subtitle}</p>
              {hasTrend && (
                <Badge variant={trendValue >= 0 ? 'success' : 'danger'}>
                  {trendValue >= 0 ? '+' : ''}
                  {trendValue.toFixed(1)}%
                </Badge>
              )}
            </div>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Icon size={20} weight="bold" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ChartCard = ({
  title,
  icon: Icon,
  children,
  loading,
  empty,
  emptyTitle,
  emptyDescription,
}) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {Icon && <Icon size={18} className="text-zinc-400" />}
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[260px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (empty) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {Icon && <Icon size={18} className="text-zinc-400" />}
        </CardHeader>
        <CardContent>
          <EmptyState title={emptyTitle} description={emptyDescription} icon={ChartBar} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {Icon && <Icon size={18} className="text-zinc-400" />}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
};

const CustomTooltip = ({ active, payload, label, valueFormatter }) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-dropdown">
      {label != null && <p className="mb-1 text-xs font-medium text-zinc-500">{label}</p>}
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center gap-2 text-sm">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-zinc-600">{entry.name}:</span>
          <span className="font-medium text-zinc-900">
            {valueFormatter ? valueFormatter(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-4 w-40" />
    </div>

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <StatCard key={i} loading />
      ))}
    </div>

    <div className="flex flex-wrap gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-32 rounded-lg" />
      ))}
    </div>

    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <ChartCard title="Student Enrollment Trend" icon={ChartLineUp} loading />
      </div>
      <ChartCard title="Gender Distribution" icon={ChartPie} loading />
    </div>

    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ChartCard title="Class-wise Student Count" icon={ChartBar} loading />
      <ChartCard title="Monthly Fee Collection vs Target" icon={Wallet} loading />
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <Skeleton className="h-4 w-16" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </CardContent>
    </Card>
  </div>
);

const MODULE_CTA_CONFIG = {
  transport: { label: 'Transport', icon: Bus, color: 'text-blue-600', bg: 'bg-blue-50' },
  hostel: { label: 'Hostel', icon: House, color: 'text-amber-600', bg: 'bg-amber-50' },
  library: { label: 'Library', icon: Books, color: 'text-purple-600', bg: 'bg-purple-50' },
};

const ModuleCTA = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  if (user?.role !== 'admin' || !user?.modules) return null;

  const disabledModules = Object.entries(user.modules)
    .filter(([, enabled]) => enabled !== true)
    .map(([key]) => key);

  if (disabledModules.length === 0) return null;

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardContent>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <ToggleRight size={20} weight="bold" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Optional modules are disabled</h3>
              <p className="mt-0.5 text-sm text-zinc-600">
                Request activation for:{' '}
                {disabledModules.map((key) => MODULE_CTA_CONFIG[key]?.label || key).join(', ')}
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => navigate('/module-requests')}>
            <PaperPlaneRight size={16} />
            Request modules
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const DashboardError = ({ message, onRetry }) => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-card">
    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
      <SpinnerGap size={24} className="animate-spin" />
    </div>
    <h3 className="mt-4 text-lg font-semibold text-zinc-900">Failed to load dashboard</h3>
    <p className="mt-1 max-w-sm text-sm text-zinc-500">{message}</p>
    <Button onClick={onRetry} className="mt-5">
      Try Again
    </Button>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { data, loading, error, refetch } = useFetch('/reports/dashboard');

  useEffect(() => {
    if (user?.role === 'admin') {
      refreshUser();
    }
  }, [user?.role, refreshUser]);

  const dashboard = normalizeData(data);
  const { stats, enrollmentTrend, genderDistribution, classWiseCounts, feeCollection, recentActivities } =
    dashboard;

  if (error) {
    return <DashboardError message={error} onRetry={refetch} />;
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  const totalGender = genderDistribution.reduce((sum, g) => sum + (Number(g.value) || 0), 0);

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
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <ChartLineUp size={16} className="text-emerald-600" />
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </motion.div>

      {/* KPI Stat Cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {kpis.map((kpi) => {
          const rawValue = stats[kpi.key];
          const value = kpi.isCurrency
            ? formatCurrency(rawValue)
            : (rawValue ?? 0).toLocaleString('en-KE');
          const trend = stats.trends?.[kpi.key];
          return (
            <StatCard
              key={kpi.key}
              title={kpi.title}
              value={value}
              icon={kpi.icon}
              subtitle={kpi.subtitle}
              trend={trend}
            />
          );
        })}
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants} className="flex flex-wrap gap-3">
        {quickActions.map((action) => (
          <Button
            key={action.label}
            variant={action.variant}
            size="default"
            onClick={() => navigate(action.path)}
          >
            <action.icon size={18} weight="bold" />
            {action.label}
          </Button>
        ))}
      </motion.div>

      <motion.div variants={itemVariants}>
        <ModuleCTA />
      </motion.div>

      {/* Charts Row 1 */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Enrollment Trend */}
        <div className="lg:col-span-2">
          <ChartCard
            title="Student Enrollment Trend"
            icon={ChartLineUp}
            empty={enrollmentTrend.length === 0}
            emptyTitle="No enrollment data"
            emptyDescription="Enrollment trend data is not available at the moment."
          >
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={enrollmentTrend}
                margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: '#52525b' }}
                  axisLine={{ stroke: GRID_STROKE }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#52525b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="students"
                  name="Students"
                  stroke={PALETTE.emerald}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: PALETTE.emerald, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Gender Distribution */}
        <ChartCard
          title="Gender Distribution"
          icon={ChartPie}
          empty={genderDistribution.length === 0}
          emptyTitle="No gender data"
          emptyDescription="Gender distribution data is not available at the moment."
        >
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={genderDistribution}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
              >
                {genderDistribution.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color || (index === 0 ? PALETTE.emerald : PALETTE.rose)}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex justify-center gap-6">
            {genderDistribution.map((g, idx) => {
              const color = g.color || (idx === 0 ? PALETTE.emerald : PALETTE.rose);
              const percentage =
                totalGender > 0 ? ((Number(g.value) / totalGender) * 100).toFixed(1) : 0;
              return (
                <div key={g.name || idx} className="text-center">
                  <p className="text-xl font-semibold" style={{ color }}>
                    {Number(g.value).toLocaleString('en-KE')}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {g.name} ({percentage}%)
                  </p>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </motion.div>

      {/* Charts Row 2 */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Class-wise Student Count */}
        <ChartCard
          title="Class-wise Student Count"
          icon={ChartBar}
          empty={classWiseCounts.length === 0}
          emptyTitle="No class data"
          emptyDescription="Class-wise student count data is not available at the moment."
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={classWiseCounts}
              margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis
                dataKey="class"
                tick={{ fontSize: 11, fill: '#52525b' }}
                axisLine={{ stroke: GRID_STROKE }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#52525b' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Students" fill={PALETTE.emerald} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Fee Collection vs Target */}
        <ChartCard
          title="Monthly Fee Collection vs Target"
          icon={Wallet}
          empty={feeCollection.length === 0}
          emptyTitle="No fee data"
          emptyDescription="Fee collection data is not available at the moment."
        >
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart
              data={feeCollection}
              margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#52525b' }}
                axisLine={{ stroke: GRID_STROKE }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#52525b' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => `KSh${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip valueFormatter={formatCurrency} />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="collected"
                name="Collected"
                stroke={PALETTE.emerald}
                fill={PALETTE.emerald}
                fillOpacity={0.2}
                strokeWidth={2}
              />
              {feeCollection.some((d) => d.target != null) && (
                <Area
                  type="monotone"
                  dataKey="target"
                  name="Target"
                  stroke={PALETTE.blue}
                  fill={PALETTE.blue}
                  fillOpacity={0.05}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </motion.div>

      {/* Recent Activity */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <Link
              to="/reports"
              className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800"
            >
              View All <ArrowRight size={14} />
            </Link>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <EmptyState
                title="No recent activity"
                description="There are no recent activities to show right now."
                icon={Bell}
              />
            ) : (
              <div className="space-y-3">
                {recentActivities.map((activity) => {
                  const meta = getActivityMeta(activity.type);
                  const Icon = meta.icon;
                  const colorMap = {
                    emerald: 'bg-emerald-50 text-emerald-600',
                    blue: 'bg-blue-50 text-blue-600',
                    purple: 'bg-purple-50 text-purple-600',
                    amber: 'bg-amber-50 text-amber-600',
                    rose: 'bg-rose-50 text-rose-600',
                    zinc: 'bg-zinc-100 text-zinc-600',
                  };
                  const timeLabel = formatRelativeTime(activity.timestamp || activity.time);
                  return (
                    <div
                      key={activity.id || `${activity.type}-${activity.time}`}
                      className="flex items-start gap-4 rounded-lg p-3 transition-colors hover:bg-zinc-50/60"
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colorMap[meta.color]}`}
                      >
                        <Icon size={18} weight="bold" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-900">
                          {activity.action || meta.label}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">{activity.detail}</p>
                      </div>
                      <span className="whitespace-nowrap text-xs text-zinc-400">{timeLabel}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
