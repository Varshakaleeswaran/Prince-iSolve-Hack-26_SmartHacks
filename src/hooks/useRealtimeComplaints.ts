import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

type Complaint = Database['public']['Tables']['complaints']['Row'];
type ComplaintStatus = Database['public']['Enums']['complaint_status'];

interface UseRealtimeComplaintsOptions {
  onlyNew?: boolean; // Only show complaints created after component mount
  filterByStatus?: ComplaintStatus[];
  filterByUserId?: string;
  filterByWorkerId?: string;
}

export const useRealtimeComplaints = (options: UseRealtimeComplaintsOptions = {}) => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionStartTime] = useState(() => new Date().toISOString());
  const channelId = useRef(`complaints-rt-${Math.random().toString(36).slice(2)}`);
  const { toast } = useToast();

  const fetchComplaints = useCallback(async () => {
    let query = supabase.from('complaints').select('*');

    // Only fetch complaints created after session start if onlyNew is true
    if (options.onlyNew) {
      query = query.gte('created_at', sessionStartTime);
    }

    if (options.filterByStatus && options.filterByStatus.length > 0) {
      query = query.in('status', options.filterByStatus as ComplaintStatus[]);
    }

    if (options.filterByUserId) {
      query = query.eq('citizen_id', options.filterByUserId);
    }

    if (options.filterByWorkerId) {
      query = query.eq('worker_id', options.filterByWorkerId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching complaints:', error);
      toast({ title: 'Error', description: 'Failed to load complaints', variant: 'destructive' });
    } else {
      setComplaints(data || []);
    }
    setIsLoading(false);
  }, [options.onlyNew, options.filterByStatus, options.filterByUserId, options.filterByWorkerId, sessionStartTime, toast]);

  useEffect(() => {
    fetchComplaints();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(channelId.current)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'complaints',
        },
        (payload) => {
          console.log('Realtime complaint update:', payload);

          if (payload.eventType === 'INSERT') {
            const newComplaint = payload.new as Complaint;
            
            // Check if this complaint passes our filters
            if (options.onlyNew && newComplaint.created_at && newComplaint.created_at < sessionStartTime) {
              return;
            }
            
            setComplaints((prev) => [newComplaint, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedComplaint = payload.new as Complaint;
            setComplaints((prev) =>
              prev.map((c) => (c.id === updatedComplaint.id ? updatedComplaint : c))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id;
            setComplaints((prev) => prev.filter((c) => c.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchComplaints, options.onlyNew, sessionStartTime]);

  return { complaints, isLoading, refetch: fetchComplaints };
};
