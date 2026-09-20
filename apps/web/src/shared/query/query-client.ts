import { QueryClient } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      retry: 0,
    },
    queries: {
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
      retry: 1,
      staleTime: 30 * 1000,
    },
  },
});

export { queryClient };
