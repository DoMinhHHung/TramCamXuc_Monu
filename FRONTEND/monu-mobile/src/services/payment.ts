import { apiClient } from './api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SubscriptionPlan {
  id: string;
  subsName: string;
  subsDescription: string;
  price: number;
  durationDays: number;
  features: Record<string, any>;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface UserSubscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PENDING';
  startedAt: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
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
