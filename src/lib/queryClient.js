import { QueryClient } from '@tanstack/react-query';

// In-memory cache for Supabase data: pages show what they last loaded straight away
// and refresh it in the background. Cleared on login and logout.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      gcTime: 30 * 60_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

// Refetch every claims list, including ones not on screen, so the next page shows fresh data
export const refreshClaims = () => queryClient.invalidateQueries({ queryKey: ['claims'], refetchType: 'all' });
