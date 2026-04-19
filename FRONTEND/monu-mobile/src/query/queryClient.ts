import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      /** Giảm refetch lặp → màn hồi phục từ cache nhanh hơn */
      staleTime: 45_000,
      gcTime: 10 * 60_000,
      refetchOnMount: false,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

