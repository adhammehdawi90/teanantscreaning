import React, { useRef, useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Video, Monitor, Camera } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface VideoRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  onError: (error: Error) => void;
  type: 'webcam' | 'screen';
  maxDuration?: number;
}

export interface VideoRecorderRef {
  stopRecording: () => Promise<void>;
  cleanup: () => void;
  getCurrentBlob: () => Blob | null;
}

export const VideoRecorder = forwardRef<VideoRecorderRef, VideoRecorderProps>(
  ({ onRecordingComplete, onError, type, maxDuration = 3600 }, ref) => {
    const [isRecording, setIsRecording] = useState(false);
    const [status, setStatus] = useState<string>('Click Start Recording to begin');
    const [error, setError] = useState<string | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const videoRef = useRef<HTMLVideoElement>(null);
    const finalBlobRef = useRef<Blob | null>(null);
    const timerRef = useRef<NodeJS.Timeout>();

    const cleanup = () => {
      if (mediaRecorderRef.current) {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
        mediaRecorderRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log(`Stopped track: ${track.kind}`);
        });
        streamRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      chunksRef.current = [];
      finalBlobRef.current = null;
      setIsRecording(false);
      setStatus('Click Start Recording to begin');
      setRecordingTime(0);
    };

    useEffect(() => {
      return cleanup;
    }, []);

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const startRecording = async () => {
      try {
        setError(null);
        setStatus('Initializing...');
        cleanup();

        let stream: MediaStream;
        if (type === 'webcam') {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 }
            },
            audio: true
          });
        } else {
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              frameRate: { ideal: 30 }
            },
            audio: {
              echoCancellation: true,
              noiseSuppression: true
            }
          });
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp8,opus',
          videoBitsPerSecond: 2500000,
          audioBitsPerSecond: 128000
        });

        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          try {
            const blob = new Blob(chunksRef.current, { 
              type: 'video/webm;codecs=vp8,opus' 
            });
            
            if (blob.size === 0) {
              throw new Error('Recording is empty');
            }

            finalBlobRef.current = blob;
            onRecordingComplete(blob);
            setStatus('Recording completed');
            setIsRecording(false);
          } catch (error) {
            console.error('Error processing recording:', error);
            onError(error);
          }
        };

        mediaRecorder.start(1000); // Capture in 1-second chunks
        setIsRecording(true);
        setStatus('Recording in progress');

        // Start timer
        let time = 0;
        timerRef.current = setInterval(() => {
          time += 1;
          setRecordingTime(time);
          if (time >= maxDuration) {
            stopRecording();
          }
        }, 1000);

      } catch (error) {
        console.error('Failed to start recording:', error);
        setError(error.message);
        cleanup();
        onError(error);
      }
    };

    const stopRecording = async () => {
      return new Promise<void>((resolve) => {
        if (mediaRecorderRef.current?.state === 'recording') {
          setStatus('Finishing recording...');
          mediaRecorderRef.current.stop();
          resolve();
        } else {
          resolve();
        }
      });
    };

    useImperativeHandle(ref, () => ({
      cleanup,
      stopRecording,
      getCurrentBlob: () => finalBlobRef.current
    }));

    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {type === 'webcam' ? (
              <Camera className="h-5 w-5" />
            ) : (
              <Monitor className="h-5 w-5" />
            )}
            {type === 'webcam' ? 'Webcam' : 'Screen'} Recording
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative rounded-lg overflow-hidden bg-black/5 aspect-video">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            {!streamRef.current && !isRecording && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                Click 'Start Recording' to begin
              </div>
            )}
            {isRecording && (
              <div className="absolute top-4 right-4 bg-red-500 text-white px-2 py-1 rounded-md text-sm flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                {formatTime(recordingTime)}
              </div>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-muted-foreground">{status}</p>
            {!isRecording ? (
              <Button 
                onClick={startRecording}
                className="w-full"
              >
                {type === 'webcam' ? (
                  <Video className="mr-2 h-4 w-4" />
                ) : (
                  <Monitor className="mr-2 h-4 w-4" />
                )}
                Start Recording
              </Button>
            ) : (
              <Button 
                onClick={() => stopRecording()}
                variant="destructive"
                className="w-full"
              >
                Stop Recording
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
);