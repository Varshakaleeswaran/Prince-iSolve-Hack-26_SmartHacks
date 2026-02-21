import { useState, useEffect, useCallback } from 'react';
import { Video, CheckCircle, Clock, MapPin, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { KPICard } from '@/components/dashboard/KPICard';
import { WorkerVideoRecorder } from '@/components/complaint/WorkerVideoRecorder';
import { ComplaintDetailDialog } from '@/components/complaint/ComplaintDetailDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

export const WorkerPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [tasks, setTasks] = useState<Complaint[]>([]);
  const [selectedTask, setSelectedTask] = useState<Complaint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [videoUploaded, setVideoUploaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Video viewing
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailTask, setDetailTask] = useState<Complaint | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('complaints')
      .select('*')
      .eq('worker_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error', description: 'Failed to load tasks', variant: 'destructive' });
    } else {
      setTasks(data || []);
    }
    setIsLoading(false);
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchTasks();

      const channel = supabase
        .channel('worker-tasks')
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'complaints',
          filter: `worker_id=eq.${user.id}`,
        }, () => { fetchTasks(); })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [user, fetchTasks]);

  const handleVideoUploaded = (_videoUrl: string) => {
    setVideoUploaded(true);
    setShowVideoRecorder(false);
  };

  const handleSubmitCompletion = async () => {
    if (!selectedTask || !videoUploaded || !user) return;
    setIsSubmitting(true);

    try {
      const { error: updateError } = await supabase
        .from('complaints')
        .update({ status: 'in_progress' })
        .eq('id', selectedTask.id);

      if (updateError) throw updateError;

      toast({ title: 'Success', description: 'Completion proof submitted! Awaiting citizen confirmation.' });
      setSelectedTask(null);
      setVideoUploaded(false);
      setShowVideoRecorder(false);
      fetchTasks();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit proof';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const assignedTasks = tasks.filter(t => t.status === 'assigned');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');

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
          <h1 className="text-2xl font-bold">Worker Panel</h1>
          <p className="text-muted-foreground">Complete tasks and upload verification proof</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard title="Assigned Tasks" value={assignedTasks.length} icon={Clock} variant="pending" />
          <KPICard title="Awaiting Confirmation" value={inProgressTasks.length} icon={Clock} variant="progress" />
          <KPICard title="Completed" value={completedTasks.length} icon={CheckCircle} variant="completed" />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="font-semibold">Your Tasks</h2>
            {tasks.length === 0 ? (
              <div className="glass-card p-8 text-center text-muted-foreground">No tasks assigned to you yet</div>
            ) : (
              tasks.filter(t => t.status !== 'completed').map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    "glass-card p-4 cursor-pointer transition-all",
                    selectedTask?.id === task.id && "ring-2 ring-primary"
                  )}
                  onClick={() => {
                    setSelectedTask(task);
                    setVideoUploaded(false);
                    setShowVideoRecorder(false);
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">{complaintTypeLabels[task.type]}</Badge>
                        <Badge className={cn("border", task.status === 'assigned' ? 'status-pending' : 'status-progress')}>
                          {task.status === 'assigned' ? 'Assigned' : 'Awaiting Confirmation'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">#{task.id.slice(-8)}</span>
                      </div>
                      <p className="text-sm mb-2 line-clamp-2">{task.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {task.address}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="glass-card p-6 h-fit sticky top-24">
            {selectedTask ? (
              <div className="space-y-4">
                <h3 className="font-semibold">Complete Task</h3>
                <p className="text-sm text-muted-foreground line-clamp-3">{selectedTask.description}</p>

                <div className="text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3 inline mr-1" />
                  {selectedTask.address}
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2">Status</p>
                  <Badge className={cn("border", selectedTask.status === 'assigned' ? 'status-pending' : 'status-progress')}>
                    {selectedTask.status === 'assigned' ? 'Assigned - Needs Completion' : 'Awaiting Citizen Confirmation'}
                  </Badge>
                </div>

                {/* View Complaint Video */}
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => {
                    setDetailTask(selectedTask);
                    setShowDetailDialog(true);
                  }}
                >
                  <Video className="w-4 h-4" />
                  View Complaint Video
                </Button>

                {selectedTask.status === 'assigned' && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Upload LIVE Completion Video</p>

                    {!showVideoRecorder && !videoUploaded && (
                      <button
                        onClick={() => setShowVideoRecorder(true)}
                        className="w-full aspect-video rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-colors"
                      >
                        <Video className="w-8 h-8 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Record Live Completion Video</span>
                        <span className="text-xs text-destructive">❌ Gallery uploads disabled</span>
                      </button>
                    )}

                    {showVideoRecorder && !videoUploaded && user && (
                      <WorkerVideoRecorder
                        complaintId={selectedTask.id}
                        userId={user.id}
                        onVideoUploaded={handleVideoUploaded}
                      />
                    )}

                    {videoUploaded && (
                      <div className="glass-card p-4 text-center">
                        <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-2">
                          <Video className="w-6 h-6 text-success" />
                        </div>
                        <p className="text-sm text-success font-medium">Completion video uploaded ✓</p>
                      </div>
                    )}
                  </div>
                )}

                {selectedTask.status === 'assigned' && (
                  <Button
                    className="w-full gap-2"
                    disabled={!videoUploaded || isSubmitting}
                    onClick={handleSubmitCompletion}
                  >
                    {isSubmitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />Submitting...</>
                    ) : (
                      <><CheckCircle className="w-4 h-4" />Submit Completion Proof</>
                    )}
                  </Button>
                )}

                {!videoUploaded && selectedTask.status === 'assigned' && (
                  <p className="text-xs text-destructive text-center">
                    ⚠️ You must record and upload a LIVE video before submitting
                  </p>
                )}

                {selectedTask.status === 'in_progress' && (
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-sm">
                    <CheckCircle className="w-4 h-4 inline mr-2 text-primary" />
                    Proof submitted! Waiting for citizen confirmation.
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <p>Select a task to complete</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Complaint Detail Dialog */}
      <ComplaintDetailDialog
        complaint={detailTask}
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
      />
    </DashboardLayout>
  );
};

export default WorkerPanel;
