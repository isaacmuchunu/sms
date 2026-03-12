import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { format } from 'date-fns';
import {
  Student as StudentIcon,
  CurrencyInr,
  CreditCard,
  DownloadSimple,
  EnvelopeSimple,
  FileText,
  CheckCircle,
  Warning,
  Clock,
  XCircle,
} from '@phosphor-icons/react';
import api from '../../services/api';
import useFetch from '../../hooks/useFetch';
import useSelectedStudent from '../../hooks/useSelectedStudent';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import PaymentModal from '../../components/Payment/PaymentModal';
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

const invoiceStatusConfig = {
  paid: { label: 'Paid', variant: 'success', icon: CheckCircle },
  pending: { label: 'Pending', variant: 'warning', icon: Clock },
  partial: { label: 'Partial', variant: 'info', icon: Clock },
  overdue: { label: 'Overdue', variant: 'danger', icon: Warning },
  cancelled: { label: 'Cancelled', variant: 'neutral', icon: XCircle },
  draft: { label: 'Draft', variant: 'neutral', icon: FileText },
};

const InvoiceStatusBadge = ({ status }) => {
  const config = invoiceStatusConfig[status] || invoiceStatusConfig.draft;
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1 capitalize">
      <Icon size={14} />
      {config.label}
    </Badge>
  );
};

const PaymentStatusBadge = ({ status }) => {
  const isCompleted = status === 'completed' || status === 'success';
  return (
    <Badge variant={isCompleted ? 'success' : 'neutral'} className="gap-1 capitalize">
      {isCompleted ? <CheckCircle size={14} /> : <Clock size={14} />}
      {status || 'Pending'}
    </Badge>
  );
};

