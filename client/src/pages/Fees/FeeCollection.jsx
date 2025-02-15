import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  MagnifyingGlass,
  User,
  Phone,
  GraduationCap,
  Receipt,
  Plus,
  Wallet,
  Clock,
  DownloadSimple,
  CreditCard,
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import useFetch from '../../hooks/useFetch';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import Avatar from '../../components/ui/Avatar';
import PaymentModal from '../../components/Payment/PaymentModal';

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'online', label: 'Online' },
  { value: 'dd', label: 'Demand Draft' },
];

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(value || 0);

const statusVariant = (status) => {
  switch (status) {
    case 'paid':
      return 'success';
    case 'partial':
      return 'warning';
    case 'overdue':
      return 'danger';
    case 'cancelled':
      return 'neutral';
    default:
      return 'info';
  }
};

const statusLabel = (status) =>
  (status || 'pending')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

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

const FeeCollection = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [foundStudent, setFoundStudent] = useState(null);
  const [studentUrl, setStudentUrl] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showOnlinePaymentModal, setShowOnlinePaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMode: 'cash',
    transactionId: '',
    paidDate: new Date().toISOString().split('T')[0],
    remarks: '',
    waiverApproved: false,
  });
  const [processing, setProcessing] = useState(false);

  const {
    data: ledger,
    loading: ledgerLoading,
    error: ledgerError,
    refetch: refetchLedger,
  } = useFetch(studentUrl);

  const invoices = useMemo(() => ledger?.invoices || [], [ledger]);
  const payments = useMemo(() => ledger?.payments || [], [ledger]);
  const summary = ledger?.summary;

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Enter admission number or name to search');
      return;
    }
    try {
      const res = await api.get(`/students/search?q=${encodeURIComponent(searchQuery)}`);
      const students = res.data.data?.students;
      if (!students || students.length === 0) {
        setFoundStudent(null);
        setStudentUrl(null);
        toast.error('Student not found');
        return;
      }
      const student = students[0];
      setFoundStudent(student);
      setStudentUrl(`/fees/student/${student._id}/ledger`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to search student');
    }
  };

  const downloadReceipt = (paymentId) => {
    window.open(`${api.defaults.baseURL}/fees/payments/${paymentId}/receipt.pdf`, '_blank');
  };

  const openPayment = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentForm({
      amount: invoice.balanceAmount || 0,
      paymentMode: 'cash',
      transactionId: '',
      paidDate: new Date().toISOString().split('T')[0],
      remarks: '',
      waiverApproved: false,
    });
    setShowPaymentModal(true);
  };

  const openOnlinePayment = (invoice) => {
    setSelectedInvoice(invoice);
    setShowOnlinePaymentModal(true);
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    if (!foundStudent) return;

    setProcessing(true);
    try {
      await api.post('/fees/payments', {
        invoice: selectedInvoice._id,
        amount: Number(paymentForm.amount),
        paymentMode: paymentForm.paymentMode,
        transactionId: paymentForm.transactionId,
        paidDate: paymentForm.paidDate,
        remarks: paymentForm.remarks,
        waiverApproved: paymentForm.waiverApproved,
      });
      toast.success('Payment recorded successfully');
      setShowPaymentModal(false);
      refetchLedger();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setProcessing(false);
    }
  };

  const studentName = foundStudent
    ? foundStudent.fullName ||
      [foundStudent.firstName, foundStudent.lastName].filter(Boolean).join(' ')
    : '';

  const classLabel = useMemo(() => {
    if (!foundStudent) return '';
    const cls =
      typeof foundStudent.class === 'object' && foundStudent.class
        ? foundStudent.class.name
        : foundStudent.class;
    const sec =
      typeof foundStudent.section === 'object' && foundStudent.section
        ? foundStudent.section.name
        : foundStudent.sectionName || foundStudent.section;
    return [cls, sec].filter(Boolean).join(' - ') || '-';
  }, [foundStudent]);

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Fee Collection</h1>
        <p className="mt-1 text-sm text-zinc-500">Search student and record fee payments</p>
      </div>

      {/* Search */}
      <motion.div variants={cardVariants}>
        <Card>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <MagnifyingGlass
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <input
                  type="text"
                  placeholder="Search by admission number or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-600/20"
                />
              </div>
              <Button onClick={handleSearch}>
                <MagnifyingGlass size={18} weight="bold" />
                Search
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Student Info */}
      {foundStudent && (
        <motion.div variants={cardVariants}>
          <Card>
            <CardContent>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Avatar name={studentName} size="lg" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-zinc-900">{studentName}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-600">
                    <span className="flex items-center gap-1">
                      <User size={14} />
                      {foundStudent.admissionNo || '-'}
                    </span>
                    <span className="flex items-center gap-1">
                      <GraduationCap size={14} />
                      {classLabel}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone size={14} />
                      {foundStudent.fatherPhone || foundStudent.phone || '-'}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 border-t border-zinc-100 pt-4 sm:border-t-0 sm:pt-0">
                  <div className="text-center">
                    <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Total
                    </p>
                    <p className="mt-0.5 font-mono text-sm font-semibold text-zinc-900">
                      {formatCurrency(summary?.netAmount || 0)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Paid
                    </p>
                    <p className="mt-0.5 font-mono text-sm font-semibold text-accent-700">
                      {formatCurrency(summary?.paidAmount || 0)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Balance
                    </p>
                    <p className="mt-0.5 font-mono text-sm font-semibold text-danger-600">
                      {formatCurrency(summary?.balanceAmount || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Invoices */}
      <motion.div variants={cardVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet size={18} className="text-zinc-400" />
              Fee Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ledgerError && renderError(ledgerError)}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 text-left">
                    <th className="px-3 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Invoice
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Total
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Concession
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Net
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Paid
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Balance
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Due Date
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Status
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {ledgerLoading &&
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        <td className="px-3 py-3">
                          <Skeleton className="h-4 w-28" />
                        </td>
                        <td className="px-3 py-3">
                          <Skeleton className="ml-auto h-4 w-20" />
                        </td>
                        <td className="px-3 py-3">
                          <Skeleton className="ml-auto h-4 w-20" />
                        </td>
                        <td className="px-3 py-3">
                          <Skeleton className="ml-auto h-4 w-20" />
                        </td>
                        <td className="px-3 py-3">
                          <Skeleton className="ml-auto h-4 w-20" />
                        </td>
                        <td className="px-3 py-3">
                          <Skeleton className="ml-auto h-4 w-20" />
                        </td>
                        <td className="px-3 py-3">
                          <Skeleton className="mx-auto h-4 w-20" />
                        </td>
                        <td className="px-3 py-3">
                          <Skeleton className="mx-auto h-5 w-16 rounded-full" />
                        </td>
                        <td className="px-3 py-3">
                          <Skeleton className="mx-auto h-4 w-16" />
                        </td>
                      </tr>
                    ))}
                  {!ledgerLoading && invoices.length === 0 && (
                    <tr>
                      <td colSpan={9}>
                        <EmptyState
                          title="No invoices found"
                          description="Search for a student to view their fee invoices."
                          icon={Clock}
                        />
                      </td>
                    </tr>
                  )}
                  {!ledgerLoading &&
                    invoices.map((inv) => (
                      <tr key={inv._id} className="transition-colors hover:bg-zinc-50/60">
                        <td className="px-3 py-3 font-medium text-zinc-900">
                          <div>{inv.invoiceNo}</div>
                          <div className="text-xs text-zinc-500">
                            {inv.items
                              ?.map((it) =>
                                typeof it.feeHead === 'object' ? it.feeHead.name : 'Fee'
                              )
                              .join(', ')}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-zinc-600">
                          {formatCurrency(inv.totalAmount)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-zinc-600">
                          {formatCurrency(inv.concessionAmount)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-zinc-900">
                          {formatCurrency(inv.netAmount)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-accent-700">
                          {formatCurrency(inv.paidAmount)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-medium text-zinc-900">
                          {formatCurrency(inv.balanceAmount)}
                        </td>
                        <td className="px-3 py-3 text-center text-zinc-600">
                          {inv.dueDate ? format(new Date(inv.dueDate), 'dd MMM yyyy') : '-'}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <Badge variant={statusVariant(inv.status)}>{statusLabel(inv.status)}</Badge>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {inv.balanceAmount > 0 && inv.status !== 'cancelled' && (
                              <>
                                <button
                                  onClick={() => openPayment(inv)}
                                  className="rounded-lg p-1.5 text-accent-700 transition-colors hover:bg-accent-50"
                                  aria-label="Record payment"
                                  title="Record payment"
                                >
                                  <Plus size={16} weight="bold" />
                                </button>
                                <button
                                  onClick={() => openOnlinePayment(inv)}
                                  className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-zinc-100"
                                  aria-label="Online payment"
                                  title="Online payment (M-Pesa / Card)"
                                >
                                  <CreditCard size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Payments */}
      {foundStudent && payments.length > 0 && (
        <motion.div variants={cardVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt size={18} className="text-zinc-400" />
                Recent Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 text-left">
                      <th className="px-3 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Receipt
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Amount
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Mode
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Date
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Status
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Receipt
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {payments.slice(0, 5).map((payment) => (
                      <tr key={payment._id} className="transition-colors hover:bg-zinc-50/60">
                        <td className="px-3 py-3 font-medium text-zinc-900">{payment.receiptNo}</td>
                        <td className="px-3 py-3 text-right font-mono text-zinc-900">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-3 py-3 text-center capitalize text-zinc-600">
                          {payment.paymentMode?.replace(/_/g, ' ')}
                        </td>
                        <td className="px-3 py-3 text-center text-zinc-600">
                          {payment.paidDate ? format(new Date(payment.paidDate), 'dd MMM yyyy') : '-'}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <Badge variant={payment.status === 'completed' ? 'success' : 'neutral'}>
                            {statusLabel(payment.status)}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <button
                            onClick={() => downloadReceipt(payment._id)}
                            className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-accent-700"
                            title="Download receipt PDF"
                          >
                            <DownloadSimple size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Online Payment Modal */}
      <PaymentModal
        isOpen={showOnlinePaymentModal}
        onClose={() => setShowOnlinePaymentModal(false)}
        invoice={selectedInvoice}
        amount={selectedInvoice?.balanceAmount || 0}
        onSuccess={() => {
          setShowOnlinePaymentModal(false);
          refetchLedger();
        }}
      />

      {/* Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Record Payment"
        size="md"
      >
        {selectedInvoice && (
          <form onSubmit={handlePayment} className="space-y-4">
            <div className="rounded-lg bg-zinc-50 p-4 text-sm">
              <p className="text-zinc-600">
                Invoice: <span className="font-medium text-zinc-900">{selectedInvoice.invoiceNo}</span>
              </p>
              <p className="mt-1 text-zinc-600">
                Balance:{' '}
                <span className="font-medium text-danger-600">
                  {formatCurrency(selectedInvoice.balanceAmount)}
                </span>
              </p>
            </div>
            <Input
              label="Amount"
              type="number"
              min="1"
              max={selectedInvoice.balanceAmount}
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              placeholder="Enter amount"
              required
            />
            <Select
              label="Payment Mode"
              value={paymentForm.paymentMode}
              onChange={(e) => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}
              options={PAYMENT_MODES}
            />
            <Input
              label="Transaction ID / Cheque No"
              value={paymentForm.transactionId}
              onChange={(e) => setPaymentForm({ ...paymentForm, transactionId: e.target.value })}
              placeholder="Optional reference number"
            />
            <Input
              label="Date"
              type="date"
              value={paymentForm.paidDate}
              onChange={(e) => setPaymentForm({ ...paymentForm, paidDate: e.target.value })}
              required
            />
            <Input
              label="Remarks"
              value={paymentForm.remarks}
              onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
              placeholder="Optional notes"
            />
            <div className="flex items-center gap-2">
              <input
                id="waiverApproved"
                type="checkbox"
                checked={paymentForm.waiverApproved}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, waiverApproved: e.target.checked })
                }
                className="h-4 w-4 rounded border-zinc-300 text-accent-600 focus:ring-accent-600/20"
              />
              <label htmlFor="waiverApproved" className="text-sm text-zinc-700">
                Waiver approved (allow payment below 50% of balance)
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPaymentModal(false)}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={processing}>
                Record Payment
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </motion.div>
  );
};

export default FeeCollection;
