import { useState, useRef, useCallback, useEffect } from 'react';
import { Video, MapPin, Clock, Square, Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface RecordedVideo {
  dataUrl: string;
  timestamp: Date;
  location: { lat: number; lng: number } | null;
  duration: number;
}

interface StrictVideoRecorderProps {
  onVideoSubmitted: (videoData: RecordedVideo) => void;
  maxDuration?: number;
}

type RecordingStep = 'idle' | 'recording' | 'stopped' | 'submitting' | 'submitted';

export const StrictVideoRecorder = ({ onVideoSubmitted, maxDuration = 30 }: StrictVideoRecorderProps) => {
  const [step, setStep] = useState<RecordingStep>('idle');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedVideo, setCapturedVideo] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playbackRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 1280, height: 720 },
        audio: true
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Get location
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          },
          (err) => console.log('Location error:', err)
        );
      }
    } catch (err) {
      setError('Unable to access camera. Please grant camera and microphone permissions.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
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
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const dataUrl = URL.createObjectURL(blob);
      setCapturedVideo(dataUrl);
      setVideoDuration(recordingTime);
      stopCamera();
      setStep('stopped');
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setStep('recording');
    setRecordingTime(0);

    timerRef.current = setInterval(() => {
      setRecordingTime(prev => {
        if (prev >= maxDuration - 1) {
          handleStopRecording();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  }, [stream, maxDuration, handleStopRecording, stopCamera, recordingTime]);

  const handleSubmitVideo = useCallback(async () => {
    if (!capturedVideo) return;

    setStep('submitting');

    try {
      // Convert blob URL to data URL for storage
      const response = await fetch(capturedVideo);
      const blob = await response.blob();
      const reader = new FileReader();

      reader.onloadend = () => {
        onVideoSubmitted({
          dataUrl: reader.result as string,
          timestamp: new Date(),
          location,
          duration: videoDuration,
        });
        setStep('submitted');
      };

      reader.readAsDataURL(blob);
    } catch (err) {
      setError('Failed to submit video. Please try again.');
      setStep('stopped');
    }
  }, [capturedVideo, location, videoDuration, onVideoSubmitted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [startCamera, stopCamera, stream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (capturedVideo) {
        URL.revokeObjectURL(capturedVideo);
      }
    };
  }, [capturedVideo]);

  if (step === 'submitted') {
    return (
      <div className="glass-card p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
          <Video className="w-8 h-8 text-success" />
        </div>
        <h3 className="font-semibold text-success mb-2">Video Submitted Successfully</h3>
        <p className="text-sm text-muted-foreground">
          You can now enter the description and submit your complaint.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      {/* Video View */}
      <div className="relative aspect-video bg-black flex items-center justify-center">
        {error ? (
          <div className="text-center p-8">
            <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4 text-sm">{error}</p>
            <Button onClick={startCamera} size="sm">Try Again</Button>
          </div>
        ) : step === 'stopped' || step === 'submitting' ? (
          <div className="relative w-full h-full">
            <video
              ref={playbackRef}
              src={capturedVideo || undefined}
              className="w-full h-full object-cover"
              autoPlay
              loop
              muted
            />
            {/* Play indicator */}
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-success/90 px-3 py-1.5 rounded-full">
              <Play className="w-3 h-3 text-white" />
              <span className="text-white text-sm font-medium">Preview</span>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              onLoadedMetadata={() => videoRef.current?.play()}
            />
            {/* Recording indicator */}
            {step === 'recording' && (
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-destructive/90 px-3 py-1.5 rounded-full">
                <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
                <span className="text-white text-sm font-medium">{formatTime(recordingTime)}</span>
              </div>
            )}
          </>
        )}

        {/* Metadata Overlay */}
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

      {/* Controls - Only 3 buttons */}
      <div className="p-4 space-y-3">
        <div className="flex gap-3">
          {/* Start Recording */}
          <Button
            onClick={handleStartRecording}
            disabled={step !== 'idle' || !stream}
            className={cn(
              "flex-1",
              step === 'idle' && stream ? "bg-success hover:bg-success/90" : ""
            )}
          >
            <Video className="w-4 h-4 mr-2" />
            Start Recording
          </Button>

          {/* Stop Recording */}
          <Button
            onClick={handleStopRecording}
            disabled={step !== 'recording'}
            variant={step === 'recording' ? 'destructive' : 'outline'}
            className="flex-1"
          >
            <Square className="w-4 h-4 mr-2" />
            Stop Recording
          </Button>
        </div>

        {/* Submit Video */}
        <Button
          onClick={handleSubmitVideo}
          disabled={step !== 'stopped'}
          className="w-full"
          size="lg"
        >
          {step === 'submitting' ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Submit Video
            </>
          )}
        </Button>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span className={cn("px-2 py-1 rounded", step === 'idle' && "bg-primary/20 text-primary")}>
            1. Start
          </span>
          <span>→</span>
          <span className={cn("px-2 py-1 rounded", step === 'recording' && "bg-destructive/20 text-destructive")}>
            2. Stop
          </span>
          <span>→</span>
          <span className={cn("px-2 py-1 rounded", step === 'stopped' && "bg-success/20 text-success")}>
            3. Submit
          </span>
        </div>
      </div>
    </div>
  );
};
