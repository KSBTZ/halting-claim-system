import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase/supabaseClient';
import { queryClient } from '../lib/queryClient';

// How often lists refresh while they're on screen (paused when the tab is hidden)
const MANAGER_REFRESH_MS = 20_000;
const EMPLOYEE_REFRESH_MS = 30_000;

const keys = {
  profile: ['profile'],
  myClaims: (userId) => ['claims', 'mine', userId],
  allClaims: ['claims', 'all'],
  unseen: (userId) => ['claims', 'unseen', userId],
};

const getUserId = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
};

/** The signed-in user's profile, or null when signed out. */
export const useProfile = () =>
  useQuery({
    queryKey: keys.profile,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const userId = await getUserId();
      if (!userId) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('staff_name, department, grade, staff_no, role')
        .eq('id', userId)
        .single();

      if (error) console.error('Could not load profile:', error);
      return { id: userId, ...(data || {}) };
    },
  });

export const useMyClaims = (userId) =>
  useQuery({
    queryKey: keys.myClaims(userId),
    enabled: Boolean(userId),
    refetchInterval: EMPLOYEE_REFRESH_MS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('claims')
        .select('*, entries(*)')
        .eq('employee_id', userId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      // They're looking at their requests, so clear the unseen flag (same rule as the badge count)
      if (data.some((claim) => claim.status !== 'Pending' && claim.seen_by_employee === false)) {
        await supabase.rpc('mark_own_claims_seen');
        queryClient.setQueryData(keys.unseen(userId), 0);
      }
      return data;
    },
  });

// RLS lets managers see every claim, not just their own
export const useAllClaims = (enabled) =>
  useQuery({
    queryKey: keys.allClaims,
    enabled,
    refetchInterval: MANAGER_REFRESH_MS,
    queryFn: async () => {
      const { data, error } = await supabase.from('claims').select('*, entries(*)').order('submitted_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

// Decided claims the employee hasn't looked at yet, for the My Requests badge
export const useUnseenCount = (userId, enabled) =>
  useQuery({
    queryKey: keys.unseen(userId),
    enabled: Boolean(userId) && enabled,
    refetchInterval: EMPLOYEE_REFRESH_MS,
    queryFn: async () => {
      const { count } = await supabase
        .from('claims')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', userId)
        .neq('status', 'Pending')
        .eq('seen_by_employee', false);
      return count || 0;
    },
  });
