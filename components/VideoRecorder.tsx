import React, { useRef, useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Button } from '../client/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../client/src/components/ui/card';
import { AlertCircle, Video, Monitor, Camera, Mic, MicOff } from 'lucide-react';
import { Alert, AlertDescription } from '../client/src/components/ui/alert';
import SpeechRecognizer from '../client/src/lib/speech-recognition';
import { Textarea } from '../client/src/components/ui/textarea';

export interface VideoRecorderProps {
  onRecordingComplete: (blob: Blob, transcript?: string) => void;
  onError: (error: Error) => void;
  type: 'webcam' | 'screen';
  maxDuration?: number;
}

export interface VideoRecorderRef {
  stopRecording: () => Promise<void>;
  cleanup: () => void;
  getCurrentBlob: () => Blob | null;
  getCurrentTranscript: () => string;
}

export const VideoRecorder = forwardRef<VideoRecorderRef, VideoRecorderProps>(
  ({ onRecordingComplete, onError, type, maxDuration = 3600 }, ref) => {
    const [isRecording, setIsRecording] = useState(false);
    const [status, setStatus] = useState<string>('Click Start Recording to begin');
    const [error, setError] = useState<string | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [transcript, setTranscript] = useState<string>('');
    const [isSpeechRecognitionSupported, setIsSpeechRecognitionSupported] = useState(true);
    const [showManualTranscript, setShowManualTranscript] = useState(false);
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const videoRef = useRef<HTMLVideoElement>(null);
    const finalBlobRef = useRef<Blob | null>(null);
    const timerRef = useRef<NodeJS.Timeout>();
    const speechRecognizerRef = useRef<SpeechRecognizer | null>(null);

    useEffect(() => {
      // Initialize speech recognizer
      speechRecognizerRef.current = new SpeechRecognizer({
        onResult: (text, isFinal) => {
          console.log("Speech recognition onResult:", text);
          setTranscript(text);
        },
        onError: (event) => {
          console.error('Speech recognition error:', event);
          setShowManualTranscript(true); // Show manual input on error
        },
        onStart: () => {
          console.log("Speech recognition started");
        },
        onEnd: () => {
          console.log("Speech recognition ended");
        }
      });
      
      // Check if speech recognition is supported
      const isSupported = speechRecognizerRef.current.isRecognitionSupported();
      console.log("Speech recognition supported:", isSupported);
      setIsSpeechRecognitionSupported(isSupported);
      
      // If not supported, show manual transcript input
      if (!isSupported) {
        setShowManualTranscript(true);
      }
      
      return () => {
        if (speechRecognizerRef.current) {
          speechRecognizerRef.current.stop();
        }
      };
    }, []);

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
      
      // Stop speech recognition
      if (speechRecognizerRef.current) {
        speechRecognizerRef.current.stop();
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
        setTranscript('');

        // Reset speech recognizer if needed
        if (speechRecognizerRef.current) {
          speechRecognizerRef.current.reset();
        }

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
            
            // Get the final transcript
            const finalTranscript = transcript;
            console.log("Final transcript on stop:", finalTranscript);
            
            // Stop speech recognition
            if (speechRecognizerRef.current) {
              speechRecognizerRef.current.stop();
            }
            
            // Always send the transcript, even if manually entered
            console.log("Sending blob and transcript to parent:", {
              blobSize: blob.size,
              transcriptLength: finalTranscript.length
            });
            
            // Pass final transcript to parent
            onRecordingComplete(blob, finalTranscript);
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
        
        // Start speech recognition if supported
        if (speechRecognizerRef.current && isSpeechRecognitionSupported) {
          speechRecognizerRef.current.start();
        }

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
          
          // Stop speech recognition
          if (speechRecognizerRef.current) {
            speechRecognizerRef.current.stop();
          }
          
          resolve();
        } else {
          resolve();
        }
      });
    };

    // Add a manual transcript toggle
    const toggleManualTranscript = () => {
      setShowManualTranscript(!showManualTranscript);
    };

    useImperativeHandle(ref, () => ({
      cleanup,
      stopRecording,
      getCurrentBlob: () => finalBlobRef.current,
      getCurrentTranscript: () => transcript
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
            {isSpeechRecognitionSupported && (
              <span className="ml-auto text-xs text-gray-500 flex items-center">
                <Mic className="h-3 w-3 mr-1" /> Speech Recognition {isRecording ? 'Active' : 'Ready'}
              </span>
            )}
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

          {/* Replace the transcript display with this enhanced version */}
          <div className="mt-2 border border-gray-200 rounded-md">
            <div className="flex justify-between items-center p-2 bg-gray-50 border-b">
              <p className="text-xs text-gray-500">Transcript:</p>
              {type === 'webcam' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleManualTranscript}
                  className="h-6 text-xs"
                >
                  {showManualTranscript ? "Hide Manual Input" : "Manual Input"}
                </Button>
              )}
            </div>
            
            {showManualTranscript ? (
              <div className="p-2">
                <Textarea
                  placeholder="Type transcript manually here..."
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  className="min-h-[100px] text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Speech recognition unavailable or disabled. You can type your transcript manually.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-white min-h-[100px] max-h-[150px] overflow-y-auto">
                <p className="text-sm">
                  {transcript || (isRecording ? 'Listening... (speak now)' : 'Transcript will appear here when you speak...')}
                </p>
                {isRecording && !transcript && (
                  <p className="text-xs text-orange-500 mt-2">
                    No speech detected. Make sure your microphone is working and permissions are granted.
                  </p>
                )}
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