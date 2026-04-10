import { useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { getPaymentInfo, type PaymentLinkInfo } from '../services/payment';
import { useSubscription } from './useSubscription';

const POLL_INTERVAL_MS = 4_000;

type PaymentState = 'IDLE' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

const readString = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);

/**
 * Best-effort extraction of a status-like field from PayOS SDK response.
 * We do NOT assume a single fixed shape; we only read common locations.
 */
const extractPaymentStatus = (info: PaymentLinkInfo): string | null => {
  if (!info || typeof info !== 'object') return null;
  const obj = info as any;
  return (
    readString(obj.status) ||
    readString(obj.paymentStatus) ||
    readString(obj.state) ||
    readString(obj.data?.status) ||
    readString(obj.data?.paymentStatus) ||
    null
  );
};

const toPaymentState = (rawStatus: string | null): PaymentState => {
  if (!rawStatus) return 'PENDING';
  const s = rawStatus.toUpperCase();
  if (s.includes('CANCEL')) return 'CANCELLED';
  if (s.includes('FAIL')) return 'FAILED';
  if (s.includes('PAID') || s.includes('SUCCESS') || s.includes('COMPLETE') || s === '00') return 'SUCCESS';
  return 'PENDING';
};

export type UsePaymentStatusResult = {
  paymentInfo: PaymentLinkInfo | null;
  paymentStatusRaw: string | null;
  paymentState: PaymentState;
  isChecking: boolean;
};

/**
 * Poll payment status (best-effort), and also reactively mark SUCCESS when the subscription flips to ACTIVE.
 *
 * Success condition source of truth: backend `/subscriptions/my` -> ACTIVE.
 */
export function usePaymentStatus(args: {
  orderCode: number | null;
  enabled: boolean;
}): UsePaymentStatusResult {
  const qc = useQueryClient();
  const { isActive, invalidateAll } = useSubscription();

  const stableOrderCode = args.orderCode ?? null;
  const enabled = Boolean(args.enabled && stableOrderCode);

  const stoppedRef = useRef(false);
  useEffect(() => {
    stoppedRef.current = false;
  }, [stableOrderCode]);

  const query = useQuery({
    queryKey: ['payments', 'info', stableOrderCode],
    queryFn: () => getPaymentInfo(stableOrderCode as number),
    enabled,
    staleTime: 0,
    gcTime: 10 * 60 * 1000,
    refetchInterval: (q) => {
      if (!enabled) return false;
      if (stoppedRef.current) return false;
      // Stop polling once subscription is ACTIVE (source of truth).
      if (isActive) return false;
      // Stop polling if we already inferred terminal state from payment info.
      const raw = extractPaymentStatus(q.state.data);
      const state = toPaymentState(raw);
      if (state === 'SUCCESS' || state === 'FAILED' || state === 'CANCELLED') return false;
      return POLL_INTERVAL_MS;
    },
    refetchIntervalInBackground: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 0,
  });

  const paymentStatusRaw = useMemo(() => extractPaymentStatus(query.data), [query.data]);
  const inferredFromPayment = useMemo(() => toPaymentState(paymentStatusRaw), [paymentStatusRaw]);

  const paymentState: PaymentState = useMemo(() => {
    if (!enabled) return 'IDLE';
    if (isActive) return 'SUCCESS';
    return inferredFromPayment;
  }, [enabled, inferredFromPayment, isActive]);

  // When subscription flips to ACTIVE, invalidate subscription queries immediately.
  useEffect(() => {
    if (!enabled) return;
    if (!isActive) return;
    stoppedRef.current = true;
    void invalidateAll();
    void qc.invalidateQueries({ queryKey: ['payments', 'info'] });
  }, [enabled, invalidateAll, isActive, qc]);

  // While payment is pending, periodically refetch subscription so UI flips instantly on webhook success.
  useEffect(() => {
    if (!enabled) return;
    if (isActive) return;
    void qc.invalidateQueries({ queryKey: ['subscriptions', 'my'] });
  }, [enabled, isActive, qc, query.dataUpdatedAt]);

  return {
    paymentInfo: (query.data ?? null) as PaymentLinkInfo | null,
    paymentStatusRaw,
    paymentState,
    isChecking: enabled && (query.isFetching || query.isLoading),
  };
}

