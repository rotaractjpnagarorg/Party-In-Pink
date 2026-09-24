import { useState, useCallback } from 'react';
import { load } from '@cashfreepayments/cashfree-js';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../services/firebase';

export function useCashfree() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = useCallback(
    async (
      sessionId: string,
      callbacks?: {
        onSuccess?: () => void;
        onFailure?: (msg: string) => void;
      }
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        // 1. Call Cloud Function to create Cashfree Order
        const createOrderCallable = httpsCallable<
          { sessionId: string },
          { paymentSessionId: string; orderId: string }
        >(functions, 'createCashfreeOrder');

        const { data } = await createOrderCallable({ sessionId });

        if (!data?.paymentSessionId) {
          throw new Error('Failed to obtain payment session from server.');
        }

        // 2. Initialize Cashfree SDK
        const env = (import.meta.env.VITE_CASHFREE_ENV || 'production').toLowerCase();
        const mode = env === 'sandbox' ? 'sandbox' : 'production';
        const cashfree = await load({ mode });

        if (!cashfree) {
          throw new Error('Unable to initialize Cashfree payment gateway SDK.');
        }

        // 3. Trigger Checkout Modal
        const res: any = await cashfree.checkout({
          paymentSessionId: data.paymentSessionId,
          redirectTarget: '_modal',
        });

        if (res?.error) {
          const errMsg = res.error.message || 'Payment cancelled or incomplete';
          setError(errMsg);
          callbacks?.onFailure?.(errMsg);
          return;
        }

        // 4. Verify payment with server
        const verifyPaymentCallable = httpsCallable<
          { sessionId: string },
          { status: string; verified: boolean; message?: string }
        >(functions, 'verifyCashfreePayment');

        const verifyRes = await verifyPaymentCallable({ sessionId });

        if (verifyRes.data?.status === 'SUCCESS' || verifyRes.data?.verified) {
          callbacks?.onSuccess?.();
        } else {
          // Redirect to status page which polls live
          callbacks?.onSuccess?.();
        }
      } catch (err: any) {
        const errorMsg =
          err?.details?.message ||
          err?.message ||
          'Payment initiation failed. Please try again or use direct UPI.';
        setError(errorMsg);
        callbacks?.onFailure?.(errorMsg);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    startCheckout,
    isLoading,
    error,
  };
}
