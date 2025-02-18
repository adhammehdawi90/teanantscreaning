import React, { useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { VideoStorageService } from '../services/videoStorage';

interface VideoRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  onError: (error: Error) => void;
  maxDuration?: number;
  type: 'webcam' | 'screen';
}

export interface VideoRecorderRef {
  cleanup: () => void;
  stopRecording: () => Promise<void>;
  getCurrentBlob: () => Blob | null;
}

export const VideoRecorder = forwardRef<VideoRecorderRef, VideoRecorderProps>(
  ({ onRecordingComplete, onError, maxDuration = 3600, type }, ref) => {
    const [isRecording, setIsRecording] = useState(false);
    const [status, setStatus] = useState<string>('Ready');
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const videoRef = useRef<HTMLVideoElement>(null);
    const finalBlobRef = useRef<Blob | null>(null);

    const cleanup = () => {
      console.log('🧹 Cleaning up recorder resources...');
      
      if (mediaRecorderRef.current) {
        if (mediaRecorderRef.current.state !== 'inactive') {
          console.log('⏹️ Stopping media recorder');
          mediaRecorderRef.current.stop();
        }
        mediaRecorderRef.current = null;
      }

      if (streamRef.current) {
        console.log('🎥 Stopping media streams');
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log(`Stopped track: ${track.kind}`);
        });
        streamRef.current = null;
      }

      chunksRef.current = [];
      finalBlobRef.current = null;
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      console.log('✅ Cleanup completed');
    };

    const createFinalBlob = async () => {
      if (chunksRef.current.length === 0) {
        console.log('No chunks available to create final blob');
        return null;
      }

      const options = VideoStorageService.getRecorderOptions();
      const blob = new Blob(chunksRef.current, { type: options.mimeType });
      console.log('Created final blob:', {
        size: blob.size,
        type: blob.type,
        chunks: chunksRef.current.length
      });
      finalBlobRef.current = blob;
      return blob;
    };

    const startRecording = async () => {
      try {
        console.log(`🎬 Starting ${type} recording process...`);
        setStatus('Initializing...');
        cleanup();

        let stream: MediaStream;
        if (type === 'webcam') {
          console.log('📸 Requesting webcam access...');
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 }
            },
            audio: true
          });
        } else {
          console.log('🖥️ Requesting screen sharing...');
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

        console.log('✅ Media access granted', {
          tracks: stream.getTracks().map(t => ({
            kind: t.kind,
            label: t.label,
            settings: t.getSettings()
          }))
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        const options = VideoStorageService.getRecorderOptions();
        console.log('🎥 Creating MediaRecorder with options:', options);
        
        const mediaRecorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          console.log(`📦 Received data chunk: ${event.data.size} bytes`);
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          console.log('⏹️ Recording stopped');
          try {
            const blob = await createFinalBlob();
            if (blob) {
              onRecordingComplete(blob);
            }
            setIsRecording(false);
            setStatus('Recording completed');
          } catch (error) {
            console.error('❌ Error processing recording:', error);
            onError(error as Error);
          }
        };

        mediaRecorder.onerror = (event) => {
          console.error('❌ MediaRecorder error:', event);
          onError(new Error('Recording failed'));
          cleanup();
          setIsRecording(false);
          setStatus('Recording failed');
        };

        console.log('▶️ Starting MediaRecorder');
        mediaRecorder.start(1000); // Capture in 1-second chunks
        setIsRecording(true);
        setStatus('Recording...');

        if (maxDuration) {
          console.log(`⏲️ Setting max duration: ${maxDuration}s`);
          setTimeout(() => {
            if (mediaRecorderRef.current?.state === 'recording') {
              console.log('⏹️ Max duration reached, stopping recording');
              stopRecording();
            }
          }, maxDuration * 1000);
        }
      } catch (error) {
        console.error('❌ Failed to start recording:', error);
        onError(error as Error);
        cleanup();
        setIsRecording(false);
        setStatus('Failed to start recording');
      }
    };

    const stopRecording = async () => {
      console.log('🛑 Stop recording requested');
      return new Promise<void>((resolve) => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.onstop = async () => {
            try {
              const blob = await createFinalBlob();
              if (blob) {
                onRecordingComplete(blob);
              }
              setIsRecording(false);
              setStatus('Recording completed');
              resolve();
            } catch (error) {
              console.error('Error processing recording:', error);
              onError(error as Error);
              resolve();
            }
          };
          mediaRecorderRef.current.stop();
          setStatus('Finishing recording...');
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

    // Cleanup on unmount
    React.useEffect(() => {
      return () => {
        cleanup();
      };
    }, []);

    return (
      <div className="space-y-4">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full rounded-lg bg-black"
        />
        
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-gray-500">{status}</p>
          {!isRecording ? (
            <Button 
              onClick={startRecording}
              variant="default"
            >
              Start {type === 'webcam' ? 'Webcam' : 'Screen'} Recording
            </Button>
          ) : (
            <Button 
              onClick={stopRecording}
              variant="destructive"
            >
              Stop Recording
            </Button>
          )}
        </div>
      </div>
    );
  }
);