import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Button from '../ui/Button';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const CheckoutForm = ({ clientSecret, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast.error(error.message || 'Card payment failed');
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        toast.success('Card payment successful');
        onSuccess?.(paymentIntent);
      } else {
        toast.info('Payment is being processed. You will receive a confirmation shortly.');
        onSuccess?.(paymentIntent);
      }
    } catch (err) {
      toast.error(err.message || 'Card payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border border-zinc-200 bg-white p-3">
        <PaymentElement />
      </div>
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" isLoading={loading} disabled={!stripe || loading} className="flex-1">
          Pay with card
        </Button>
      </div>
    </form>
  );
};

const CardPayment = ({ invoice, amount, onSuccess, onCancel }) => {
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const startPayment = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/payments/stripe/intent', {
        invoice: invoice._id,
        amount,
      });
      setClientSecret(response.data.data.clientSecret);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initialize card payment');
      toast.error(err.response?.data?.message || 'Failed to initialize card payment');
    } finally {
      setLoading(false);
    }
  };

  if (!clientSecret) {
    return (
      <div className="space-y-4 text-center">
        <div>
          <p className="text-sm text-zinc-500">Amount to pay</p>
          <p className="text-xl font-bold text-zinc-900">
            KES {Number(amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
          </p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button onClick={startPayment} isLoading={loading} disabled={loading} className="flex-1">
            Proceed to card payment
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
      <CheckoutForm clientSecret={clientSecret} onSuccess={onSuccess} onCancel={onCancel} />
    </Elements>
  );
};

export default CardPayment;
