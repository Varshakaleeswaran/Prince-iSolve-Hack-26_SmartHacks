import { useState, useEffect } from 'react';
import { Video, MapPin, Clock, User, Play, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

type Complaint = Database['public']['Tables']['complaints']['Row'];
type ComplaintImage = Database['public']['Tables']['complaint_images']['Row'];

const complaintTypeLabels: Record<string, string> = {
  pothole: 'Pothole',
  streetlight: 'Streetlight Issue',
  illegal_dumping: 'Illegal Dumping',
  drainage: 'Drainage Problem',
  road_damage: 'Road Damage',
  water_leak: 'Water Leak',
  sewage: 'Sewage Issue',
  garbage: 'Garbage Collection',
  encroachment: 'Encroachment',
  other: 'Other',
};

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'status-pending' },
  assigned: { label: 'Assigned', className: 'status-progress' },
  in_progress: { label: 'In Progress', className: 'status-progress' },
  completed: { label: 'Completed', className: 'status-completed' },
  delayed: { label: 'Delayed', className: 'status-delayed' },
};

interface ComplaintDetailDialogProps {
  complaint: Complaint | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVideoWatched?: () => void;
  workerName?: string;
  officerName?: string;
}

export const ComplaintDetailDialog = ({
  complaint,
  open,
  onOpenChange,
  onVideoWatched,
  workerName,
  officerName,
}: ComplaintDetailDialogProps) => {
  const [images, setImages] = useState<ComplaintImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [videoWatched, setVideoWatched] = useState(false);

  useEffect(() => {
    if (complaint && open) {
      fetchImages(complaint.id);
      setVideoWatched(false);
    }
  }, [complaint, open]);

  const fetchImages = async (complaintId: string) => {
    setIsLoading(true);
    const { data } = await supabase
      .from('complaint_images')
      .select('*')
      .eq('complaint_id', complaintId)
      .order('captured_at', { ascending: true });
    setImages(data || []);
    setIsLoading(false);
  };

  const handleVideoPlay = () => {
    setVideoWatched(true);
    onVideoWatched?.();
  };

  if (!complaint) return null;

  const status = complaint.status || 'pending';
  const beforeMedia = images.filter(i => i.image_type === 'before' || !i.image_type);
  const afterMedia = images.filter(i => i.image_type === 'after');

  const isVideo = (url: string) => url.endsWith('.webm') || url.endsWith('.mp4') || url.includes('video');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Complaint Details
            <span className="text-xs text-muted-foreground font-normal">#{complaint.id.slice(-8)}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status & Type */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={cn("border", statusConfig[status]?.className)}>
              {statusConfig[status]?.label}
            </Badge>
            <Badge variant="outline">{complaintTypeLabels[complaint.type] || complaint.type}</Badge>
          </div>

          {/* Description */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
            <p className="text-sm">{complaint.description}</p>
          </div>

          {/* Location */}
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <span>{complaint.address}</span>
          </div>

          {/* Dates */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            Submitted: {new Date(complaint.created_at || '').toLocaleString()}
          </div>

          {/* Assigned info */}
          {officerName && (
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span>Officer: {officerName}</span>
            </div>
          )}
          {workerName && (
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span>Worker: {workerName}</span>
            </div>
          )}

          {/* Complaint Media (Before) */}
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {beforeMedia.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Complaint Media</p>
                  <div className="space-y-2">
                    {beforeMedia.map((media) => (
                      <div key={media.id} className="rounded-lg overflow-hidden border border-border">
                        {isVideo(media.image_url) ? (
                          <video
                            src={media.image_url}
                            controls
                            className="w-full max-h-64 object-contain bg-black"
                            onPlay={handleVideoPlay}
                          />
                        ) : (
                          <img
                            src={media.image_url}
                            alt="Complaint"
                            className="w-full max-h-64 object-contain"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Completion Media (After) */}
              {afterMedia.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Completion Proof</p>
                  <div className="space-y-2">
                    {afterMedia.map((media) => (
                      <div key={media.id} className="rounded-lg overflow-hidden border border-border">
                        {isVideo(media.image_url) ? (
                          <video
                            src={media.image_url}
                            controls
                            className="w-full max-h-64 object-contain bg-black"
                            onPlay={handleVideoPlay}
                          />
                        ) : (
                          <img
                            src={media.image_url}
                            alt="Completion"
                            className="w-full max-h-64 object-contain"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {beforeMedia.length === 0 && afterMedia.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">No media uploaded yet</p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
