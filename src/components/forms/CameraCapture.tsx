import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, X, Check, RotateCcw, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CameraCaptureProps {
  onCapture: (imageData: {
    dataUrl: string;
    timestamp: Date;
    location: { lat: number; lng: number } | null
  }) => void;
  onCancel: () => void;
}

export const CameraCapture = ({ onCapture, onCancel }: CameraCaptureProps) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 1280, height: 720 }
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
      setError('Unable to access camera. Please grant camera permissions.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      setIsCapturing(true);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(dataUrl);
        stopCamera();
      }
      setTimeout(() => setIsCapturing(false), 200);
    }
  }, [stopCamera]);

  const retake = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const confirmCapture = useCallback(() => {
    if (capturedImage) {
      onCapture({
        dataUrl: capturedImage,
        timestamp: new Date(),
        location,
      });
    }
  }, [capturedImage, location, onCapture]);

  const handleCancel = useCallback(() => {
    stopCamera();
    onCancel();
  }, [stopCamera, onCancel]);

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera, stopCamera, stream]);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-border">
        <h2 className="font-semibold">Capture Photo</h2>
        <Button variant="ghost" size="icon" onClick={handleCancel}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative bg-black flex items-center justify-center">
        {error ? (
          <div className="text-center p-8">
            <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={startCamera}>Try Again</Button>
          </div>
        ) : capturedImage ? (
          <img
            src={capturedImage}
            alt="Captured"
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="max-w-full max-h-full object-contain"
              onLoadedMetadata={() => videoRef.current?.play()}
            />
            {/* Capture overlay effect */}
            {isCapturing && (
              <div className="absolute inset-0 bg-white animate-fade-out" />
            )}
          </>
        )}
        <canvas ref={canvasRef} className="hidden" />

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
            <span className="text-xs text-primary">Live Capture Only</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-6 border-t border-border">
        {capturedImage ? (
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
              Use Photo
            </Button>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={capturePhoto}
              className={cn(
                "w-24 h-24 rounded-full border-4 border-white bg-white/20",
                "flex items-center justify-center transition-all",
                "hover:scale-105 hover:bg-white/30 active:scale-95"
              )}
              style={{
                boxShadow: '0 0 30px rgba(34, 197, 94, 0.6), 0 0 60px rgba(34, 197, 94, 0.4)'
              }}
            >
              <div
                className="w-16 h-16 rounded-full"
                style={{ backgroundColor: 'hsl(120, 60%, 45%)' }}
              />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
