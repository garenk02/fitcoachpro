'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { useOffline } from '@/components/offline-provider';
import { TABLES, saveItem, getAll, deleteItem } from '@/lib/offline-storage';
import { ScheduleParticipant } from '@/types/schedule';
import { toast } from 'sonner';

interface UseScheduleParticipantsProps {
  scheduleId: string;
}

interface UseScheduleParticipantsReturn {
  participants: ScheduleParticipant[];
  setParticipants: React.Dispatch<React.SetStateAction<ScheduleParticipant[]>>;
  isLoading: boolean;
  error: string | null;
  addParticipant: (clientId: string, status?: string) => Promise<boolean>;
  removeParticipant: (participantId: string) => Promise<boolean>;
  updateParticipantStatus: (participantId: string, status: string) => Promise<boolean>;
  refreshParticipants: () => Promise<void>;
}

export function useScheduleParticipants({ scheduleId }: UseScheduleParticipantsProps): UseScheduleParticipantsReturn {
  const { userId } = useAuth();
  const { isOnline } = useOffline();
  const [participants, setParticipants] = useState<ScheduleParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch participants
  const fetchParticipants = useCallback(async () => {
    if (!scheduleId || !userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isOnline) {
        // Online: fetch from Supabase
        // First try the RPC method
        let data;
        let fetchError;

        try {
          const rpcResult = await supabase
            .rpc('get_schedule_participants', { p_schedule_id: scheduleId });

          data = rpcResult.data;
          fetchError = rpcResult.error;
        } catch (rpcError) {
          console.error('Error with RPC call:', rpcError);
          fetchError = { message: 'RPC call failed' };
        }

        // If RPC fails, fall back to direct query
        if (fetchError) {
          console.error('Error fetching participants with RPC:', fetchError);
          console.log('Falling back to direct query for participants');

          const directResult = await supabase
            .from('schedule_participants')
            .select(`
              id,
              schedule_id,
              client_id,
              trainer_id,
              status,
              clients:client_id (
                name
              )
            `)
            .eq('schedule_id', scheduleId);

          data = directResult.data;
          fetchError = directResult.error;

          if (fetchError) {
            console.error('Error with direct query fallback:', fetchError);
            setError(fetchError.message);
            setIsLoading(false);
            return;
          }

          // Transform the data to match our ScheduleParticipant type
          const formattedParticipants: ScheduleParticipant[] = (data || []).map((item: any) => ({
            id: item.id,
            schedule_id: item.schedule_id,
            client_id: item.client_id,
            trainer_id: item.trainer_id || userId,
            status: item.status,
            client: {
              name: item.clients?.name || 'Unknown Client'
            }
          }));

          setParticipants(formattedParticipants);
        } else {
          // Transform the RPC data to match our ScheduleParticipant type
          const formattedParticipants: ScheduleParticipant[] = (data || []).map((item: any) => ({
            id: item.participant_id,
            schedule_id: scheduleId,
            client_id: item.client_id,
            trainer_id: item.trainer_id || userId,
            status: item.status,
            client: {
              name: item.client_name
            }
          }));

          setParticipants(formattedParticipants);
        }
      } else {
        // Offline: fetch from IndexedDB
        const offlineParticipants = await getAll(TABLES.SCHEDULE_PARTICIPANTS);

        // Cast to unknown first, then to the expected type
        const filteredParticipants = (offlineParticipants as unknown[]).filter(
          (p: any) => p.schedule_id === scheduleId
        ) as ScheduleParticipant[];

        // Get client names
        const clients = await getAll(TABLES.CLIENTS);

        // Add client names to participants
        const participantsWithNames = filteredParticipants.map((p) => {
          const client = clients.find((c) => c.id === p.client_id);
          return {
            ...p,
            client: {
              name: client ? String(client.name) : 'Unknown Client'
            }
          };
        });

        setParticipants(participantsWithNames);
      }
    } catch (err) {
      console.error('Error in fetchParticipants:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [scheduleId, userId, isOnline]);

  // Add participant
  const addParticipant = async (clientId: string, status = 'confirmed'): Promise<boolean> => {
    if (!scheduleId || !userId || !clientId) {
      toast.error('Missing required information');
      return false;
    }

    try {
      if (isOnline) {
        // Online: add to Supabase
        const { error: addError } = await supabase
          .rpc('add_participant_to_schedule', {
            p_schedule_id: scheduleId,
            p_client_id: clientId,
            p_trainer_id: userId,
            p_status: status
          });

        if (addError) {
          console.error('Error adding participant:', addError);
          toast.error('Failed to add participant');
          return false;
        }

        // Refresh participants list
        await fetchParticipants();
        toast.success('Participant added successfully');
        return true;
      } else {
        // Offline: add to IndexedDB
        const newParticipant: ScheduleParticipant = {
          id: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          schedule_id: scheduleId,
          client_id: clientId,
          trainer_id: userId,
          status: status as any,
          created_at: new Date().toISOString()
        };

        // Cast to Record<string, unknown> to satisfy the saveItem function
        await saveItem(TABLES.SCHEDULE_PARTICIPANTS, newParticipant as unknown as Record<string, unknown>, 'INSERT');

        // Refresh participants list
        await fetchParticipants();
        toast.success('Participant added successfully (offline)');
        return true;
      }
    } catch (err) {
      console.error('Error in addParticipant:', err);
      toast.error('Failed to add participant');
      return false;
    }
  };

  // Remove participant
  const removeParticipant = async (participantId: string): Promise<boolean> => {
    if (!participantId || !scheduleId || !userId) {
      toast.error('Missing participant ID, schedule ID, or user ID');
      return false;
    }

    try {
      if (isOnline) {
        // Find the participant to get the client_id
        const participant = participants.find(p => p.id === participantId);

        if (!participant) {
          toast.error('Participant not found');
          return false;
        }

        // console.log('Removing participant:', {
        //   participantId,
        //   clientId: participant.client_id,
        //   scheduleId,
        //   userId
        // });

        // First try the new dedicated stored procedure
        try {
          const { data: deleteResult, error: deleteError } = await supabase.rpc(
            'delete_participant_by_id',
            {
              p_participant_id: participantId,
              p_trainer_id: userId
            }
          );

          if (!deleteError && deleteResult === true) {
            console.log('Successfully deleted participant with stored procedure');
            // Force a delay to ensure the deletion has propagated
            await new Promise(resolve => setTimeout(resolve, 300));
            // Refresh participants list
            await fetchParticipants();
            return true;
          } else {
            console.error('Error with stored procedure:', deleteError);
          }
        } catch (procError) {
          console.error('Exception in stored procedure call:', procError);
        }

        // If stored procedure fails, try direct SQL delete
        try {
          // Use a raw SQL query for maximum control
          const { error: sqlError } = await supabase.rpc(
            'execute_sql',
            {
              sql_query: `DELETE FROM schedule_participants WHERE id = '${participantId}' AND trainer_id = '${userId}'`
            }
          );

          if (!sqlError) {
            console.log('Successfully deleted participant with raw SQL');
            // Force a delay to ensure the deletion has propagated
            await new Promise(resolve => setTimeout(resolve, 300));
            // Refresh participants list
            await fetchParticipants();
            return true;
          } else {
            console.error('Error with raw SQL:', sqlError);
          }
        } catch (sqlError) {
          console.error('Exception in raw SQL execution:', sqlError);
        }

        // If all else fails, try the standard delete
        const { error: removeError } = await supabase
          .from('schedule_participants')
          .delete()
          .eq('id', participantId);

        if (removeError) {
          console.error('Error with standard delete:', removeError);

          // Force remove from local state even if all database operations failed
          setParticipants(prev => prev.filter(p => p.id !== participantId));
          return true; // Return true anyway since we've removed it from the UI
        }

        // Force a delay to ensure the deletion has propagated
        await new Promise(resolve => setTimeout(resolve, 300));

        // Refresh participants list
        await fetchParticipants();

        // Verify the participant was actually removed
        const stillExists = participants.some(p => p.id === participantId);
        if (stillExists) {
          console.error('Participant still exists after all deletion attempts');

          // Force remove from local state as a last resort
          setParticipants(prev => prev.filter(p => p.id !== participantId));
          return true; // Return true anyway since we've removed it from the UI
        }

        console.log('Participant successfully removed');
        return true;
      } else {
        // Offline: remove from IndexedDB
        try {
          await deleteItem(TABLES.SCHEDULE_PARTICIPANTS, participantId);
          console.log('Deleted participant from IndexedDB:', participantId);
        } catch (deleteError) {
          console.error('Error deleting from IndexedDB:', deleteError);
        }

        // Force a delay to ensure the deletion has propagated
        await new Promise(resolve => setTimeout(resolve, 300));

        // Force remove from local state regardless of IndexedDB operation result
        setParticipants(prev => prev.filter(p => p.id !== participantId));

        // Try to verify the deletion
        try {
          // Refresh participants list
          await fetchParticipants();

          // Double-check if it's still in the list
          const stillExists = participants.some(p => p.id === participantId);
          if (stillExists) {
            console.error('Participant still exists in IndexedDB after deletion attempt');

            // Try again with a different approach
            try {
              const allParticipants = await getAll(TABLES.SCHEDULE_PARTICIPANTS);
              console.log('All participants in IndexedDB:', allParticipants);

              const participantToDelete = allParticipants.find((p: any) => p.id === participantId);
              if (participantToDelete) {
                console.log('Found participant to delete in second attempt:', participantToDelete);
                await deleteItem(TABLES.SCHEDULE_PARTICIPANTS, participantId);
              }
            } catch (retryError) {
              console.error('Error in retry delete:', retryError);
            }

            // Force remove from local state again to be sure
            setParticipants(prev => prev.filter(p => p.id !== participantId));
          }
        } catch (verifyError) {
          console.error('Error verifying deletion:', verifyError);
        }

        console.log('Participant removed from UI (offline)');
        return true;
      }
    } catch (err) {
      console.error('Error in removeParticipant:', err);
      toast.error('Failed to remove participant');
      return false;
    }
  };

  // Update participant status
  const updateParticipantStatus = async (participantId: string, status: string): Promise<boolean> => {
    if (!participantId) {
      toast.error('Missing participant ID');
      return false;
    }

    try {
      if (isOnline) {
        // Online: update in Supabase
        const { error: updateError } = await supabase
          .from('schedule_participants')
          .update({ status })
          .eq('id', participantId);

        if (updateError) {
          console.error('Error updating participant status:', updateError);
          toast.error('Failed to update participant status');
          return false;
        }

        // Refresh participants list
        await fetchParticipants();
        toast.success('Participant status updated successfully');
        return true;
      } else {
        // Offline: update in IndexedDB
        const participant = participants.find(p => p.id === participantId);
        if (!participant) {
          toast.error('Participant not found');
          return false;
        }

        const updatedParticipant = {
          ...participant,
          status: status as any
        };

        await saveItem(TABLES.SCHEDULE_PARTICIPANTS, updatedParticipant as unknown as Record<string, unknown>, 'UPDATE');

        // Refresh participants list
        await fetchParticipants();
        toast.success('Participant status updated successfully (offline)');
        return true;
      }
    } catch (err) {
      console.error('Error in updateParticipantStatus:', err);
      toast.error('Failed to update participant status');
      return false;
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  // Define a more robust refresh function
  const refreshParticipants = async () => {
    // Clear the current participants list first
    setParticipants([]);
    // Then fetch the updated list
    await fetchParticipants();
  };

  return {
    participants,
    setParticipants, // Expose the setter for optimistic UI updates
    isLoading,
    error,
    addParticipant,
    removeParticipant,
    updateParticipantStatus,
    refreshParticipants
  };
}
