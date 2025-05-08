import { useRef, useState, useCallback, useEffect } from 'react';
import { FileVideo, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface ScreenRecorderProps {
  onRecordingComplete: (videoBlob: Blob) => void;
  maxDuration?: number; // in seconds
}

export function ScreenRecorder({ onRecordingComplete, maxDuration = 300 }: ScreenRecorderProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string>("");
  const [hasError, setHasError] = useState(false);
  const { toast } = useToast();
  const chunks = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout>();
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      stopAllTracks();
      clearTimers();
    };
  }, []);

  const clearTimers = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const stopAllTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log(`Stopped ${track.kind} track`);
      });
      streamRef.current = null;
    }
  };

  const handleDataAvailable = useCallback((event: BlobEvent) => {
    if (event.data && event.data.size > 0) {
      chunks.current.push(event.data);
      console.log(`Chunk received: ${event.data.size} bytes, total chunks: ${chunks.current.length}`);
    }
  }, []);

  const finalizeRecording = useCallback(() => {
    if (chunks.current.length > 0) {
      try {
        const totalSize = chunks.current.reduce((acc, chunk) => acc + (chunk as Blob).size, 0);
        console.log(`Processing ${chunks.current.length} chunks, total size: ${totalSize} bytes`);

        if (totalSize === 0) {
          throw new Error('No data was recorded');
        }

        const finalBlob = new Blob(chunks.current, { 
          type: 'video/webm;codecs=vp8,opus' 
        });

        if (finalBlob.size > 0) {
          console.log(`Final recording size: ${finalBlob.size} bytes`);
          onRecordingComplete(finalBlob);
        } else {
          throw new Error('Generated recording is empty');
        }
      } catch (error) {
        console.error('Error finalizing recording:', error);
        setError(error instanceof Error ? error.message : String(error));
      }
    } else {
      setError('No recording data available');
    }
    chunks.current = [];
  }, [onRecordingComplete]);

  const handleStartRecording = useCallback(async () => {
    try {
      chunks.current = [];
      setError("");
      setHasError(false);

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: 30 },
          displaySurface: 'monitor'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus',
        videoBitsPerSecond: 2500000
      });

      mediaRecorderRef.current = mediaRecorder;
      
      // Monitor stream status
      stream.addEventListener('inactive', () => {
        console.log('Stream became inactive');
        handleStopRecording();
      });

      stream.getTracks().forEach(track => {
        track.addEventListener('ended', () => {
          console.log(`Track ${track.kind} ended`);
          handleStopRecording();
        });
      });

      mediaRecorder.ondataavailable = handleDataAvailable;
      
      mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped');
        if (!hasError) {
          finalizeRecording();
        }
        setIsRecording(false);
        setRecordingTime(0);
        clearTimers();
        stopAllTracks();
      };

      mediaRecorder.onerror = (event: Event) => {
        const errorEvent = event as ErrorEvent;
        console.error('MediaRecorder error:', errorEvent);
        setError(`Recording error: ${errorEvent.message || 'Unknown error'}`);
        setHasError(true);
        handleStopRecording();
      };

      // Start recording with smaller timeslice
      mediaRecorder.start(100);
      setIsRecording(true);

      // Start timer
      let time = 0;
      timerRef.current = setInterval(() => {
        time += 1;
        setRecordingTime(time);

        if (time >= maxDuration) {
          handleStopRecording();
          toast({
            title: "Recording Complete",
            description: "Maximum recording duration reached"
          });
        }
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      setError(`Failed to start: ${error instanceof Error ? error.message : String(error)}`);
      stopAllTracks();
      clearTimers();
    }
  }, [maxDuration, handleDataAvailable, finalizeRecording, hasError]);

  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      console.log("Stopping MediaRecorder...");
      mediaRecorderRef.current.stop();
    }
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      <div className="relative rounded-lg overflow-hidden bg-black/5 aspect-video flex items-center justify-center">
        {isRecording ? (
          <div className="text-center">
            <div className="animate-pulse text-red-500">Recording Screen</div>
            <div className="text-sm text-muted-foreground mt-2">{formatTime(recordingTime)}</div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            Click "Start Screen Recording" to share your screen
          </div>
        )}
      </div>

      <div className="flex justify-center">
        {!isRecording ? (
          <Button onClick={handleStartRecording}>
            <FileVideo className="mr-2 h-4 w-4" />
            Start Screen Recording
          </Button>
        ) : (
          <Button variant="destructive" onClick={handleStopRecording}>
            Stop Recording
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}