import { useState } from 'react';
import { Filter, Loader2, Star, CheckCircle, Video } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ComplaintCard } from '@/components/dashboard/ComplaintCard';
import { ComplaintDetailDialog } from '@/components/complaint/ComplaintDetailDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeComplaints } from '@/hooks/useRealtimeComplaints';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Complaint as UIComplaint } from '@/types';
import { Tables } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'pending' | 'assigned' | 'in_progress' | 'completed' | 'delayed';

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'delayed', label: 'Delayed' },
];

export const MyComplaints = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [videoWatched, setVideoWatched] = useState(false);

  // Detail dialog
  const [detailComplaint, setDetailComplaint] = useState<Tables<'complaints'> | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const { complaints, isLoading, refetch } = useRealtimeComplaints({
    filterByUserId: user?.id,
  });

  const filteredComplaints = filter === 'all'
    ? complaints
    : complaints.filter(c => c.status === filter);

  const uiComplaints: UIComplaint[] = filteredComplaints.map(c => ({
    id: c.id,
    type: c.type as UIComplaint['type'],
    description: c.description,
    status: (c.status === 'assigned' ? 'in_progress' : c.status) as UIComplaint['status'],
    location: {
      lat: c.latitude,
      lng: c.longitude,
      address: c.address,
    },
    images: [],
    citizenId: c.citizen_id,
    citizenName: 'You',
    createdAt: new Date(c.created_at || new Date()),
    updatedAt: new Date(c.updated_at || new Date()),
    slaDeadline: new Date(c.sla_deadline || new Date()),
    daysRemaining: c.sla_deadline
      ? Math.ceil((new Date(c.sla_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 7,
    aiVerified: false,
  }));

  const handleConfirmCompletion = async () => {
    if (!selectedComplaintId || rating === 0) return;

    setIsSubmitting(true);

    const { error } = await supabase
      .from('complaints')
      .update({
        citizen_confirmed: true,
        rating,
        status: 'completed'
      })
      .eq('id', selectedComplaintId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to confirm completion', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Thank you for confirming the work completion!' });
      setShowConfirmDialog(false);
      setRating(0);
      setSelectedComplaintId(null);
      setVideoWatched(false);
      refetch();
    }

    setIsSubmitting(false);
  };

  const openConfirmDialog = (complaintId: string) => {
    setSelectedComplaintId(complaintId);
    setRating(0);
    setVideoWatched(false);
    setShowConfirmDialog(true);
  };

  const handleViewDetails = (complaint: UIComplaint) => {
    // Find raw complaint
    const raw = complaints.find(c => c.id === complaint.id);
    if (raw) {
      setDetailComplaint(raw);
      setShowDetailDialog(true);
    }
  };

  const awaitingConfirmation = complaints.filter(c => c.status === 'in_progress');

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Complaints</h1>
            <p className="text-muted-foreground">Track the status of your submitted complaints</p>
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Export
          </Button>
        </div>

        {/* Awaiting Confirmation Banner */}
        {awaitingConfirmation.length > 0 && (
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              Work Completed - Awaiting Your Confirmation
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              The following complaints have been resolved. Please watch the completion video and confirm.
            </p>
            <div className="flex flex-wrap gap-2">
              {awaitingConfirmation.map(c => (
                <Button
                  key={c.id}
                  size="sm"
                  onClick={() => openConfirmDialog(c.id)}
                >
                  Confirm #{c.id.slice(-8)}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Status Filter */}
        <div className="flex flex-wrap gap-2">
          {statusFilters.map(({ value, label }) => (
            <Badge
              key={value}
              variant={filter === value ? 'default' : 'outline'}
              className={cn(
                "cursor-pointer px-4 py-2 text-sm",
                filter === value && "bg-primary"
              )}
              onClick={() => setFilter(value)}
            >
              {label}
              {value !== 'all' && (
                <span className="ml-1.5 text-xs opacity-70">
                  ({complaints.filter(c => c.status === value).length})
                </span>
              )}
            </Badge>
          ))}
        </div>

        {/* Complaints List */}
        <div className="space-y-4">
          {uiComplaints.length > 0 ? (
            uiComplaints.map((complaint) => (
              <ComplaintCard
                key={complaint.id}
                complaint={complaint}
                showActions
                onViewDetails={() => handleViewDetails(complaint)}
              />
            ))
          ) : (
            <div className="glass-card p-12 text-center">
              <p className="text-muted-foreground">
                {filter === 'all'
                  ? 'You haven\'t submitted any complaints yet'
                  : 'No complaints found with this filter'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Dialog */}
      <ComplaintDetailDialog
        complaint={detailComplaint}
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
      />

      {/* Confirmation Dialog with Video Requirement */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="bg-background border max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirm Work Completion</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Please watch the completion video first, then confirm and rate the service.
            </p>

            {/* Embedded completion video */}
            {selectedComplaintId && (
              <CompletionVideoPlayer
                complaintId={selectedComplaintId}
                onVideoWatched={() => setVideoWatched(true)}
              />
            )}

            {!videoWatched && (
              <p className="text-xs text-destructive text-center">
                ⚠️ You must watch the completion video before confirming
              </p>
            )}

            <div className={cn(!videoWatched && "opacity-50 pointer-events-none")}>
              <p className="text-sm font-medium mb-2">Rate the service:</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={cn(
                        "w-8 h-8 transition-colors",
                        star <= rating ? "fill-warning text-warning" : "text-muted-foreground"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmCompletion}
              disabled={rating === 0 || isSubmitting || !videoWatched}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Confirming...
                </>
              ) : (
                'Confirm Completion'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

// Sub-component for loading and playing completion video
const CompletionVideoPlayer = ({ complaintId, onVideoWatched }: { complaintId: string; onVideoWatched: () => void }) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useState(() => {
    (async () => {
      const { data } = await supabase
        .from('complaint_images')
        .select('image_url')
        .eq('complaint_id', complaintId)
        .eq('image_type', 'after')
        .limit(1)
        .maybeSingle();
      setVideoUrl(data?.image_url || null);
      setLoading(false);
    })();
  });

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  if (!videoUrl) return <p className="text-sm text-muted-foreground text-center">No completion video found</p>;

  return (
    <div className="rounded-lg overflow-hidden border border-border">
      <video
        src={videoUrl}
        controls
        className="w-full max-h-48 object-contain bg-black"
        onPlay={onVideoWatched}
      />
    </div>
  );
};

export default MyComplaints;
