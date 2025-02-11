import React, { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  ArrowLeft,
  PencilSimple,
  User,
  Calendar,
  Student as StudentIcon,
  Phone,
  MapPin,
  FileText,
  TrendUp,
  CurrencyInr,
  Trophy,
  DownloadSimple,
} from '@phosphor-icons/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import useFetch from '../../hooks/useFetch';
import api from '../../services/api';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import StudentForm from './StudentForm';

const STATUS_VARIANTS = {
  active: 'success',
  inactive: 'neutral',
  transferred: 'danger',
  graduated: 'info',
  suspended: 'warning',
};

const STATUS_LABELS = {
  active: 'Active',
  inactive: 'Inactive',
  transferred: 'Transferred',
  graduated: 'Graduated',
  suspended: 'Suspended',
};

const TABS = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'attendance', label: 'Attendance', icon: TrendUp },
  { id: 'fees', label: 'Fees', icon: CurrencyInr },
  { id: 'results', label: 'Results', icon: Trophy },
];

const containerVariants = {
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

const formatCurrency = (value) => {
  const amount = Number(value) || 0;
  return `KSh${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const InfoRow = ({ icon: Icon, label, value, href }) => (
  <div className="flex items-start gap-3 py-2">
    <Icon size={18} className="mt-0.5 shrink-0 text-zinc-400" />
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      {href ? (
        <a href={href} className="text-sm font-medium text-accent-700 hover:underline">
          {value}
        </a>
      ) : (
        <p className="text-sm font-medium text-zinc-900">{value || '-'}</p>
      )}
    </div>
  </div>
);

const SectionCard = ({ title, children }) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

const StatBox = ({ label, value, variant = 'neutral' }) => {
  const variantClasses = {
    neutral: 'bg-zinc-50 text-zinc-900',
    success: 'bg-emerald-50 text-emerald-700',
    danger: 'bg-red-50 text-red-700',
    warning: 'bg-amber-50 text-amber-700',
    info: 'bg-blue-50 text-blue-700',
  };
  return (
    <div className={`rounded-xl border border-zinc-100 p-4 text-center ${variantClasses[variant]}`}>
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums tracking-tight">{value}</p>
    </div>
  );
};

const FeeStatusBadge = ({ status }) => {
  const variant =
    status === 'paid' ? 'success' : status === 'partial' ? 'warning' : status === 'overdue' ? 'danger' : 'neutral';
  return (
    <Badge variant={variant} className="capitalize">
      {status || 'Pending'}
    </Badge>
  );
};

const StudentDetail = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const isEdit = searchParams.get('edit') === 'true';
  const [activeTab, setActiveTab] = useState('overview');
  const shouldReduceMotion = useReducedMotion();

  const {
    data: studentData,
    loading,
    error,
    refetch,
  } = useFetch(`/students/${id}`);

  const { data: attendanceData, loading: attendanceLoading } = useFetch(
    activeTab === 'attendance' ? `/students/${id}/attendance` : null
  );

  const { data: feesData, loading: feesLoading } = useFetch(
    activeTab === 'fees' ? `/students/${id}/fees` : null
  );

  const { data: resultsData, loading: resultsLoading } = useFetch(
    activeTab === 'results' ? `/students/${id}/results` : null
  );

  const student = useMemo(() => studentData?.student || studentData || {}, [studentData]);
  const attendanceSummary = studentData?.attendanceSummary || {};
  const feeSummary = studentData?.feeSummary || {};
  const recentMarks = studentData?.recentMarks || [];

  const getClassLabel = () => {
    const cls = student.class;
    const section = student.sectionName || student.section?.name;
    if (typeof cls === 'object' && cls) {
      return `${cls.name}${section ? ` - ${section}` : ''}`;
    }
    return [cls, section].filter(Boolean).join(' - ') || '-';
  };

  const getAcademicYear = () => {
    const ay = student.academicYear;
    if (typeof ay === 'object' && ay) return ay.name;
    return ay || '-';
  };

  const getName = () =>
    student.fullName || [student.firstName, student.lastName].filter(Boolean).join(' ') || 'Student';

  const getInitials = (name) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const exitEdit = () => {
    setSearchParams({}, { replace: true });
  };

  const renderOverview = () => (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <SectionCard title="Personal information">
        <InfoRow icon={User} label="Full name" value={getName()} />
        <InfoRow
          icon={Calendar}
          label="Date of birth"
          value={student.dob ? format(new Date(student.dob), 'dd MMM yyyy') : '-'}
        />
        <InfoRow icon={StudentIcon} label="Gender" value={student.gender ? `${student.gender}` : '-'} />
        <InfoRow icon={FileText} label="Blood group" value={student.bloodGroup || '-'} />
        <InfoRow icon={FileText} label="Religion" value={student.religion || '-'} />
        <InfoRow icon={FileText} label="Category" value={student.category || '-'} />
        <InfoRow icon={FileText} label="National ID" value={student.aadharNumber || '-'} />
      </SectionCard>

      <SectionCard title="Academic information">
        <InfoRow icon={FileText} label="Admission number" value={student.admissionNo || '-'} />
        <InfoRow icon={FileText} label="Roll number" value={student.rollNo || '-'} />
        <InfoRow icon={Calendar} label="Academic year" value={getAcademicYear()} />
        <InfoRow icon={StudentIcon} label="Current class" value={getClassLabel()} />
        <InfoRow icon={FileText} label="Previous school" value={student.previousSchool || '-'} />
        <InfoRow
          icon={FileText}
          label="Previous class percentage"
          value={student.previousClassPercentage ? `${student.previousClassPercentage}%` : '-'}
        />
      </SectionCard>

      <SectionCard title="Guardian information">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Father</p>
            <InfoRow icon={User} label="Name" value={student.fatherName} />
            <InfoRow icon={Phone} label="Phone" value={student.fatherPhone} href={student.fatherPhone ? `tel:${student.fatherPhone}` : undefined} />
            <InfoRow icon={FileText} label="Occupation" value={student.fatherOccupation} />
          </div>
          <div className="border-t border-zinc-100 pt-3">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Mother</p>
            <InfoRow icon={User} label="Name" value={student.motherName} />
            <InfoRow icon={Phone} label="Phone" value={student.motherPhone} href={student.motherPhone ? `tel:${student.motherPhone}` : undefined} />
            <InfoRow icon={FileText} label="Occupation" value={student.motherOccupation} />
          </div>
          {(student.guardianName || student.guardianPhone) && (
            <div className="border-t border-zinc-100 pt-3">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Local guardian</p>
              <InfoRow icon={User} label="Name" value={student.guardianName} />
              <InfoRow icon={Phone} label="Phone" value={student.guardianPhone} href={student.guardianPhone ? `tel:${student.guardianPhone}` : undefined} />
              <InfoRow icon={FileText} label="Relation" value={student.guardianRelation} />
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Address">
        <InfoRow icon={MapPin} label="Address" value={student.address} />
        <InfoRow icon={MapPin} label="City" value={student.city} />
        <InfoRow icon={MapPin} label="County" value={student.state} />
        <InfoRow icon={MapPin} label="Postal Code" value={student.pincode} />
      </SectionCard>
    </div>
  );

  const renderAttendance = () => {
    const records = attendanceData?.attendance || [];
    const summary = attendanceData?.summary || attendanceSummary || {};
    const data = [
      { name: 'Present', value: summary.present || 0, color: '#059669' },
      { name: 'Absent', value: summary.absent || 0, color: '#dc2626' },
      { name: 'Late', value: summary.late || 0, color: '#d97706' },
      { name: 'Half day', value: summary.halfDay || 0, color: '#2563eb' },
      { name: 'Leave', value: summary.onLeave || 0, color: '#71717a' },
    ].filter((d) => d.value > 0);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatBox label="Total days" value={summary.total || 0} />
          <StatBox label="Present" value={summary.present || 0} variant="success" />
          <StatBox label="Absent" value={summary.absent || 0} variant="danger" />
          <StatBox label="Attendance %" value={`${summary.percentage || 0}%`} variant="info" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Attendance summary</CardTitle>
          </CardHeader>
          <CardContent>
            {data.length === 0 ? (
              <EmptyState title="No attendance records" description="Attendance data will appear once recorded." />
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#52525b' }} axisLine={{ stroke: '#e4e4e7' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#52525b' }} axisLine={{ stroke: '#e4e4e7' }} />
                    <Tooltip
                      cursor={{ fill: '#f4f4f5' }}
                      contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e4e4e7' }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent attendance</CardTitle>
          </CardHeader>
          <CardContent>
            {attendanceLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            ) : records.length === 0 ? (
              <EmptyState title="No recent records" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100">
                      <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Date</th>
                      <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Status</th>
                      <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Subject</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {records.slice(0, 10).map((record) => (
                      <tr key={record._id} className="hover:bg-zinc-50/60">
                        <td className="px-4 py-3">
                          {record.date ? format(new Date(record.date), 'dd MMM yyyy') : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              record.status === 'present'
                                ? 'success'
                                : record.status === 'absent'
                                ? 'danger'
                                : record.status === 'late'
                                ? 'warning'
                                : 'neutral'
                            }
                            className="capitalize"
                          >
                            {record.status?.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-zinc-600">{record.subject?.name || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderFees = () => {
    const invoices = feesData?.invoices || [];
    const summary = feesData?.summary || feeSummary || {};
    const status =
      summary.totalBalance <= 0 ? 'paid' : summary.totalPaid > 0 ? 'partial' : 'pending';

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatBox label="Total fee" value={formatCurrency(summary.totalInvoiced)} />
          <StatBox label="Paid" value={formatCurrency(summary.totalPaid)} variant="success" />
          <StatBox label="Balance" value={formatCurrency(summary.totalBalance)} variant="warning" />
          <StatBox label="Status" value={<span className="capitalize">{status}</span>} variant={status === 'paid' ? 'success' : status === 'partial' ? 'warning' : 'danger'} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Fee invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {feesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            ) : invoices.length === 0 ? (
              <EmptyState title="No invoices" description="Fee invoices will appear once generated." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50/60">
                      <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Fee head</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Amount</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Paid</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Balance</th>
                      <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {invoices.map((invoice) => (
                      <tr key={invoice._id} className="hover:bg-zinc-50/60">
                        <td className="px-4 py-3 font-medium text-zinc-900">
                          {invoice.feeStructure?.name || invoice.name || 'Fee'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">
                          {formatCurrency(invoice.totalAmount)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">
                          {formatCurrency(invoice.paidAmount)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">
                          {formatCurrency(invoice.balanceAmount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <FeeStatusBadge status={invoice.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderResults = () => {
    const marks = resultsData?.marks || recentMarks || [];
    const totals = marks.reduce(
      (acc, m) => ({
        obtained: acc.obtained + (m.marksObtained ?? m.marks ?? 0),
        max: acc.max + (m.maxMarks ?? m.max ?? 0),
      }),
      { obtained: 0, max: 0 }
    );
    const percentage = totals.max > 0 ? ((totals.obtained / totals.max) * 100).toFixed(1) : 0;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatBox label="Total marks" value={`${totals.obtained}/${totals.max}`} />
          <StatBox label="Percentage" value={`${percentage}%`} variant="success" />
          <StatBox label="Exams" value={marks.length} variant="info" />
          <StatBox label="Grade" value={percentage >= 75 ? 'A' : percentage >= 60 ? 'B' : percentage >= 40 ? 'C' : '-'} variant="warning" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Exam results</CardTitle>
          </CardHeader>
          <CardContent>
            {resultsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            ) : marks.length === 0 ? (
              <EmptyState title="No results" description="Exam results will appear once marks are entered." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50/60">
                      <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Exam</th>
                      <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Subject</th>
                      <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">Marks</th>
                      <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">Max</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {marks.map((mark) => {
                      const obtained = mark.marksObtained ?? mark.marks ?? 0;
                      const max = mark.maxMarks ?? mark.max ?? 0;
                      const pct = max > 0 ? (obtained / max) * 100 : 0;
                      return (
                        <tr key={mark._id} className="hover:bg-zinc-50/60">
                          <td className="px-4 py-3 font-medium text-zinc-900">
                            {mark.exam?.name || '-'}
                          </td>
                          <td className="px-4 py-3 text-zinc-700">
                            {mark.subject?.name || mark.subjectName || '-'}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold tabular-nums">{obtained}</td>
                          <td className="px-4 py-3 text-center text-zinc-500 tabular-nums">{max}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-3">
                              <span className="text-xs font-medium text-zinc-600">{pct.toFixed(0)}%</span>
                              <div className="w-24 rounded-full bg-zinc-100">
                                <div
                                  className="h-2 rounded-full bg-accent-600 transition-all"
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const tabContent = {
    overview: renderOverview,
    attendance: renderAttendance,
    fees: renderFees,
    results: renderResults,
  };

  if (isEdit) {
    if (loading) {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Card className="p-5">
            <Skeleton className="mb-6 h-10 w-full" />
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          </Card>
        </div>
      );
    }
    if (error) {
      return (
        <div className="rounded-lg border border-danger-200 bg-danger-50 p-6 text-center">
          <p className="text-sm font-medium text-danger-700">{error}</p>
          <Button onClick={exitEdit} variant="outline" className="mt-4">
            Back to profile
          </Button>
        </div>
      );
    }
    return (
      <StudentForm
        mode="edit"
        studentId={id}
        initialData={student}
        onSuccess={() => {
          refetch();
          exitEdit();
        }}
      />
    );
  }

  const wrapperProps = shouldReduceMotion
    ? {}
    : { variants: containerVariants, initial: 'hidden', animate: 'visible' };
  const itemProps = shouldReduceMotion ? {} : { variants: itemVariants };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-danger-200 bg-danger-50 p-6 text-center">
        <p className="text-sm font-medium text-danger-700">{error}</p>
        <Button as={Link} to="/students" variant="outline" className="mt-4">
          Back to students
        </Button>
      </div>
    );
  }

  return (
    <motion.div className="space-y-6" {...wrapperProps}>
      <motion.div
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        {...itemProps}
      >
        <div className="flex items-center gap-3">
          <Button as={Link} to="/students" variant="ghost" size="icon" aria-label="Go back">
            <ArrowLeft size={20} />
          </Button>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-subtle text-xl font-semibold text-accent-700">
              {getInitials(getName())}
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{getName()}</h1>
              <p className="mt-1 text-sm text-zinc-500">
                Admission {student.admissionNo || '-'} · {getClassLabel()}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const response = await api.get(`/students/${id}/report-card.pdf`, {
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
            <DownloadSimple size={18} />
            Report card
          </Button>
          <Badge variant={STATUS_VARIANTS[student.status] || 'neutral'}>
            {STATUS_LABELS[student.status] || student.status || 'Inactive'}
          </Badge>
          <Button as={Link} to={`/students/${id}?edit=true`} variant="outline">
            <PencilSimple size={18} />
            Edit
          </Button>
        </div>
      </motion.div>

      <motion.div {...itemProps}>
        <Card className="overflow-hidden">
          <div className="flex border-b border-zinc-100 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 border-b-2 px-5 py-3.5 text-sm font-medium transition-colors whitespace-nowrap ${
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
          <div className="p-5 sm:p-6">{tabContent[activeTab]()}</div>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default StudentDetail;
