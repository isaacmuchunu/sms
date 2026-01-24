import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import {
  CurrencyInr,
  TrendUp,
  WarningOctagon,
  Warning,
  Download,
  Calendar,
  Student,
} from '@phosphor-icons/react';
import useFetch from '../../hooks/useFetch';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import Button from '../../components/ui/Button';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

const FeeReports = () => {
  const [reportYear] = useState(new Date().getFullYear());

  const {
    data: monthlyData,
    loading: monthlyLoading,
    error: monthlyError,
  } = useFetch('/fees/reports/monthly-collection', { params: { year: reportYear } });

  const {
    data: outstandingData,
    loading: outstandingLoading,
    error: outstandingError,
  } = useFetch('/fees/reports/outstanding');

  const {
    data: dailyData,
    loading: dailyLoading,
    error: dailyError,
  } = useFetch('/fees/reports/daily-collection');

  const {
    data: defaultersData,
    loading: defaultersLoading,
    error: defaultersError,
  } = useFetch('/fees/reports/defaulters', { params: { limit: 10 } });

  const chartData = useMemo(() => {
    if (!monthlyData?.monthlyCollection) return [];
    return monthlyData.monthlyCollection.map((m) => ({
      month: MONTHS[m.monthNumber - 1] || m.month.slice(0, 3),
      collected: m.total,
      count: m.count,
    }));
  }, [monthlyData]);

  const totalCollection = monthlyData?.yearlyTotal || 0;
  const totalOutstanding = outstandingData?.totalOutstanding || 0;
  const todayCollection = dailyData?.grandTotal || 0;
  const collectionRate = useMemo(() => {
    const total = totalCollection + totalOutstanding;
    return total > 0 ? ((totalCollection / total) * 100).toFixed(1) : '0.0';
  }, [totalCollection, totalOutstanding]);

  const classWiseSummary = useMemo(() => {
    if (!outstandingData?.invoices) return [];
    const map = {};
    outstandingData.invoices.forEach((inv) => {
      const cls = inv.student?.class?.name || 'Unknown';
      if (!map[cls]) map[cls] = { class: cls, outstanding: 0, count: 0, total: 0 };
      map[cls].outstanding += inv.balanceAmount || 0;
      map[cls].total += inv.netAmount || 0;
      map[cls].count += 1;
    });
    return Object.values(map).sort((a, b) => b.outstanding - a.outstanding);
  }, [outstandingData]);

  const defaulters = useMemo(() => defaultersData?.items || defaultersData || [], [defaultersData]);

  const isLoading = monthlyLoading || outstandingLoading || dailyLoading;

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Fee Reports</h1>
          <p className="mt-1 text-sm text-zinc-500">Collection analytics and outstanding dues</p>
        </div>
        <Button variant="outline" disabled>
          <Download size={18} weight="bold" />
          Export
        </Button>
      </div>

      {(monthlyError || outstandingError || dailyError || defaultersError) &&
        renderError(monthlyError || outstandingError || dailyError || defaultersError)}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={cardVariants}>
          <Card>
            <CardContent className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <CurrencyInr size={22} weight="bold" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Total Collection ({reportYear})
                </p>
                <p className="mt-0.5 font-mono text-xl font-semibold text-zinc-900">
                  {isLoading ? '—' : formatCurrency(totalCollection)}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants}>
          <Card>
            <CardContent className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-danger-50 text-danger-600">
                <WarningOctagon size={22} weight="bold" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Total Outstanding
                </p>
                <p className="mt-0.5 font-mono text-xl font-semibold text-zinc-900">
                  {isLoading ? '—' : formatCurrency(totalOutstanding)}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants}>
          <Card>
            <CardContent className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                <Calendar size={22} weight="bold" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Today's Collection
                </p>
                <p className="mt-0.5 font-mono text-xl font-semibold text-zinc-900">
                  {dailyLoading ? '—' : formatCurrency(todayCollection)}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants}>
          <Card>
            <CardContent className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-info-50 text-info-600">
                <TrendUp size={22} weight="bold" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Collection Rate
                </p>
                <p className="mt-0.5 font-mono text-xl font-semibold text-zinc-900">
                  {isLoading ? '—' : `${collectionRate}%`}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Monthly Chart */}
      <motion.div variants={cardVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Monthly Collection ({reportYear})</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-64 w-full" />
              </div>
            ) : chartData.length === 0 ? (
              <EmptyState
                title="No collection data"
                description="There are no recorded payments for the selected year."
              />
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#52525b' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#52525b' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `KSh${val / 1000}k`}
                  />
                  <Tooltip
                    formatter={(val) => formatCurrency(val)}
                    contentStyle={{
                      borderRadius: '0.75rem',
                      border: '1px solid #e4e4e7',
                      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="collected"
                    name="Collected"
                    fill="#059669"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Class-wise Summary */}
        <motion.div variants={cardVariants}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Student size={18} className="text-zinc-400" />
                Class-wise Outstanding
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 text-left">
                      <th className="px-3 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Class
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Invoices
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Outstanding
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {outstandingLoading &&
                      Array.from({ length: 4 }).map((_, i) => (
                        <tr key={i}>
                          <td className="px-3 py-3">
                            <Skeleton className="h-4 w-24" />
                          </td>
                          <td className="px-3 py-3">
                            <Skeleton className="ml-auto h-4 w-12" />
                          </td>
                          <td className="px-3 py-3">
                            <Skeleton className="ml-auto h-4 w-20" />
                          </td>
                        </tr>
                      ))}
                    {!outstandingLoading && classWiseSummary.length === 0 && (
                      <tr>
                        <td colSpan={3}>
                          <EmptyState
                            title="No outstanding dues"
                            description="All classes are up to date with fee payments."
                          />
                        </td>
                      </tr>
                    )}
                    {!outstandingLoading &&
                      classWiseSummary.map((row) => (
                        <tr key={row.class} className="transition-colors hover:bg-zinc-50/60">
                          <td className="px-3 py-3 font-medium text-zinc-900">{row.class}</td>
                          <td className="px-3 py-3 text-right text-zinc-600">{row.count}</td>
                          <td className="px-3 py-3 text-right font-mono font-medium text-danger-600">
                            {formatCurrency(row.outstanding)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Defaulters */}
        <motion.div variants={cardVariants}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Warning size={18} className="text-zinc-400" />
                Top Defaulters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {defaultersLoading &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-lg border border-zinc-100 p-3">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="mt-2 h-3 w-24" />
                    </div>
                  ))}
                {!defaultersLoading && defaulters.length === 0 && (
                  <EmptyState
                    title="No defaulters"
                    description="There are no overdue invoices at the moment."
                  />
                )}
                {!defaultersLoading &&
                  defaulters.slice(0, 8).map((inv) => {
                    const student = inv.student || {};
                    const studentName =
                      student.fullName ||
                      [student.firstName, student.lastName].filter(Boolean).join(' ');
                    return (
                      <div
                        key={inv._id}
                        className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/60 p-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-zinc-900">{studentName || 'Unknown'}</p>
                          <p className="text-xs text-zinc-500">
                            {student.class?.name || '-'} | {student.admissionNo || '-'} | Due{' '}
                            {inv.dueDate ? format(new Date(inv.dueDate), 'dd MMM yyyy') : '-'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-sm font-semibold text-danger-600">
                            {formatCurrency(inv.balanceAmount)}
                          </p>
                          <Badge variant="danger" className="mt-1">
                            Overdue
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default FeeReports;