const ParentFees = () => {
  const { data, loading: loadingChildren, error: childrenError } = useFetch('/students/my-children');
  const students = useMemo(() => data || [], [data]);
  const { selectedId, selectedStudent, setSelectedId } = useSelectedStudent(students);

  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [payInvoice, setPayInvoice] = useState(null);
  const [sendingReceipt, setSendingReceipt] = useState({});
  const shouldReduceMotion = useReducedMotion();

  const fetchFees = async () => {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/students/${selectedId}/fees`);
      const payload = response.data.data || {};
      setInvoices(payload.invoices || []);
      setSummary(payload.summary || null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load fees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const wrapperProps = shouldReduceMotion
    ? {}
    : { variants: containerVariants, initial: 'hidden', animate: 'visible' };
  const itemProps = shouldReduceMotion ? {} : { variants: itemVariants };

  const childOptions = useMemo(
    () => students.map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName}` })),
    [students]
  );

  const outstandingBalance = summary?.totalBalance || 0;

  const unpaidInvoices = invoices.filter(
    (inv) => inv.status !== 'paid' && inv.status !== 'cancelled' && (inv.balanceAmount || 0) > 0
  );

  const paymentHistory = summary?.paymentHistory || [];

  const handleDownloadReceipt = async (paymentId) => {
    try {
      const response = await api.get(`/fees/payments/${paymentId}/receipt.pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to download receipt');
    }
  };

  const handleEmailReceipt = async (paymentId) => {
    setSendingReceipt((prev) => ({ ...prev, [paymentId]: true }));
    try {
      await api.post(`/payments/${paymentId}/receipt/send`);
      toast.success('Receipt emailed successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to email receipt');
    } finally {
      setSendingReceipt((prev) => ({ ...prev, [paymentId]: false }));
    }
  };

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
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Fees & Payments</h1>
            <p className="mt-1 text-sm text-zinc-500">Manage fees and payment history</p>
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

      <motion.div {...itemProps}>
        <Card className={outstandingBalance > 0 ? 'border-danger-200' : 'border-emerald-200'}>
          <CardContent className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm text-zinc-500">Outstanding balance</p>
              <p
                className={`text-3xl font-bold ${
                  outstandingBalance > 0 ? 'text-danger-600' : 'text-emerald-600'
                }`}
              >
                {formatCurrency(outstandingBalance)}
              </p>
            </div>
            {unpaidInvoices.length > 0 && (
              <Button onClick={() => setPayInvoice({ ...unpaidInvoices[0], _id: unpaidInvoices[0].id })}>
                <CreditCard size={18} />
                Pay now
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {loading ? (
        <Skeleton className="h-64 w-full rounded-lg" />
      ) : error ? (
        <div className="rounded-lg border border-danger-200 bg-danger-50 p-6 text-danger-700">
          {error}
        </div>
      ) : (
        <>
          <motion.div {...itemProps}>
            <Card>
              <CardHeader>
                <CardTitle>Invoices</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {invoices.length === 0 ? (
                  <EmptyState
                    icon={FileText}
                    title="No invoices"
                    description="There are no fee invoices for the selected child."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-50 text-zinc-500">
                        <tr>
                          <th className="px-5 py-3 font-medium">Invoice #</th>
                          <th className="px-5 py-3 font-medium">Due date</th>
                          <th className="px-5 py-3 font-medium">Total</th>
                          <th className="px-5 py-3 font-medium">Balance</th>
                          <th className="px-5 py-3 font-medium">Status</th>
                          <th className="px-5 py-3 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {invoices.map((invoice) => {
                          const canPay =
                            invoice.status !== 'paid' &&
                            invoice.status !== 'cancelled' &&
                            (invoice.balanceAmount || 0) > 0;
                          return (
                            <tr key={invoice.id} className="hover:bg-zinc-50/60">
                              <td className="px-5 py-3 font-medium text-zinc-900">
                                {invoice.invoiceNo || invoice.id}
                              </td>
                              <td className="px-5 py-3 text-zinc-600">
                                {invoice.dueDate
                                  ? format(new Date(invoice.dueDate), 'dd MMM yyyy')
                                  : '-'}
                              </td>
                              <td className="px-5 py-3 text-zinc-900">
                                {formatCurrency(invoice.netAmount || invoice.totalAmount)}
                              </td>
                              <td className="px-5 py-3 text-zinc-900">
                                {formatCurrency(invoice.balanceAmount)}
                              </td>
                              <td className="px-5 py-3">
                                <InvoiceStatusBadge status={invoice.status} />
                              </td>
                              <td className="px-5 py-3 text-right">
                                {canPay && (
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      setPayInvoice({ ...invoice, _id: invoice.id })
                                    }
                                  >
                                    <CreditCard size={14} />
                                    Pay now
                                  </Button>
                                )}
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
          </motion.div>

          <motion.div {...itemProps}>
            <Card>
              <CardHeader>
                <CardTitle>Payment history</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {paymentHistory.length === 0 ? (
                  <EmptyState
                    icon={CurrencyInr}
                    title="No payments yet"
                    description="There are no recorded payments for the selected child."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-50 text-zinc-500">
                        <tr>
                          <th className="px-5 py-3 font-medium">Receipt #</th>
                          <th className="px-5 py-3 font-medium">Date</th>
                          <th className="px-5 py-3 font-medium">Amount</th>
                          <th className="px-5 py-3 font-medium">Mode</th>
                          <th className="px-5 py-3 font-medium">Status</th>
                          <th className="px-5 py-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {paymentHistory.map((payment) => (
                          <tr key={payment.id} className="hover:bg-zinc-50/60">
                            <td className="px-5 py-3 font-medium text-zinc-900">
                              {payment.receiptNo || payment.id}
                            </td>
                            <td className="px-5 py-3 text-zinc-600">
                              {payment.paidDate
                                ? format(new Date(payment.paidDate), 'dd MMM yyyy')
                                : '-'}
                            </td>
                            <td className="px-5 py-3 text-zinc-900">
                              {formatCurrency(payment.amount)}
                            </td>
                            <td className="px-5 py-3 capitalize text-zinc-600">
                              {payment.paymentMode || 'online'}
                            </td>
                            <td className="px-5 py-3">
                              <PaymentStatusBadge status={payment.status} />
                            </td>
                            <td className="px-5 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownloadReceipt(payment.id)}
                                >
                                  <DownloadSimple size={14} />
                                  Receipt
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  isLoading={sendingReceipt[payment.id]}
                                  onClick={() => handleEmailReceipt(payment.id)}
                                >
                                  <EnvelopeSimple size={14} />
                                  Email
                                </Button>
                              </div>
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
        </>
      )}

      {payInvoice && (
        <PaymentModal
          isOpen={!!payInvoice}
          onClose={() => setPayInvoice(null)}
          invoice={payInvoice}
          amount={payInvoice.balanceAmount}
          onSuccess={() => {
            setPayInvoice(null);
            fetchFees();
          }}
        />
      )}
    </motion.div>
  );
};

export default ParentFees;
