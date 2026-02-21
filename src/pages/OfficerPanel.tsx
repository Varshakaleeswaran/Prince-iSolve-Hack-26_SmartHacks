import { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCircle, XCircle, AlertTriangle, User, Loader2, Video } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { KPICard } from '@/components/dashboard/KPICard';
import { ComplaintDetailDialog } from '@/components/complaint/ComplaintDetailDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

type Complaint = Database['public']['Tables']['complaints']['Row'];
type ComplaintType = Database['public']['Enums']['complaint_type'];

const complaintTypeLabels: Record<ComplaintType, string> = {
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

const statusConfig = {
  pending: { label: 'Pending', className: 'status-pending' },
  assigned: { label: 'Assigned', className: 'status-progress' },
  in_progress: { label: 'In Progress', className: 'status-progress' },
  completed: { label: 'Completed', className: 'status-completed' },
  delayed: { label: 'Delayed', className: 'status-delayed' },
};

interface Worker {
  id: string;
  full_name: string | null;
}

export const OfficerPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');

  // Video viewing states
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailComplaint, setDetailComplaint] = useState<Complaint | null>(null);
  const [videoWatchedForAssignment, setVideoWatchedForAssignment] = useState<Set<string>>(new Set());
  const [videoWatchedForApproval, setVideoWatchedForApproval] = useState<Set<string>>(new Set());

  const fetchComplaints = useCallback(async () => {
    const { data, error } = await supabase
      .from('complaints')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching complaints:', error);
      toast({ title: 'Error', description: 'Failed to load complaints', variant: 'destructive' });
    } else {
      setComplaints(data || []);
    }
    setIsLoading(false);
  }, [toast]);

  const fetchWorkers = useCallback(async () => {
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'worker');

    if (roleError) {
      console.error('Error fetching worker roles:', roleError);
      return;
    }

    if (roleData && roleData.length > 0) {
      const workerIds = roleData.map(r => r.user_id);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', workerIds);

      if (!profileError) setWorkers(profileData || []);
    } else {
      setWorkers([]);
    }
  }, []);

  useEffect(() => {
    fetchComplaints();
    fetchWorkers();

    const channel = supabase
      .channel('officer-complaints')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, () => {
        fetchComplaints();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchComplaints, fetchWorkers]);

  const handleViewVideo = (complaint: Complaint) => {
    setDetailComplaint(complaint);
    setShowDetailDialog(true);
  };

  const handleVideoWatchedForDetail = () => {
    if (detailComplaint) {
      // Track that officer watched this complaint's video
      setVideoWatchedForAssignment(prev => new Set(prev).add(detailComplaint.id));
      setVideoWatchedForApproval(prev => new Set(prev).add(detailComplaint.id));
    }
  };

  const handleAssignWorker = async () => {
    if (!selectedComplaint || !selectedWorkerId) return;

    setIsAssigning(true);

    const { error } = await supabase
      .from('complaints')
      .update({
        worker_id: selectedWorkerId,
        officer_id: user?.id,
        status: 'assigned'
      })
      .eq('id', selectedComplaint.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to assign worker', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Worker assigned successfully' });
      setShowAssignDialog(false);
      setSelectedWorkerId('');
      fetchComplaints();
      setSelectedComplaint(null);
    }

    setIsAssigning(false);
  };

  const handleApproveCompletion = async () => {
    if (!selectedComplaint) return;

    const { error } = await supabase
      .from('complaints')
      .update({ status: 'completed' })
      .eq('id', selectedComplaint.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to approve completion', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Complaint marked as completed' });
      fetchComplaints();
      setSelectedComplaint(null);
    }
  };

  const handleRejectCompletion = async () => {
    if (!selectedComplaint) return;

    const { error } = await supabase
      .from('complaints')
      .update({ status: 'assigned' })
      .eq('id', selectedComplaint.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to reject completion', variant: 'destructive' });
    } else {
      toast({ title: 'Rejected', description: 'Worker must re-submit proof' });
      fetchComplaints();
      setSelectedComplaint(null);
    }
  };

  const getDaysRemaining = (slaDeadline: string | null) => {
    if (!slaDeadline) return 7;
    const deadline = new Date(slaDeadline);
    const now = new Date();
    return Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const pendingReview = complaints.filter(c => c.status === 'pending' || c.status === 'assigned');
  const inProgress = complaints.filter(c => c.status === 'in_progress');
  const delayed = complaints.filter(c => getDaysRemaining(c.sla_deadline) < 0);
  const completed = complaints.filter(c => c.status === 'completed');

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
        <div>
          <h1 className="text-2xl font-bold">Officer Panel</h1>
          <p className="text-muted-foreground">Review and manage assigned complaints</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KPICard title="Pending Review" value={pendingReview.length} icon={Clock} variant="pending" />
          <KPICard title="In Progress" value={inProgress.length} icon={Clock} variant="progress" />
          <KPICard title="Delayed (>7 days)" value={delayed.length} icon={AlertTriangle} variant="delayed" />
          <KPICard title="Completed" value={completed.length} icon={CheckCircle} variant="completed" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Complaints List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="font-semibold">All Complaints</h2>
            {complaints.length === 0 ? (
              <div className="glass-card p-8 text-center text-muted-foreground">No complaints found</div>
            ) : (
              complaints.map((complaint) => {
                const daysRemaining = getDaysRemaining(complaint.sla_deadline);
                const status = complaint.status || 'pending';

                return (
                  <div
                    key={complaint.id}
                    className={cn(
                      "glass-card p-4 cursor-pointer transition-all",
                      selectedComplaint?.id === complaint.id && "ring-2 ring-primary"
                    )}
                    onClick={() => setSelectedComplaint(complaint)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge className={cn("border", statusConfig[status]?.className)}>
                            {statusConfig[status]?.label}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {complaintTypeLabels[complaint.type]}
                          </Badge>
                          <span className="text-xs text-muted-foreground">#{complaint.id.slice(-8)}</span>
                        </div>
                        <p className="text-sm mb-2 line-clamp-2">{complaint.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                          <span>{complaint.address}</span>
                          <span className={cn("flex items-center gap-1", daysRemaining < 0 && "text-destructive")}>
                            <Clock className="w-3 h-3" />
                            {daysRemaining < 0
                              ? `${Math.abs(daysRemaining)} days overdue`
                              : `${daysRemaining} days remaining`
                            }
                          </span>
                        </div>
                      </div>
                      {daysRemaining < 2 && (
                        <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Detail Panel */}
          <div className="glass-card p-6 h-fit sticky top-24">
            {selectedComplaint ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Complaint Details</h3>
                  <span className="text-xs text-muted-foreground">#{selectedComplaint.id.slice(-8)}</span>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <span className="ml-2">{complaintTypeLabels[selectedComplaint.type]}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Location:</span>
                    <span className="ml-2">{selectedComplaint.address}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <span className="ml-2 capitalize">{selectedComplaint.status?.replace('_', ' ')}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">SLA Deadline:</span>
                    <span className={cn("ml-2", getDaysRemaining(selectedComplaint.sla_deadline) < 0 && "text-destructive")}>
                      {selectedComplaint.sla_deadline
                        ? new Date(selectedComplaint.sla_deadline).toLocaleDateString()
                        : 'N/A'
                      }
                    </span>
                  </div>
                  {selectedComplaint.worker_id && (
                    <div>
                      <span className="text-muted-foreground">Assigned Worker:</span>
                      <span className="ml-2">
                        {workers.find(w => w.id === selectedComplaint.worker_id)?.full_name || 'Unknown'}
                      </span>
                    </div>
                  )}
                </div>

                {/* View Video Button */}
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => handleViewVideo(selectedComplaint)}
                >
                  <Video className="w-4 h-4" />
                  View Complaint Media
                </Button>

                <div className="pt-4 border-t border-border space-y-2">
                  {!selectedComplaint.worker_id && (
                    <Button
                      className="w-full gap-2"
                      onClick={() => {
                        if (!videoWatchedForAssignment.has(selectedComplaint.id)) {
                          toast({
                            title: 'Watch Video First',
                            description: 'You must watch the complaint video before assigning a worker.',
                            variant: 'destructive'
                          });
                          return;
                        }
                        setShowAssignDialog(true);
                      }}
                    >
                      <User className="w-4 h-4" />
                      Assign Worker
                    </Button>
                  )}

                  {selectedComplaint.status === 'in_progress' && (
                    <>
                      <Button
                        variant="outline"
                        className="w-full gap-2 text-success border-success/30"
                        onClick={() => {
                          if (!videoWatchedForApproval.has(selectedComplaint.id)) {
                            toast({
                              title: 'Watch Completion Video First',
                              description: 'You must watch the completion video before approving.',
                              variant: 'destructive'
                            });
                            return;
                          }
                          handleApproveCompletion();
                        }}
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve Completion
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full gap-2 text-destructive border-destructive/30"
                        onClick={handleRejectCompletion}
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <p>Select a complaint to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Complaint Detail Dialog with Video */}
      <ComplaintDetailDialog
        complaint={detailComplaint}
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        onVideoWatched={handleVideoWatchedForDetail}
        workerName={detailComplaint?.worker_id ? workers.find(w => w.id === detailComplaint.worker_id)?.full_name || undefined : undefined}
      />

      {/* Assign Worker Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="bg-background border">
          <DialogHeader>
            <DialogTitle>Assign Worker</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a worker" />
              </SelectTrigger>
              <SelectContent className="bg-background border">
                {workers.length === 0 ? (
                  <SelectItem value="none" disabled>No workers available</SelectItem>
                ) : (
                  workers.map((worker) => (
                    <SelectItem key={worker.id} value={worker.id}>
                      {worker.full_name || 'Unknown Worker'}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {workers.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                No workers registered yet. Workers need to sign up with the "Worker" role.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Cancel</Button>
            <Button onClick={handleAssignWorker} disabled={!selectedWorkerId || isAssigning}>
              {isAssigning ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Assigning...</>
              ) : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default OfficerPanel;
