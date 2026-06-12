import React, { useState } from 'react';
import { Search, IndianRupee, Receipt, Plus } from 'lucide-react';
import Modal from '../../components/Modal';
import InputField from '../../components/Form/InputField';
import SelectField from '../../components/Form/SelectField';
import api from '../../services/api';

const mockFeeLedger = [
  { _id: '1', head: 'Tuition Fee (Jan)', amount: 15000, dueDate: '2025-01-10', paid: 15000, status: 'Paid', balance: 0 },
  { _id: '2', head: 'Tuition Fee (Feb)', amount: 15000, dueDate: '2025-02-10', paid: 15000, status: 'Paid', balance: 0 },
  { _id: '3', head: 'Tuition Fee (Mar)', amount: 15000, dueDate: '2025-03-10', paid: 5000, status: 'Partial', balance: 10000 },
  { _id: '4', head: 'Exam Fee', amount: 2000, dueDate: '2025-02-01', paid: 0, status: 'Pending', balance: 2000 },
  { _id: '5', head: 'Transport Fee (Q1)', amount: 12000, dueDate: '2025-01-15', paid: 0, status: 'Overdue', balance: 12000 },
  { _id: '6', head: 'Library Fee', amount: 1000, dueDate: '2025-04-01', paid: 0, status: 'Pending', balance: 1000 },
];

const statusBadge = (status) => {
  const classes = {
    Paid: 'bg-emerald-50 text-emerald-700',
    Partial: 'bg-amber-50 text-amber-700',
    Pending: 'bg-blue-50 text-blue-700',
    Overdue: 'bg-red-50 text-red-700',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes[status] || classes.Pending}`}>
      {status}
    </span>
  );
};

const FeeCollection = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [foundStudent, setFoundStudent] = useState(null);
  const [feeLedger, setFeeLedger] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedFee, setSelectedFee] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', mode: 'cash', transactionId: '', date: new Date().toISOString().split('T')[0] });
  const [processing, setProcessing] = useState(false);

  const handleSearch = async () => {
    try {
      const res = await api.get(`/students/search?q=${searchQuery}`);
      const student = res.data.data?.students?.[0];
      if (!student) {
        setFoundStudent(null);
        setFeeLedger([]);
        alert('Student not found');
        return;
      }
      setFoundStudent(student);
      const ledgerRes = await api.get(`/fees/student/${student._id}/ledger?academicYear=2024-2025`);
      setFeeLedger(ledgerRes.data.data?.ledger || []);
    } catch {
      alert('Student not found');
    }
  };

  const openPayment = (fee) => {
    setSelectedFee(fee);
    setPaymentForm({
      amount: fee.balance,
      mode: 'cash',
      transactionId: '',
      date: new Date().toISOString().split('T')[0],
    });
    setShowPaymentModal(true);
  };

  const handlePayment = async () => {
    setProcessing(true);
    try {
      await api.post('/fees/payments', {
        student: foundStudent._id,
        feeHead: selectedFee.feeHead?._id,
        amount: Number(paymentForm.amount),
        paymentMode: paymentForm.mode,
        paymentDate: paymentForm.date,
        transactionId: paymentForm.transactionId,
        academicYear: '2024-2025',
      });
      setShowPaymentModal(false);
      alert('Payment recorded successfully');
    } catch {
      alert('Failed to record payment');
    } finally {
      setProcessing(false);
    }
  };

  const totalDue = feeLedger.reduce((s, f) => s + (f.balance || 0), 0);
  const totalPaid = feeLedger.reduce((s, f) => s + (f.paid || 0), 0);
  const studentName = foundStudent
    ? foundStudent.fullName || [foundStudent.firstName, foundStudent.lastName].filter(Boolean).join(' ')
    : '';
  const classLabel =
    typeof foundStudent?.currentClass === 'object'
      ? `${foundStudent.currentClass.name}-${foundStudent.currentClass.section}`
      : foundStudent?.currentClass || '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fee Collection</h1>
        <p className="text-sm text-gray-500 mt-1">Search student and record fee payments</p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by admission number or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Student Info */}
      {foundStudent && (
        <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
              <IndianRupee size={20} className="text-indigo-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900">{studentName}</h3>
              <p className="text-sm text-gray-600">
                Admission: {foundStudent.admissionNo} | Class {classLabel || '-'} | Phone: {foundStudent.fatherPhone || '-'}
              </p>
            </div>
            <div className="flex gap-4 text-sm">
              <div className="text-center">
                <p className="text-gray-500">Total Paid</p>
                <p className="font-bold text-emerald-600">Rs. {totalPaid.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-500">Balance</p>
                <p className="font-bold text-red-600">Rs. {totalDue.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fee Ledger */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Fee Ledger</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Fee Head</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Amount</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Due Date</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Paid</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Balance</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {feeLedger.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                    Search and select a student to load their fee ledger.
                  </td>
                </tr>
              )}
              {feeLedger.map((fee) => (
                <tr key={fee.feeHead?._id || fee._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{fee.feeHead?.name || 'Fee'}</td>
                  <td className="px-4 py-3 text-right">Rs. {fee.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{new Date(fee.dueDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">Rs. {fee.paid.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">{statusBadge(fee.status?.replace(/^\w/, (c) => c.toUpperCase()))}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">Rs. {fee.balance.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {fee.balance > 0 && (
                        <button
                          onClick={() => openPayment(fee)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Record Payment"
                        >
                          <Plus size={14} />
                        </button>
                      )}
                      {fee.status === 'Paid' && (
                        <button className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Receipt">
                          <Receipt size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Record Payment" size="md">
        {selectedFee && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Fee: <span className="font-medium text-gray-800">{selectedFee.feeHead?.name || 'Fee'}</span></p>
              <p className="text-sm text-gray-500">Balance: <span className="font-medium text-red-600">Rs. {selectedFee.balance.toLocaleString()}</span></p>
            </div>
            <InputField
              label="Amount"
              name="amount"
              type="number"
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              required
            />
            <SelectField
              label="Payment Mode"
              name="mode"
              value={paymentForm.mode}
              onChange={(e) => setPaymentForm({ ...paymentForm, mode: e.target.value })}
              options={[
                { value: 'cash', label: 'Cash' },
                { value: 'online', label: 'Online/UPI' },
                { value: 'bank_transfer', label: 'Bank Transfer' },
                { value: 'cheque', label: 'Cheque' },
              ]}
            />
            <InputField
              label="Transaction ID"
              name="transactionId"
              value={paymentForm.transactionId}
              onChange={(e) => setPaymentForm({ ...paymentForm, transactionId: e.target.value })}
              placeholder="Optional reference number"
            />
            <InputField
              label="Date"
              name="date"
              type="date"
              value={paymentForm.date}
              onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
              required
            />
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowPaymentModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                Cancel
              </button>
              <button
                onClick={handlePayment}
                disabled={processing}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Record Payment'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FeeCollection;
