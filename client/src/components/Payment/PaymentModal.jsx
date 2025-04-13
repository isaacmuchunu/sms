import React, { useState } from 'react';
import Modal from '../ui/Modal';
import MpesaPayment from './MpesaPayment';
import CardPayment from './CardPayment';

const PaymentModal = ({ isOpen, onClose, invoice, amount, onSuccess }) => {
  const [method, setMethod] = useState('mpesa');

  const handleSuccess = (result) => {
    onSuccess?.(result);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pay fees"
      description={`Choose how you would like to pay KES ${Number(amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`}
      size="md"
    >
      <div className="space-y-5">
        <div className="flex gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
          <button
            type="button"
            onClick={() => setMethod('mpesa')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              method === 'mpesa'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            M-Pesa
          </button>
          <button
            type="button"
            onClick={() => setMethod('card')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              method === 'card'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Card
          </button>
        </div>

        {method === 'mpesa' ? (
          <MpesaPayment invoice={invoice} amount={amount} onSuccess={handleSuccess} onCancel={onClose} />
        ) : (
          <CardPayment invoice={invoice} amount={amount} onSuccess={handleSuccess} onCancel={onClose} />
        )}
      </div>
    </Modal>
  );
};

export default PaymentModal;
