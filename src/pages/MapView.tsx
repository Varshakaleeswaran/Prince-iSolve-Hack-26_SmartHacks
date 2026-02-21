import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ComplaintMap } from '@/components/map/ComplaintMap';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useRealtimeComplaints } from '@/hooks/useRealtimeComplaints';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Complaint } from '@/types';

export const MapView = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { complaints, isLoading } = useRealtimeComplaints({});

  // Transform DB complaints to UI format
  const mapComplaints: Complaint[] = complaints.map(c => ({
    id: c.id,
    type: c.type as Complaint['type'],
    description: c.description,
    status: (c.status === 'assigned' ? 'in_progress' : c.status) as Complaint['status'],
    location: { lat: c.latitude, lng: c.longitude, address: c.address },
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <ComplaintMap complaints={mapComplaints} fullScreen />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Live Complaints Map</h1>
            <p className="text-muted-foreground">View all civic issues across the city (live data only)</p>
          </div>
        </div>
        <ComplaintMap complaints={mapComplaints} fullScreen />
      </div>
    </DashboardLayout>
  );
};

export default MapView;
