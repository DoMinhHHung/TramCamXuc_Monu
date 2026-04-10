import { apiClient } from './api';
import type { AxiosError } from 'axios';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SubscriptionPlan {
  /** UUID string */
  id: string;
  subsName: string;
  /**
   * Backend field is `description`. Keep optional for compatibility.
   */
  description?: string;
  /**
   * Some older callers used `subsDescription`. Keep optional.
   */
  subsDescription?: string;
  /**
   * Backend returns BigDecimal; runtime can be number or string depending on serializer.
   */
  price: number | string;
  durationDays: number;
  features: Record<string, any>;
  /**
   * Backend uses `isActive: boolean` for plan visibility.
   */
  isActive?: boolean;
  displayOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserSubscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PENDING' | 'SUSPENDED';
  startedAt?: string;
  expiresAt?: string;
  autoRenew?: boolean;
  cancelledAt?: string;
  createdAt?: string;
}

export interface PaymentResponse {
  checkoutUrl: string;
  qrCode: string;
  referenceCode: string;
  orderCode: number;
  message: string;
}

export interface PurchaseSubscriptionRequest {
  planId: string;
}

export interface PaymentCancelRequest {
  cancellationReason?: string;
}

export type PaymentLinkInfo = unknown;

// ─── Payment API ──────────────────────────────────────────────────────────────

/**
 * Get all active subscription plans (public endpoint)
 * GET /subscriptions/plans
 */
export const getActiveSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  const response = await apiClient.get<SubscriptionPlan[]>('/subscriptions/plans');
  return response.data;
};

/**
 * Purchase a subscription plan
 * POST /subscriptions/purchase
 */
export const purchaseSubscription = async (
  request: PurchaseSubscriptionRequest
): Promise<PaymentResponse> => {
  const response = await apiClient.post<PaymentResponse>('/subscriptions/purchase', request);
  return response.data;
};

/**
 * Get my active subscription
 * GET /subscriptions/my
 */
export const getMySubscription = async (): Promise<UserSubscription> => {
  const response = await apiClient.get<UserSubscription>('/subscriptions/my');
  return response.data;
};

/**
 * Get my active subscription, or null if user has none.
 *
 * Backend (payment-service) returns 404 + code=2004 when no active subscription exists.
 */
export const getMySubscriptionOrNull = async (): Promise<UserSubscription | null> => {
  try {
    return await getMySubscription();
  } catch (e) {
    const err = e as AxiosError<any>;
    const status = err.response?.status;
    const code = err.response?.data?.code;
    if (status === 404 || code === 2004) return null;
    throw e;
  }
};

/**
 * Get my subscription history
 * GET /subscriptions/my/history
 */
export const getMySubscriptionHistory = async (): Promise<UserSubscription[]> => {
  const response = await apiClient.get<UserSubscription[]>('/subscriptions/my/history');
  return response.data;
};

/**
 * Cancel my active subscription
 * DELETE /subscriptions/my/cancel
 */
export const cancelMySubscription = async (): Promise<void> => {
  await apiClient.delete('/subscriptions/my/cancel');
};

/**
 * Cancel a pending payment link by order code
 * PUT /payments/{orderCode}/cancel
 */
export const cancelPaymentLink = async (
  orderCode: number,
  request?: PaymentCancelRequest
): Promise<void> => {
  await apiClient.put(`/payments/${orderCode}/cancel`, request ?? {});
};

/**
 * Get payment link information by order code.
 * GET /payments/{orderCode}
 *
 * Response shape depends on PayOS SDK. Treat as unknown and let callers interpret carefully.
 */
export const getPaymentInfo = async (orderCode: number): Promise<PaymentLinkInfo> => {
  const response = await apiClient.get<PaymentLinkInfo>(`/payments/${orderCode}`);
  return response.data;
};
