import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Button from '../ui/Button';
import Input from '../ui/Input';

const normalizePhone = (phone) => {
  const cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('0')) return `254${cleaned.slice(1)}`;
  if (cleaned.startsWith('254')) return cleaned;
  return cleaned;
};

const formatPhone = (phone) => {
  const cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('254') && cleaned.length === 12) {
    return `+254 ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  return phone;
};

const MpesaPayment = ({ invoice, amount, onSuccess, onCancel }) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [transaction, setTransaction] = useState(null);
  const [polling, setPolling] = useState(false);
  const [status, setStatus] = useState('');

  const pollStatus = useCallback(async (checkoutRequestId) => {
    setPolling(true);
    let attempts = 0;
    const maxAttempts = 30;

    const check = async () => {
      try {
        const response = await api.get(`/payments/mpesa/status/${checkoutRequestId}`);
        const txn = response.data.data.transaction;
        setStatus(txn.status);

        if (txn.status === 'success') {
          setPolling(false);
          toast.success('M-Pesa payment confirmed');
          onSuccess?.(txn);
          return;
        }

        if (txn.status === 'failed') {
          setPolling(false);
          toast.error(txn.resultDesc || 'M-Pesa payment failed');
          return;
        }

        attempts += 1;
        if (attempts >= maxAttempts) {
          setPolling(false);
          toast.error('Payment status check timed out. Please check your M-Pesa messages.');
          return;
        }

        setTimeout(check, 3000);
      } catch (err) {
        setPolling(false);
        toast.error(err.response?.data?.message || 'Failed to check payment status');
      }
    };

    check();
  }, [onSuccess]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const normalized = normalizePhone(phone);
    if (!/^\+?2547\d{8}$/.test(normalized)) {
      toast.error('Please enter a valid Kenyan M-Pesa number');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/payments/mpesa/initiate', {
        invoice: invoice._id,
        phoneNumber: normalized,
        amount,
      });
      const txn = response.data.data.transaction;
      setTransaction(txn);
      setStatus('pending');
      toast.success('STK push sent. Enter your M-Pesa PIN when prompted.');
      pollStatus(txn.checkoutRequestId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate M-Pesa payment');
    } finally {
      setLoading(false);
    }
  };

  if (transaction) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-lg bg-zinc-50 p-4">
          <p className="text-sm font-medium text-zinc-900">M-Pesa STK push sent</p>
          <p className="text-xs text-zinc-500">
            Check your phone {formatPhone(phone)} and enter your PIN to complete the payment.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-zinc-600">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-600 border-t-transparent" />
          {status === 'pending' ? 'Waiting for confirmation...' : `Status: ${status}`}
        </div>
        <Button type="button" variant="outline" onClick={onCancel} disabled={polling}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="text-sm text-zinc-500">Amount to pay</p>
        <p className="text-xl font-bold text-zinc-900">
          KES {Number(amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
        </p>
      </div>
      <Input
        label="M-Pesa phone number"
        type="tel"
        placeholder="+254712345678"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        required
      />
      <p className="text-xs text-zinc-500">
        You will receive an STK push on this number. Enter your M-Pesa PIN to authorize.
      </p>
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" isLoading={loading} disabled={loading} className="flex-1">
          Pay with M-Pesa
        </Button>
      </div>
    </form>
  );
};

export default MpesaPayment;
