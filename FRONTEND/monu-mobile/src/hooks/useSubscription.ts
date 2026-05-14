import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getActiveSubscriptionPlans,
  getMySubscriptionOrNull,
  getMySubscriptionHistory,
  type SubscriptionPlan,
  type UserSubscription,
} from '../services/payment';
import { useAuth } from '../context/AuthContext';

const THIRTY_MIN_MS = 30 * 60 * 1000;
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

const asNumber = (v: unknown): number => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
};

const normalizePlan = (p: SubscriptionPlan): SubscriptionPlan & { priceNumber: number } => {
  return { ...p, priceNumber: asNumber(p.price) };
};

export type UseSubscriptionResult = {
  plans: Array<SubscriptionPlan & { priceNumber: number }>;
  currentSubscription: UserSubscription | null;
  currentPlanId: string | null;
  isActive: boolean;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  history: UserSubscription[];
  isHistoryLoading: boolean;
  isHistoryError: boolean;
  refresh: () => Promise<void>;
  invalidateAll: () => Promise<void>;
};

export function useSubscription(): UseSubscriptionResult {
  const { authSession } = useAuth();
  const qc = useQueryClient();

  const plansQuery = useQuery({
    queryKey: ['subscriptions', 'plans'],
    queryFn: getActiveSubscriptionPlans,
    staleTime: SIX_HOURS_MS,
    gcTime: SIX_HOURS_MS,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const subQuery = useQuery({
    queryKey: ['subscriptions', 'my', authSession?.profile?.id ?? 'anon'],
    queryFn: () => (authSession ? getMySubscriptionOrNull() : Promise.resolve(null)),
    enabled: Boolean(authSession),
    staleTime: THIRTY_MIN_MS,
    gcTime: SIX_HOURS_MS,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const historyQuery = useQuery({
    queryKey: ['subscriptions', 'my', 'history', authSession?.profile?.id ?? 'anon'],
    queryFn: () => (authSession ? getMySubscriptionHistory() : Promise.resolve([])),
    enabled: Boolean(authSession),
    staleTime: THIRTY_MIN_MS,
    gcTime: SIX_HOURS_MS,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const plans = useMemo(() => {
    const raw = plansQuery.data ?? [];
    return raw
      .map(normalizePlan)
      .slice()
      .sort((a, b) => {
        const ao = typeof a.displayOrder === 'number' ? a.displayOrder : 0;
        const bo = typeof b.displayOrder === 'number' ? b.displayOrder : 0;
        if (ao !== bo) return ao - bo;
        return a.priceNumber - b.priceNumber;
      });
  }, [plansQuery.data]);

  const currentSubscription = subQuery.data ?? null;
  const isActive = currentSubscription?.status === 'ACTIVE';
  const currentPlanId = isActive ? currentSubscription?.plan?.id ?? null : null;

  const isLoading = plansQuery.isLoading || subQuery.isLoading;
  const isFetching = plansQuery.isFetching || subQuery.isFetching;
  const isError = Boolean(plansQuery.isError || subQuery.isError);
  const error = plansQuery.error ?? subQuery.error ?? null;

  const refresh = async () => {
    await Promise.all([plansQuery.refetch(), subQuery.refetch(), historyQuery.refetch()]);
  };

  const invalidateAll = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['subscriptions', 'plans'] }),
      qc.invalidateQueries({ queryKey: ['subscriptions', 'my'] }),
    ]);
  };

  return {
    plans,
    currentSubscription,
    currentPlanId,
    isActive,
    isLoading,
    isFetching,
    isError,
    error,
    history: historyQuery.data ?? [],
    isHistoryLoading: historyQuery.isLoading,
    isHistoryError: historyQuery.isError,
    refresh,
    invalidateAll,
  };
}

