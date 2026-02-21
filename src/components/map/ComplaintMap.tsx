import { useState, useEffect, useRef } from 'react';
import { MapPin, X, Clock, User, Camera, CheckCircle, Video } from 'lucide-react';
import { Complaint, ComplaintStatus } from '@/types';
import { complaintTypeLabels } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ComplaintDetailDialog } from '@/components/complaint/ComplaintDetailDialog';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type DBComplaint = Database['public']['Tables']['complaints']['Row'];

interface ComplaintMapProps {
  complaints: Complaint[];
  fullScreen?: boolean;
}

const statusConfig: Record<ComplaintStatus, { label: string; className: string; color: string }> = {
  pending: { label: 'Pending', className: 'status-pending', color: '#ef4444' },
  in_progress: { label: 'In Progress', className: 'status-progress', color: '#eab308' },
  completed: { label: 'Completed', className: 'status-completed', color: '#22c55e' },
  delayed: { label: 'Delayed', className: 'status-delayed', color: '#ef4444' },
};

export const ComplaintMap = ({ complaints, fullScreen = false }: ComplaintMapProps) => {
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailDBComplaint, setDetailDBComplaint] = useState<DBComplaint | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map centered on India
    const map = L.map(mapContainerRef.current, {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: true,
    });

    // Add satellite tile layer from ESRI
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
    }).addTo(map);

    // Add labels layer on top
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      attribution: '',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when complaints change
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    const bounds: L.LatLngBounds = L.latLngBounds([]);

    complaints.forEach((complaint) => {
      const color = statusConfig[complaint.status].color;
      
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            width: 20px;
            height: 20px;
            background: ${color};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 0 10px ${color}80, 0 2px 8px rgba(0,0,0,0.4);
            cursor: pointer;
          "></div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const marker = L.marker([complaint.location.lat, complaint.location.lng], { icon })
        .addTo(mapRef.current!)
        .on('click', () => setSelectedComplaint(complaint));

      marker.bindTooltip(complaint.id, { 
        className: 'custom-tooltip',
        offset: [0, -15],
      });

      markersRef.current.push(marker);
      bounds.extend([complaint.location.lat, complaint.location.lng]);
    });

    // Fit bounds if we have complaints
    if (complaints.length > 0 && bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [complaints]);

  return (
    <div className={cn(
      "glass-card overflow-hidden relative",
      fullScreen ? "h-[calc(100vh-8rem)]" : "h-96"
    )}>
      {/* Map Header */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex items-center justify-between pointer-events-none">
        <h3 className="font-semibold bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-lg pointer-events-auto">
          Live Complaints Map
        </h3>
        <div className="flex items-center gap-2 bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm pointer-events-auto">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-destructive" />
            Pending
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-warning" />
            In Progress
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-success" />
            Completed
          </span>
        </div>
      </div>

      {/* Leaflet Map Container */}
      <div 
        ref={mapContainerRef} 
        className="h-full w-full"
        style={{ background: '#1a1a2e' }}
      />

      {/* Selected Complaint Panel */}
      {selectedComplaint && (
        <div className="absolute bottom-4 left-4 right-4 z-[1000] glass-card p-4 animate-slide-up">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={cn("border", statusConfig[selectedComplaint.status].className)}>
                  {statusConfig[selectedComplaint.status].label}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {complaintTypeLabels[selectedComplaint.type]}
                </Badge>
                <span className="text-xs text-muted-foreground">#{selectedComplaint.id}</span>
              </div>
              
              <p className="text-sm mb-2">{selectedComplaint.description}</p>
              
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {selectedComplaint.location.address}
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {selectedComplaint.citizenName}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {selectedComplaint.daysRemaining < 0 
                    ? `${Math.abs(selectedComplaint.daysRemaining)} days overdue`
                    : `${selectedComplaint.daysRemaining} days remaining`
                  }
                </span>
                {selectedComplaint.aiVerified && (
                  <span className="flex items-center gap-1 text-success">
                    <CheckCircle className="w-3 h-3" />
                    AI Verified
                  </span>
                )}
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => setSelectedComplaint(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="outline" className="flex-1">
              <Camera className="w-3.5 h-3.5 mr-1" />
              View Photos
            </Button>
            <Button 
              size="sm" 
              className="flex-1"
              disabled={isLoadingDetail}
              onClick={async () => {
                setIsLoadingDetail(true);
                const { data } = await supabase
                  .from('complaints')
                  .select('*')
                  .eq('id', selectedComplaint.id)
                  .maybeSingle();
                setDetailDBComplaint(data);
                setShowDetailDialog(true);
                setIsLoadingDetail(false);
              }}
            >
              <Video className="w-3.5 h-3.5 mr-1" />
              {isLoadingDetail ? 'Loading...' : 'View Details'}
            </Button>
          </div>
        </div>
      )}

      {/* Complaint Detail Dialog */}
      <ComplaintDetailDialog
        complaint={detailDBComplaint}
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
      />
    </div>
  );
};
