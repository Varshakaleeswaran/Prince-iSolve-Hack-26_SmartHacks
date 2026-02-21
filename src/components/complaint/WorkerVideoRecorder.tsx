import { useState, useRef, useCallback, useEffect } from 'react';
import { Video, MapPin, Clock, Square, Play, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface WorkerVideoRecorderProps {
  complaintId: string;
  userId: string;
  onVideoUploaded: (videoUrl: string) => void;
  maxDuration?: number;
}

type RecordingStep = 'idle' | 'recording' | 'stopped' | 'uploading' | 'uploaded';

export const WorkerVideoRecorder = ({ complaintId, userId, onVideoUploaded, maxDuration = 30 }: WorkerVideoRecorderProps) => {
  const [step, setStep] = useState<RecordingStep>('idle');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedVideo, setCapturedVideo] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playbackRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const blobRef = useRef<Blob | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 1280, height: 720 },
        audio: true,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          (err) => console.log('Location error:', err)
        );
      }
    } catch {
      setError('Unable to access camera. Please grant camera and microphone permissions.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  }, [stream]);

  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current && step === 'recording') {
      mediaRecorderRef.current.stop();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [step]);

  const handleStartRecording = useCallback(() => {
    if (!stream) return;
    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      blobRef.current = blob;
      setCapturedVideo(URL.createObjectURL(blob));
      stopCamera();
      setStep('stopped');
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setStep('recording');
    setRecordingTime(0);

    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => {
        if (prev >= maxDuration - 1) {
          handleStopRecording();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  }, [stream, maxDuration, handleStopRecording, stopCamera]);

  const handleUploadVideo = useCallback(async () => {
    if (!blobRef.current) return;
    setStep('uploading');

    try {
      const fileName = `${userId}/${complaintId}-completion-${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('complaint-images')
        .upload(fileName, blobRef.current, { contentType: 'video/webm' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('complaint-images')
        .getPublicUrl(uploadData.path);

      // Save as after image record
      await supabase.from('complaint_images').insert({
        complaint_id: complaintId,
        image_url: urlData.publicUrl,
        image_type: 'after',
        latitude: location?.lat,
        longitude: location?.lng,
      });

      setStep('uploaded');
      onVideoUploaded(urlData.publicUrl);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload video';
      setError(errorMessage + '. Please try again.');
      setStep('stopped');
    }
  }, [complaintId, userId, location, onVideoUploaded]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startCamera, stopCamera, stream]);

  useEffect(() => {
    return () => {
      if (capturedVideo) URL.revokeObjectURL(capturedVideo);
    };
  }, [capturedVideo]);

  if (step === 'uploaded') {
    return (
      <div className="glass-card p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
          <Video className="w-8 h-8 text-success" />
        </div>
        <h3 className="font-semibold text-success mb-2">Completion Video Uploaded</h3>
        <p className="text-sm text-muted-foreground">Video proof has been saved. You can now submit the completion.</p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="relative aspect-video bg-black flex items-center justify-center">
        {error ? (
          <div className="text-center p-8">
            <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4 text-sm">{error}</p>
            <Button onClick={startCamera} size="sm">Try Again</Button>
          </div>
        ) : step === 'stopped' || step === 'uploading' ? (
          <div className="relative w-full h-full">
            <video ref={playbackRef} src={capturedVideo || undefined} className="w-full h-full object-cover" autoPlay loop muted />
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-success/90 px-3 py-1.5 rounded-full">
              <Play className="w-3 h-3 text-white" />
              <span className="text-white text-sm font-medium">Preview</span>
            </div>
          </div>
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" onLoadedMetadata={() => videoRef.current?.play()} />
            {step === 'recording' && (
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-destructive/90 px-3 py-1.5 rounded-full">
                <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
                <span className="text-white text-sm font-medium">{formatTime(recordingTime)}</span>
              </div>
            )}
          </>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-white/80">
              <Clock className="w-3 h-3" />
              {new Date().toLocaleString()}
            </span>
            {location ? (
              <span className="flex items-center gap-1 text-success">
                <MapPin className="w-3 h-3" />
                GPS ✓
              </span>
            ) : (
              <span className="flex items-center gap-1 text-white/60">
                <MapPin className="w-3 h-3" />
                Locating...
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex gap-3">
          <Button onClick={handleStartRecording} disabled={step !== 'idle' || !stream} className={cn("flex-1", step === 'idle' && stream ? "bg-success hover:bg-success/90" : "")}>
            <Video className="w-4 h-4 mr-2" />
            Start Recording
          </Button>
          <Button onClick={handleStopRecording} disabled={step !== 'recording'} variant={step === 'recording' ? 'destructive' : 'outline'} className="flex-1">
            <Square className="w-4 h-4 mr-2" />
            Stop Recording
          </Button>
        </div>

        <Button onClick={handleUploadVideo} disabled={step !== 'stopped'} className="w-full" size="lg">
          {step === 'uploading' ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload Completion Video
            </>
          )}
        </Button>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span className={cn("px-2 py-1 rounded", step === 'idle' && "bg-primary/20 text-primary")}>1. Start</span>
          <span>→</span>
          <span className={cn("px-2 py-1 rounded", step === 'recording' && "bg-destructive/20 text-destructive")}>2. Stop</span>
          <span>→</span>
          <span className={cn("px-2 py-1 rounded", step === 'stopped' && "bg-success/20 text-success")}>3. Upload</span>
        </div>
      </div>
    </div>
  );
};
