import { useState, useRef, useCallback, useEffect } from 'react';
import { Video, X, Check, RotateCcw, MapPin, Clock, Square, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VideoCaptureProps {
  onCapture: (videoData: {
    dataUrl: string;
    timestamp: Date;
    location: { lat: number; lng: number } | null;
    duration: number;
  }) => void;
  onCancel: () => void;
  maxDuration?: number; // in seconds
}

export const VideoCapture = ({ onCapture, onCancel, maxDuration = 30 }: VideoCaptureProps) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedVideo, setCapturedVideo] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
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

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const startRecording = useCallback(() => {
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
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
    setRecordingTime(0);

    timerRef.current = setInterval(() => {
      setRecordingTime(prev => {
        if (prev >= maxDuration - 1) {
          stopRecording();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  }, [stream, maxDuration, stopRecording, stopCamera, recordingTime]);

  const retake = useCallback(() => {
    if (capturedVideo) {
      URL.revokeObjectURL(capturedVideo);
    }
    setCapturedVideo(null);
    setRecordingTime(0);
    setVideoDuration(0);
    startCamera();
  }, [startCamera, capturedVideo]);

  const confirmCapture = useCallback(async () => {
    if (capturedVideo) {
      // Convert blob URL to data URL for storage
      const response = await fetch(capturedVideo);
      const blob = await response.blob();
      const reader = new FileReader();

      reader.onloadend = () => {
        onCapture({
          dataUrl: reader.result as string,
          timestamp: new Date(),
          location,
          duration: videoDuration,
        });
      };

      reader.readAsDataURL(blob);
    }
  }, [capturedVideo, location, videoDuration, onCapture]);

  const handleCancel = useCallback(() => {
    stopRecording();
    stopCamera();
    if (capturedVideo) {
      URL.revokeObjectURL(capturedVideo);
    }
    onCancel();
  }, [stopRecording, stopCamera, capturedVideo, onCancel]);

  const togglePlayback = useCallback(() => {
    if (playbackRef.current) {
      if (isPlaying) {
        playbackRef.current.pause();
      } else {
        playbackRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Start camera on mount
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
  }, [startCamera, stream]);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-border">
        <h2 className="font-semibold">Record Video</h2>
        <Button variant="ghost" size="icon" onClick={handleCancel}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Video View */}
      <div className="flex-1 relative bg-black flex items-center justify-center">
        {error ? (
          <div className="text-center p-8">
            <Video className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={startCamera}>Try Again</Button>
          </div>
        ) : capturedVideo ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <video
              ref={playbackRef}
              src={capturedVideo}
              className="max-w-full max-h-full object-contain"
              onEnded={() => setIsPlaying(false)}
            />
            {/* Play/Pause overlay */}
            <button
              onClick={togglePlayback}
              className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
            >
              <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                {isPlaying ? (
                  <Pause className="w-8 h-8 text-black" />
                ) : (
                  <Play className="w-8 h-8 text-black ml-1" />
                )}
              </div>
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="max-w-full max-h-full object-contain"
              onLoadedMetadata={() => videoRef.current?.play()}
            />
            {/* Recording indicator */}
            {isRecording && (
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-destructive/90 px-3 py-1.5 rounded-full">
                <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
                <span className="text-white text-sm font-medium">{formatTime(recordingTime)}</span>
              </div>
            )}
          </>
        )}

        {/* Metadata Overlay */}
        <div className="absolute bottom-4 left-4 right-4 glass-card p-3 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                {new Date().toLocaleString()}
              </span>
              {location ? (
                <span className="flex items-center gap-1 text-success">
                  <MapPin className="w-3.5 h-3.5" />
                  {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" />
                  Locating...
                </span>
              )}
            </div>
            <span className="text-xs text-primary">Max {maxDuration}s</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-6 border-t border-border">
        {capturedVideo ? (
          <div className="flex gap-4 justify-center">
            <Button
              variant="outline"
              size="lg"
              onClick={retake}
              className="flex-1 max-w-40"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Retake
            </Button>
            <Button
              size="lg"
              onClick={confirmCapture}
              className="flex-1 max-w-40"
            >
              <Check className="w-4 h-4 mr-2" />
              Use Video
            </Button>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={cn(
                "w-24 h-24 rounded-full border-4 border-white",
                "flex items-center justify-center transition-all",
                "hover:scale-105 active:scale-95",
                isRecording ? "bg-destructive/80" : "bg-white/20"
              )}
              style={{
                boxShadow: isRecording
                  ? '0 0 30px rgba(239, 68, 68, 0.6), 0 0 60px rgba(239, 68, 68, 0.4)'
                  : '0 0 30px rgba(239, 68, 68, 0.6), 0 0 60px rgba(239, 68, 68, 0.4)'
              }}
            >
              {isRecording ? (
                <Square className="w-10 h-10 text-white" fill="white" />
              ) : (
                <div
                  className="w-16 h-16 rounded-full"
                  style={{ backgroundColor: 'hsl(0, 70%, 50%)' }}
                />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
