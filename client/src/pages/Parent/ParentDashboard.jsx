import React, { useEffect, useMemo, useState } from 'react';

import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { format } from 'date-fns';
import {
  Student as StudentIcon,
  BookOpen,
  CurrencyInr,
  Calendar,
  CalendarCheck,
  ChartLineUp,
  DownloadSimple,
  CaretRight,
  CreditCard,
} from '@phosphor-icons/react';
import api from '../../services/api';
import useFetch from '../../hooks/useFetch';
import PaymentModal from '../../components/Payment/PaymentModal';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import toast from 'react-hot-toast';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.23, 1, 0.32, 1] } },
};

const formatCurrency = (value) => {
  const amount = Number(value) || 0;
  return `KSh${amount.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const useChildSummary = (studentId) => {
  const [summary, setSummary] = useState({ loading: true, data: null, error: null });

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    const fetchSummary = async () => {
      try {
        const [feesRes, attendanceRes, resultsRes, meetingsRes, libraryRes] = await Promise.all([
          api.get(`/students/${studentId}/fees`),
          api.get(`/students/${studentId}/attendance`),
          api.get(`/students/${studentId}/results`),
          api.get('/meetings?upcoming=true'),
          api.get(`/library/student/${studentId}/issues`),
        ]);

        const fees = feesRes.data.data;
        const attendance = attendanceRes.data.data;
        const results = resultsRes.data.data;
        const meetings = meetingsRes.data.data?.meetings || [];
        const issues = libraryRes.data.data?.issues || [];

        const invoices = fees.invoices || [];
        const outstandingInvoices = invoices
          .filter(
            (inv) =>
              inv.status !== 'paid' && inv.status !== 'cancelled' && (inv.balanceAmount || 0) > 0
          )
          .map((inv) => ({ ...inv, _id: inv.id }));
        const outstanding = outstandingInvoices.reduce((sum, inv) => sum + (inv.balanceAmount || 0), 0);

        const attendanceRecords = attendance.records || [];
        const total = attendanceRecords.length;
        const present = attendanceRecords.filter((a) => ['present', 'late'].includes(a.status)).length;
        const attendancePct = total ? ((present / total) * 100).toFixed(1) : '0.0';

        const latestExam = (results.results || results.marks || [])[0];

        if (!cancelled) {
          setSummary({
            loading: false,
            data: {
              outstanding,
              outstandingInvoices,
              attendancePct,
              totalDays: total,
              presentDays: present,
              latestExam,
              meetings,
              issues,
            },
            error: null,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setSummary({ loading: false, data: null, error: err.message });
        }
      }
    };
    fetchSummary();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  return summary;
};

const ChildCard = ({ student }) => {
  const { loading, data, error } = useChildSummary(student.id);
  const [payInvoice, setPayInvoice] = useState(null);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-5">
          <Skeleton className="mb-4 h-6 w-48" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-danger-600">Failed to load summary: {error}</p>
        </CardContent>
      </Card>
    );
  }

  const overdueBooks = data.issues.filter((i) => new Date(i.dueDate) < new Date());

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 border-b border-zinc-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-subtle text-lg font-semibold text-accent-700">
            {student.firstName?.[0]}
            {student.lastName?.[0]}
          </div>
          <div>
            <CardTitle>
              {student.firstName} {student.lastName}
            </CardTitle>
            <p className="text-sm text-zinc-500">
              {student.admissionNo} · {student.class?.name || '-'} {student.section?.name || ''}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                const response = await api.get(`/students/${student.id}/report-card.pdf`, {
                  responseType: 'blob',
                });
                const blob = new Blob([response.data], { type: 'application/pdf' });
                const url = window.URL.createObjectURL(blob);
                window.open(url, '_blank');
                setTimeout(() => window.URL.revokeObjectURL(url), 10000);
              } catch (err) {
                toast.error(err.response?.data?.message || 'Failed to load report card');
              }
            }}
          >
            <DownloadSimple size={16} />
            Report card
          </Button>
          <Button as={Link} to={`/students/${student.id}`} variant="ghost" size="sm">
            View profile
            <CaretRight size={16} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-zinc-100 bg-zinc-50/60 p-4">
            <div className="mb-2 flex items-center gap-2 text-zinc-500">
              <ChartLineUp size={18} />
              <span className="text-xs font-medium uppercase tracking-wider">Performance</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900">
              {data.latestExam ? `${data.latestExam.percentage ?? '-'}%` : 'N/A'}
            </p>
            <p className="text-xs text-zinc-500">Latest exam</p>
          </div>

          <div className="rounded-lg border border-zinc-100 bg-zinc-50/60 p-4">
            <div className="mb-2 flex items-center gap-2 text-zinc-500">
              <StudentIcon size={18} />
              <span className="text-xs font-medium uppercase tracking-wider">Attendance</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900">{data.attendancePct}%</p>
            <p className="text-xs text-zinc-500">
              {data.presentDays}/{data.totalDays} days present
            </p>
          </div>

          <div className="rounded-lg border border-zinc-100 bg-zinc-50/60 p-4">
            <div className="mb-2 flex items-center gap-2 text-zinc-500">
              <CurrencyInr size={18} />
              <span className="text-xs font-medium uppercase tracking-wider">Fees due</span>
            </div>
            <p
              className={`text-2xl font-bold ${
                data.outstanding > 0 ? 'text-danger-600' : 'text-success-600'
              }`}
            >
              {formatCurrency(data.outstanding)}
            </p>
            {data.outstanding > 0 && data.outstandingInvoices.length > 0 ? (
              <button
                type="button"
                onClick={() => setPayInvoice(data.outstandingInvoices[0])}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent-600 hover:text-accent-700"
              >
                <CreditCard size={14} />
                Pay now
              </button>
            ) : (
              <p className="text-xs text-zinc-500">No outstanding balance</p>
            )}
          </div>

          <div className="rounded-lg border border-zinc-100 bg-zinc-50/60 p-4">
            <div className="mb-2 flex items-center gap-2 text-zinc-500">
              <BookOpen size={18} />
              <span className="text-xs font-medium uppercase tracking-wider">Library</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900">{data.issues.length}</p>
            {overdueBooks.length > 0 && (
              <p className="text-xs text-danger-600">{overdueBooks.length} overdue</p>
            )}
            {overdueBooks.length === 0 && <p className="text-xs text-zinc-500">Books borrowed</p>}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            as={Link}
            to={`/parent/attendance?student=${student.id}`}
            variant="outline"
            size="sm"
          >
            <CalendarCheck size={16} />
            View attendance
          </Button>
          <Button as={Link} to={`/parent/fees?student=${student.id}`} variant="outline" size="sm">
            <CurrencyInr size={16} />
            View fees & pay
          </Button>
          <Button
            as={Link}
            to={`/parent/results?student=${student.id}`}
            variant="outline"
            size="sm"
          >
            <ChartLineUp size={16} />
            View results
          </Button>
          <Button
            as={Link}
            to={`/parent/meetings?student=${student.id}`}
            variant="outline"
            size="sm"
          >
            <Calendar size={16} />
            View meetings
          </Button>
          <Button
            as={Link}
            to={`/parent/library?student=${student.id}`}
            variant="outline"
            size="sm"
          >
            <BookOpen size={16} />
            View library
          </Button>
        </div>
      </CardContent>

      {payInvoice && (
        <PaymentModal
          isOpen={!!payInvoice}
          onClose={() => setPayInvoice(null)}
          invoice={payInvoice}
          amount={payInvoice.balanceAmount}
          onSuccess={() => {
            window.location.reload();
          }}
        />
      )}
    </Card>
  );
};

const ParentDashboard = () => {
  const { data, loading, error } = useFetch('/students/my-children');
  const students = useMemo(() => data || [], [data]);
  const shouldReduceMotion = useReducedMotion();

  const wrapperProps = shouldReduceMotion
    ? {}
    : { variants: containerVariants, initial: 'hidden', animate: 'visible' };
  const itemProps = shouldReduceMotion ? {} : { variants: itemVariants };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-danger-200 bg-danger-50 p-6 text-danger-700">
        Failed to load parent portal: {error}
      </div>
    );
  }

  return (
    <motion.div className="space-y-6" {...wrapperProps}>
      <motion.div {...itemProps}>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Parent Portal</h1>
          <p className="mt-1 text-sm text-zinc-500">
            View your children's performance, fees, meetings and library books
          </p>
        </div>
      </motion.div>

      {students.length === 0 ? (
        <motion.div {...itemProps}>
          <Card>
            <CardContent className="p-8">
              <EmptyState
                icon={StudentIcon}
                title="No children linked"
                description="Your guardian profile is not linked to any student yet. Please contact the school administration."
              />
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div className="space-y-4" {...itemProps}>
          {students.map((student) => (
            <ChildCard key={student.id} student={student} />
          ))}
        </motion.div>
      )}
    </motion.div>
  );
};

export default ParentDashboard;
