import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { format } from 'date-fns';
import {
  Student as StudentIcon,
  CalendarCheck,
  CheckCircle,
  XCircle,
  Clock,
  Sun,
  Airplane,
} from '@phosphor-icons/react';
import api from '../../services/api';
import useFetch from '../../hooks/useFetch';
import useSelectedStudent from '../../hooks/useSelectedStudent';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Select from '../../components/ui/Select';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.23, 1, 0.32, 1] } },
};

const statusConfig = {
  present: { label: 'Present', variant: 'success', icon: CheckCircle },
  absent: { label: 'Absent', variant: 'danger', icon: XCircle },
  late: { label: 'Late', variant: 'warning', icon: Clock },
  half_day: { label: 'Half Day', variant: 'info', icon: Sun },
  on_leave: { label: 'On Leave', variant: 'neutral', icon: Airplane },
};

const AttendanceStatusBadge = ({ status }) => {
  const config = statusConfig[status] || statusConfig.present;
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1 capitalize">
      <Icon size={14} />
      {config.label}
    </Badge>
  );
};

const SummaryCard = ({ label, value, icon: Icon, variant = 'neutral' }) => (
  <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-card">
    <div className="mb-2 flex items-center gap-2 text-zinc-500">
      <Icon size={18} />
      <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
    </div>
    <p className="text-2xl font-bold text-zinc-900">{value}</p>
  </div>
);

const ParentAttendance = () => {
  const { data, loading: loadingChildren, error: childrenError } = useFetch('/students/my-children');
  const students = useMemo(() => data || [], [data]);
  const { selectedId, selectedStudent, setSelectedId } = useSelectedStudent(students);

  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    const fetchAttendance = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/students/${selectedId}/attendance`);
        const payload = response.data.data || {};
        if (!cancelled) {
          setRecords(payload.attendance || []);
          setSummary(payload.summary || null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || err.message || 'Failed to load attendance');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchAttendance();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const wrapperProps = shouldReduceMotion
    ? {}
    : { variants: containerVariants, initial: 'hidden', animate: 'visible' };
  const itemProps = shouldReduceMotion ? {} : { variants: itemVariants };

  const childOptions = useMemo(
    () => students.map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName}` })),
    [students]
  );

  if (loadingChildren) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (childrenError) {
    return (
      <div className="rounded-lg border border-danger-200 bg-danger-50 p-6 text-danger-700">
        Failed to load children: {childrenError}
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <EmptyState
            icon={StudentIcon}
            title="No children linked"
            description="Your guardian profile is not linked to any student yet. Please contact the school administration."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div className="space-y-6" {...wrapperProps}>
      <motion.div {...itemProps}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Attendance</h1>
            <p className="mt-1 text-sm text-zinc-500">View your children's attendance records</p>
          </div>
          {students.length > 1 && (
            <div className="w-full sm:w-72">
              <Select
                label="Select child"
                options={childOptions}
                value={selectedId || ''}
                onChange={(e) => setSelectedId(e.target.value)}
                startIcon={<StudentIcon size={18} />}
              />
            </div>
          )}
        </div>
      </motion.div>

      {selectedStudent && (
        <motion.div {...itemProps}>
          <Card className="bg-accent-50/40">
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-subtle text-sm font-semibold text-accent-700">
                {selectedStudent.firstName?.[0]}
                {selectedStudent.lastName?.[0]}
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">
                  {selectedStudent.firstName} {selectedStudent.lastName}
                </p>
                <p className="text-xs text-zinc-500">
                  {selectedStudent.admissionNo} · {selectedStudent.class?.name || '-'}{' '}
                  {selectedStudent.section?.name || ''}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {summary && (
        <motion.div {...itemProps}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <SummaryCard label="Total" value={summary.total} icon={CalendarCheck} />
            <SummaryCard label="Present" value={summary.present} icon={CheckCircle} />
            <SummaryCard label="Absent" value={summary.absent} icon={XCircle} />
            <SummaryCard label="Late" value={summary.late} icon={Clock} />
            <SummaryCard label="Half Day" value={summary.halfDay} icon={Sun} />
            <SummaryCard label="On Leave" value={summary.onLeave} icon={Airplane} />
          </div>
          <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-700">Attendance percentage</span>
              <span className="text-2xl font-bold text-accent-700">{summary.percentage}%</span>
            </div>
          </div>
        </motion.div>
      )}

      {loading ? (
        <Skeleton className="h-64 w-full rounded-lg" />
      ) : error ? (
        <div className="rounded-lg border border-danger-200 bg-danger-50 p-6 text-danger-700">
          {error}
        </div>
      ) : (
        <motion.div {...itemProps}>
          <Card>
            <CardHeader>
              <CardTitle>Attendance records</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {records.length === 0 ? (
                <EmptyState
                  icon={CalendarCheck}
                  title="No attendance records"
                  description="There are no attendance records for the selected child yet."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 text-zinc-500">
                      <tr>
                        <th className="px-5 py-3 font-medium">Date</th>
                        <th className="px-5 py-3 font-medium">Status</th>
                        <th className="px-5 py-3 font-medium">Class</th>
                        <th className="px-5 py-3 font-medium">Subject</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {records.map((record) => (
                        <tr key={record.id} className="hover:bg-zinc-50/60">
                          <td className="px-5 py-3 text-zinc-900">
                            {record.date ? format(new Date(record.date), 'dd MMM yyyy') : '-'}
                          </td>
                          <td className="px-5 py-3">
                            <AttendanceStatusBadge status={record.status} />
                          </td>
                          <td className="px-5 py-3 text-zinc-600">
                            {record.class?.name || '-'}
                          </td>
                          <td className="px-5 py-3 text-zinc-600">
                            {record.subject?.name || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ParentAttendance;
