import { MapPin, Clock, User, CheckCircle, AlertTriangle, Video } from 'lucide-react';
import { Complaint, ComplaintStatus } from '@/types';
import { complaintTypeLabels } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ComplaintCardProps {
  complaint: Complaint;
  onClick?: () => void;
  showActions?: boolean;
  onViewDetails?: () => void;
}

const statusConfig: Record<ComplaintStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'status-pending' },
  in_progress: { label: 'In Progress', className: 'status-progress' },
  completed: { label: 'Completed', className: 'status-completed' },
  delayed: { label: 'Delayed', className: 'status-delayed' },
};

export const ComplaintCard = ({ complaint, onClick, showActions, onViewDetails }: ComplaintCardProps) => {
  const status = statusConfig[complaint.status];
  const isDelayed = complaint.daysRemaining < 0;

  return (
    <div 
      className="glass-card-hover p-5 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge className={cn("border", status.className)}>
              {status.label}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {complaintTypeLabels[complaint.type]}
            </Badge>
          </div>
          
          <h3 className="font-medium truncate">{complaint.description}</h3>
          
          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {complaint.location.address}
            </span>
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              {complaint.citizenName}
            </span>
            <span className={cn(
              "flex items-center gap-1",
              isDelayed && "text-destructive"
            )}>
              <Clock className="w-3.5 h-3.5" />
              {isDelayed 
                ? `${Math.abs(complaint.daysRemaining)} days overdue`
                : `${complaint.daysRemaining} days remaining`
              }
            </span>
          </div>
        </div>

        {complaint.aiVerified && (
          <div className="flex items-center gap-1 text-success text-xs bg-success/10 px-2 py-1 rounded-full">
            <CheckCircle className="w-3 h-3" />
            AI Verified
          </div>
        )}
      </div>

      {showActions && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-border">
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails?.();
            }}
          >
            <Video className="w-3.5 h-3.5 mr-1.5" />
            View Details
          </Button>
        </div>
      )}
    </div>
  );
};
