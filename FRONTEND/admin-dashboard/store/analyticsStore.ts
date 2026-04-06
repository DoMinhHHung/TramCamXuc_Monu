import { create } from 'zustand';

interface RevenuePoint {
  date: string;
  total: number;
}

interface PlanActiveCount {
  planId: string;
  planName: string;
  count: number;
}

interface AnalyticsState {
  revenueStats: RevenuePoint[];
  planActiveCounts: PlanActiveCount[];
  loading: boolean;
  error: string | null;
  fetchAnalytics: (from: string, to: string) => Promise<void>;
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  revenueStats: [],
  planActiveCounts: [],
  loading: false,
  error: null,
  async fetchAnalytics(from, to) {
    set({ loading: true, error: null });
    try {
      const [revenueRes, planRes] = await Promise.all([
        fetch(`/api/admin/subscriptions/stats?from=${from}&to=${to}`),
        fetch(`/api/admin/subscriptions/active-per-plan`),
      ]);
      const revenueData = await revenueRes.json();
      const planData = await planRes.json();
      set({
        revenueStats: revenueData.result || [],
        planActiveCounts: planData.result || [],
        loading: false,
        error: null,
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Lỗi khi tải dữ liệu analytics';
      set({ loading: false, error: message });
    }
  },
}));
