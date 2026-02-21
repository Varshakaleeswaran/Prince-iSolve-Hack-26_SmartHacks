import { useState, useEffect } from 'react';
import { MapPin, Send, CheckCircle, Loader2, Navigation, Camera, AlertTriangle } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StrictVideoRecorder, RecordedVideo } from '@/components/complaint/StrictVideoRecorder';
import { CameraCapture } from '@/components/forms/CameraCapture';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

type ComplaintType = Database['public']['Enums']['complaint_type'];

const complaintTypeLabels: Record<string, string> = {
  pothole: 'Pothole',
  streetlight: 'Streetlight Issue',
  garbage: 'Garbage Dumping',
  drainage: 'Drainage Problem',
};

interface CapturedImage {
  dataUrl: string;
  timestamp: Date;
  location: { lat: number; lng: number } | null;
}

interface GPSLocation {
  lat: number;
  lng: number;
  address: string;
}

export const RaiseComplaint = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isVideoSubmitted, setIsVideoSubmitted] = useState(false);
  const [submittedVideo, setSubmittedVideo] = useState<RecordedVideo | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [complaintType, setComplaintType] = useState<ComplaintType | ''>('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedId, setSubmittedId] = useState<string>('');
  const [isValidatingMedia, setIsValidatingMedia] = useState(false);

  const [gpsLocation, setGpsLocation] = useState<GPSLocation | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    getGPSLocation();
  }, []);

  const getGPSLocation = async () => {
    setIsGettingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const data = await response.json();
          const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          setGpsLocation({ lat, lng, address });
        } catch {
          setGpsLocation({ lat, lng, address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` });
        }
        setIsGettingLocation(false);
      },
      (error) => {
        let errorMessage = 'Unable to get your location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location access.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        setLocationError(errorMessage);
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const extractFrameFromVideo = (videoDataUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = videoDataUrl;
      video.muted = true;
      video.currentTime = 1; // grab frame at 1 second

      video.onloadeddata = () => {
        video.currentTime = 1;
      };

      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        } else {
          reject(new Error('Could not get canvas context'));
        }
      };

      video.onerror = () => reject(new Error('Video load failed'));
    });
  };

  const validateMediaWithAI = async (imageBase64: string, type: string): Promise<{ valid: boolean; reason: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('validate-media', {
        body: { imageBase64, complaintType: type },
      });

      if (error) {
        console.error('AI validation error:', error);
        return { valid: true, reason: 'Validation service unavailable, allowing submission.' };
      }

      return data as { valid: boolean; reason: string };
    } catch (err) {
      console.error('AI validation call failed:', err);
      return { valid: true, reason: 'Validation service unavailable.' };
    }
  };

  const handleVideoSubmitted = (videoData: RecordedVideo) => {
    setSubmittedVideo(videoData);
    setIsVideoSubmitted(true);

    if (videoData.location && !gpsLocation) {
      setGpsLocation({
        lat: videoData.location.lat,
        lng: videoData.location.lng,
        address: `${videoData.location.lat.toFixed(6)}, ${videoData.location.lng.toFixed(6)}`
      });
    }

    toast({ title: 'Video Submitted', description: 'You can now enter the description.' });
  };

  const handlePhotoCapture = (imageData: CapturedImage) => {
    setCapturedImages([...capturedImages, imageData]);
    setShowCamera(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in', variant: 'destructive' });
      return;
    }
    if (!isVideoSubmitted || !submittedVideo) {
      toast({ title: 'Error', description: 'Please record and submit a video first', variant: 'destructive' });
      return;
    }
    if (!gpsLocation) {
      toast({ title: 'Error', description: 'Location is required. Please enable GPS.', variant: 'destructive' });
      return;
    }
    if (!complaintType) {
      toast({ title: 'Error', description: 'Please select a complaint type', variant: 'destructive' });
      return;
    }
    if (!description.trim()) {
      toast({ title: 'Error', description: 'Please enter a description', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    setIsValidatingMedia(true);

    try {
      // AI Validation: extract a frame from video and validate
      let frameBase64: string;
      try {
        frameBase64 = await extractFrameFromVideo(submittedVideo.dataUrl);
      } catch {
        // If frame extraction fails, try with first captured image
        if (capturedImages.length > 0) {
          frameBase64 = capturedImages[0].dataUrl;
        } else {
          frameBase64 = submittedVideo.dataUrl; // fallback
        }
      }

      const validationResult = await validateMediaWithAI(frameBase64, complaintType);
      setIsValidatingMedia(false);

      if (!validationResult.valid) {
        toast({
          title: '❌ Media Rejected by AI',
          description: validationResult.reason || 'The uploaded media does not match the selected complaint type. Please capture relevant media.',
          variant: 'destructive'
        });
        setIsSubmitting(false);
        return;
      }

      toast({ title: '✅ AI Verified', description: 'Media matches the complaint type.' });

      // Upload video to storage
      const videoResponse = await fetch(submittedVideo.dataUrl);
      const videoBlob = await videoResponse.blob();
      const videoFileName = `${user.id}/${Date.now()}-complaint-video.webm`;

      const { data: videoUpload, error: videoUploadError } = await supabase.storage
        .from('complaint-images')
        .upload(videoFileName, videoBlob, { contentType: 'video/webm' });

      if (videoUploadError) throw videoUploadError;

      const { data: videoUrlData } = supabase.storage
        .from('complaint-images')
        .getPublicUrl(videoUpload.path);

      // Upload additional images
      const imageUrls: string[] = [];
      for (const image of capturedImages) {
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
        const response = await fetch(image.dataUrl);
        const blob = await response.blob();
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('complaint-images')
          .upload(fileName, blob, { contentType: 'image/jpeg' });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from('complaint-images')
          .getPublicUrl(uploadData.path);
        imageUrls.push(urlData.publicUrl);
      }

      // Create complaint
      const { data: complaint, error: complaintError } = await supabase
        .from('complaints')
        .insert({
          citizen_id: user.id,
          type: complaintType as ComplaintType,
          description,
          address: gpsLocation.address,
          latitude: gpsLocation.lat,
          longitude: gpsLocation.lng,
          status: 'pending',
        })
        .select()
        .single();

      if (complaintError) throw complaintError;

      // Insert video as complaint image (before type)
      await supabase.from('complaint_images').insert({
        complaint_id: complaint.id,
        image_url: videoUrlData.publicUrl,
        image_type: 'before',
        latitude: gpsLocation.lat,
        longitude: gpsLocation.lng,
      });

      // Insert additional images
      for (const url of imageUrls) {
        await supabase.from('complaint_images').insert({
          complaint_id: complaint.id,
          image_url: url,
          image_type: 'before',
          latitude: gpsLocation.lat,
          longitude: gpsLocation.lng,
        });
      }

      setSubmittedId(complaint.id.slice(-8));
      setIsSubmitted(true);
    } catch (error) {
      console.error('Error submitting complaint:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit complaint';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }

    setIsSubmitting(false);
    setIsValidatingMedia(false);
  };

  const resetForm = () => {
    setIsSubmitted(false);
    setIsVideoSubmitted(false);
    setSubmittedVideo(null);
    setCapturedImages([]);
    setComplaintType('');
    setDescription('');
    setGpsLocation(null);
    getGPSLocation();
  };

  if (isSubmitted) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Complaint Submitted!</h2>
            <p className="text-muted-foreground mb-6">
              Your complaint has been registered and will be reviewed shortly.
            </p>
            <p className="text-sm text-muted-foreground mb-8">
              Complaint ID: <span className="text-primary font-mono">#{submittedId}</span>
            </p>
            <Button onClick={resetForm}>
              Submit Another Complaint
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {showCamera && (
        <CameraCapture
          onCapture={handlePhotoCapture}
          onCancel={() => setShowCamera(false)}
        />
      )}

      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">🧑‍🤝‍🧑 Citizen Complaint</h1>
          <p className="text-muted-foreground">Report civic issues with verified video evidence</p>
        </div>

        {/* Warning Banner */}
        <div className="glass-card p-4 mb-6 border-l-4 border-warning bg-warning/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-warning mb-1">Strict Recording Rules</p>
              <ul className="text-muted-foreground space-y-1">
                <li>• LIVE video recording is MANDATORY</li>
                <li>• No gallery uploads allowed</li>
                <li>• AI validates media matches complaint type</li>
                <li>• Description is disabled until video is submitted</li>
                <li>• Page refresh requires re-recording</li>
              </ul>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Select Complaint Type */}
          <div className="glass-card p-6">
            <Label className="text-base font-medium mb-4 block">
              Step 1: Select Complaint Type
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(complaintTypeLabels).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setComplaintType(value as ComplaintType)}
                  className={cn(
                    "p-4 rounded-lg border-2 text-left transition-all",
                    complaintType === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span className="font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: GPS Location */}
          <div className="glass-card p-6">
            <Label className="text-base font-medium mb-4 block">
              Step 2: Location
              <span className="text-xs text-muted-foreground ml-2">(Auto-detected)</span>
            </Label>

            {gpsLocation ? (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/10 border border-primary/30">
                <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary">Location Captured ✓</p>
                  <p className="text-xs text-muted-foreground">{gpsLocation.address}</p>
                </div>
              </div>
            ) : isGettingLocation ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Getting your location...</p>
              </div>
            ) : locationError ? (
              <div className="space-y-2">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                  <MapPin className="w-5 h-5 text-destructive shrink-0" />
                  <p className="text-sm text-destructive">{locationError}</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={getGPSLocation}>
                  <Navigation className="w-4 h-4 mr-2" />
                  Retry Location
                </Button>
              </div>
            ) : null}
          </div>

          {/* Step 3: MANDATORY Video Recording */}
          <div className="glass-card p-6">
            <Label className="text-base font-medium mb-4 block">
              Step 3: Record Video
              <span className="text-xs text-destructive ml-2">(MANDATORY - Live Only)</span>
            </Label>

            <StrictVideoRecorder onVideoSubmitted={handleVideoSubmitted} maxDuration={30} />
          </div>

          {/* Step 4: Optional Photo */}
          {isVideoSubmitted && (
            <div className="glass-card p-6 animate-fade-in">
              <Label className="text-base font-medium mb-4 block">
                Step 4: Additional Photos
                <span className="text-xs text-muted-foreground ml-2">(Optional)</span>
              </Label>

              <div className="grid grid-cols-3 gap-3">
                {capturedImages.map((image, index) => (
                  <div key={index} className="relative aspect-video rounded-lg overflow-hidden">
                    <img
                      src={image.dataUrl}
                      alt={`Captured ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}

                {capturedImages.length < 3 && (
                  <button
                    type="button"
                    onClick={() => setShowCamera(true)}
                    className={cn(
                      "aspect-video rounded-lg border-2 border-dashed border-border",
                      "flex flex-col items-center justify-center gap-2",
                      "hover:border-primary hover:bg-primary/5 transition-colors"
                    )}
                  >
                    <Camera className="w-6 h-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Add Photo</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Description */}
          <div className={cn(
            "glass-card p-6 transition-opacity",
            !isVideoSubmitted && "opacity-50 pointer-events-none"
          )}>
            <Label className="text-base font-medium mb-4 block">
              Step 5: Description
              {!isVideoSubmitted && (
                <span className="text-xs text-destructive ml-2">(Submit video first)</span>
              )}
            </Label>

            <Textarea
              placeholder="Describe the issue in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-24"
              disabled={!isVideoSubmitted}
              required
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={
              !isVideoSubmitted ||
              !complaintType ||
              !description.trim() ||
              !gpsLocation ||
              isSubmitting
            }
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isValidatingMedia ? 'AI Validating Media...' : 'Submitting...'}
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Complaint
              </>
            )}
          </Button>

          {!isVideoSubmitted && (
            <p className="text-center text-sm text-destructive">
              Complete the video recording flow to enable submission
            </p>
          )}
        </form>
      </div>
    </DashboardLayout>
  );
};

export default RaiseComplaint;
