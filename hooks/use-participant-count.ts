'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useOffline } from '@/components/offline-provider';
import { getAll, TABLES } from '@/lib/offline-storage';

interface UseParticipantCountProps {
  scheduleId: string;
}

export function useParticipantCount({ scheduleId }: UseParticipantCountProps) {
  const { isOnline } = useOffline();
  const [count, setCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchParticipantCount = async () => {
      if (!scheduleId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        if (isOnline) {
          // Online: fetch from Supabase
          try {
            // First try the RPC method
            const { data, error } = await supabase.rpc(
              'get_schedule_participants',
              { p_schedule_id: scheduleId }
            );

            if (!error && data) {
              setCount(data.length);
            } else {
              // Fallback to direct query if RPC fails
              const { data: fallbackData, error: fallbackError } = await supabase
                .from('schedule_participants')
                .select('id')
                .eq('schedule_id', scheduleId);

              if (!fallbackError && fallbackData) {
                setCount(fallbackData.length);
              } else {
                setError(fallbackError?.message || 'Failed to fetch participant count');
              }
            }
          } catch (error) {
            console.error('Error fetching participant count:', error);
            setError('Failed to fetch participant count');
          }
        } else {
          // Offline: fetch from IndexedDB
          try {
            const allParticipants = await getAll(TABLES.SCHEDULE_PARTICIPANTS);
            
            // Filter participants by schedule_id
            const scheduleParticipants = (allParticipants as any[]).filter(
              (p) => p.schedule_id === scheduleId
            );
            
            setCount(scheduleParticipants.length);
          } catch (error) {
            console.error('Error fetching participants from IndexedDB:', error);
            setError('Failed to fetch participant count from offline storage');
          }
        }
      } catch (err) {
        console.error('Error in fetchParticipantCount:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchParticipantCount();
  }, [scheduleId, isOnline]);

  return { count, isLoading, error };
}
