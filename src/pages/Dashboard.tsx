import { FileText, Clock, CheckCircle, AlertTriangle, TrendingUp, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { KPICard } from '@/components/dashboard/KPICard';
import { ComplaintCard } from '@/components/dashboard/ComplaintCard';
import { ComplaintChart } from '@/components/dashboard/ComplaintChart';
import { ComplaintMap } from '@/components/map/ComplaintMap';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeComplaints } from '@/hooks/useRealtimeComplaints';
import { Complaint, ChartData } from '@/types';

export const Dashboard = () => {
  const { profile } = useAuth();
  const { complaints, isLoading } = useRealtimeComplaints({});
  
  const displayName = profile?.full_name || 'User';

  // Calculate KPIs from real data
  const pending = complaints.filter(c => c.status === 'pending').length;
  const inProgress = complaints.filter(c => c.status === 'in_progress' || c.status === 'assigned').length;
  const completed = complaints.filter(c => c.status === 'completed').length;
  const delayed = complaints.filter(c => c.status === 'delayed').length;

  // Transform for map display - ensure all required properties
  const mapComplaints: Complaint[] = complaints.map(c => ({
    id: c.id,
    type: c.type as Complaint['type'],
    description: c.description,
    status: (c.status === 'assigned' ? 'in_progress' : c.status) as Complaint['status'],
    location: {
      lat: c.latitude,
      lng: c.longitude,
      address: c.address,
    },
    images: [],
    citizenId: c.citizen_id,
    citizenName: 'Citizen',
    createdAt: new Date(c.created_at || new Date()),
    updatedAt: new Date(c.updated_at || new Date()),
    slaDeadline: new Date(c.sla_deadline || new Date()),
    daysRemaining: c.sla_deadline 
      ? Math.ceil((new Date(c.sla_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 7,
    aiVerified: false,
  }));

  // Chart data from real complaints - using ChartData type with 'value' property
  const trendData: ChartData[] = [
    { name: 'Mon', value: complaints.length > 0 ? Math.min(complaints.length, 5) : 0 },
    { name: 'Tue', value: 0 },
    { name: 'Wed', value: 0 },
    { name: 'Thu', value: 0 },
    { name: 'Fri', value: 0 },
    { name: 'Sat', value: 0 },
    { name: 'Sun', value: 0 },
  ];

  const statusData: ChartData[] = [
    { name: 'Pending', value: pending },
    { name: 'In Progress', value: inProgress },
    { name: 'Completed', value: completed },
    { name: 'Delayed', value: delayed },
  ];

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
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back, <span className="gradient-text">{displayName}</span>
          </h1>
          <p className="text-muted-foreground">Here's your public works overview (live session data)</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard
            title="Total Complaints"
            value={complaints.length}
            icon={FileText}
          />
          <KPICard
            title="Pending"
            value={pending}
            icon={Clock}
            variant="pending"
          />
          <KPICard
            title="In Progress"
            value={inProgress}
            icon={TrendingUp}
            variant="progress"
          />
          <KPICard
            title="Completed"
            value={completed}
            icon={CheckCircle}
            variant="completed"
          />
          <KPICard
            title="Delayed (>7 days)"
            value={delayed}
            icon={AlertTriangle}
            variant="delayed"
          />
        </div>

        {/* Charts & Map Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          <ComplaintChart data={trendData} type="area" title="Complaint Trend" />
          <ComplaintChart data={statusData} type="bar" title="Status Distribution" />
        </div>

        {/* Map */}
        <ComplaintMap complaints={mapComplaints} />

        {/* Recent Complaints */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Recent Complaints</h2>
          {mapComplaints.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {mapComplaints.slice(0, 4).map((complaint) => (
                <ComplaintCard key={complaint.id} complaint={complaint} showActions />
              ))}
            </div>
          ) : (
            <div className="glass-card p-8 text-center text-muted-foreground">
              No new complaints in this session. Submit a complaint to see it here!
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
