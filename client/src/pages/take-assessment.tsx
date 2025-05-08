import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Assessment, Question } from "@shared/schema";
import { useState, useRef, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { VideoRecorder } from "@/components/VideoRecorder";
import { VideoStorageService } from "@/services/videoStorage";
import { navigate } from "wouter/use-browser-location";
import { queryClient } from "@/lib/queryClient";
import { useToastExtended } from "@/hooks/use-toast-extended";

// Create a custom interface that extends VideoRecorderRef
interface ExtendedVideoRecorderRef {
  stopRecording: () => Promise<void>;
  cleanup: () => void;
  getCurrentBlob: () => Blob | null;
  getCurrentTranscript?: () => string; // Optional method
}

export default function TakeAssessment() {
  const { id } = useParams();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isVideoCompatible, setIsVideoCompatible] = useState(true);
  const [compatibilityIssues, setCompatibilityIssues] = useState<string[]>([]);
  const [webcamBlob, setWebcamBlob] = useState<Blob | null>(null);
  const [screenBlob, setScreenBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const webcamRecorderRef = useRef<ExtendedVideoRecorderRef>(null);
  const screenRecorderRef = useRef<ExtendedVideoRecorderRef>(null);
  const { warning } = useToastExtended();

  const { data: assessment, isLoading } = useQuery<Assessment>({
    queryKey: [`/api/assessments/${id}`],
  });

  useEffect(() => {
    try {
      console.log('🔍 Checking video compatibility...');
      const { compatible, issues } = VideoStorageService.checkBrowserCompatibility();
      console.log('✅ Compatibility check result:', { compatible, issues });
      setIsVideoCompatible(compatible);
      setCompatibilityIssues(issues);
      
      if (!compatible) {
        warning({
          title: "Video Recording Issues",
          description: "Your browser may not fully support video recording. " + issues.join(". ")
        });
      }
    } catch (error) {
      console.error('❌ Error checking compatibility:', error);
      setIsVideoCompatible(false);
      setCompatibilityIssues(['Failed to check browser compatibility']);
    }
  }, []);

  const handleRecordingComplete = async (blob: Blob, recordingType: 'webcam' | 'screen'): Promise<void> => {
    try {
      console.log(`Processing ${recordingType} recording:`, {
        size: blob.size,
        type: blob.type
      });
  
      const isValid = await VideoStorageService.validateVideo(blob);
      if (!isValid) {
        throw new Error(`Invalid ${recordingType} recording`);
      }
  
      if (recordingType === 'webcam') {
        setWebcamBlob(blob);
        console.log('Webcam recording saved in state');
      } else {
        setScreenBlob(blob);
        console.log('Screen recording saved in state');
      }
  
      toast({
        title: "Recording Saved",
        description: `${recordingType} recording completed successfully`
      });
    } catch (error: any) {
      console.error(`${recordingType} recording error:`, error);
      toast({
        title: "Recording Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleRecordingError = (error: Error) => {
    console.error('Recording error:', error);
    toast({
      title: "Recording Error",
      description: error.message,
      variant: "destructive"
    });
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      try {
        setIsUploading(true);
        const videoUrls: Record<string, string> = {};
  
        if (webcamBlob) {
          console.log('Uploading webcam recording...', {
            size: webcamBlob.size,
            type: webcamBlob.type
          });
  
          videoUrls.webcamRecordingUrl = await VideoStorageService.uploadVideo(
            webcamBlob,
            'webcamVideo',
            id || ''
          );
          console.log('Webcam upload successful:', videoUrls.webcamRecordingUrl);
        }
  
        if (screenBlob) {
          console.log('Uploading screen recording...', {
            size: screenBlob.size,
            type: screenBlob.type
          });
  
          videoUrls.screenRecordingUrl = await VideoStorageService.uploadVideo(
            screenBlob,
            'screenVideo',
            id || ''
          );
          console.log('Screen recording upload successful:', videoUrls.screenRecordingUrl);
        }
  
        const payload = {
          answers,
          ...videoUrls,
          transcript: transcript || "" // Always include transcript, even if empty
        };
  
        console.log('Submitting assessment with transcript:', transcript);
        console.log('Complete payload:', payload);
  
        const response = await apiRequest("POST", `/api/assessments/${id}/submit`, payload);
  
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Submission failed: ${response.status} ${response.statusText} - ${errorText}`);
        }
  
        const result = await response.json();
        console.log('Submission successful:', result);
        return result;
      } catch (error) {
        console.error('Submission process failed:', error);
        throw error;
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Assessment submitted successfully",
      });
      navigate("/");
      queryClient.invalidateQueries({ queryKey: ['/api/assessments'] });
    },
    onError: (error: Error) => {
      console.error("Submit error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit assessment",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      webcamRecorderRef.current?.cleanup();
      screenRecorderRef.current?.cleanup();
    };
  }, []);

  if (isLoading) {
    return <AssessmentSkeleton />;
  }

  if (!assessment) {
    return <div>Assessment not found</div>;
  }

  const questions = assessment.questions as Question[];
  const question = questions[currentQuestion];

  const handleAnswer = (value: string) => {
    setAnswers(prev => ({
      ...prev,
      [question.id]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      // First check if all questions are answered
      if (Object.keys(answers).length < questions.length) {
        toast({
          title: "Warning",
          description: "Please answer all questions before submitting",
          variant: "destructive",
        });
        return;
      }
  
      // Stop any ongoing recordings first
      if (webcamRecorderRef.current) {
        console.log('Stopping webcam recording before submission...');
        await webcamRecorderRef.current.stopRecording();
      }
      if (screenRecorderRef.current) {
        console.log('Stopping screen recording before submission...');
        await screenRecorderRef.current.stopRecording();
      }
  
      // Wait a moment for recordings to finish processing
      await new Promise(resolve => setTimeout(resolve, 1000));
  
      // Check if we have recordings that haven't been saved
      if (!webcamBlob && webcamRecorderRef.current?.getCurrentBlob()) {
        const blob = webcamRecorderRef.current.getCurrentBlob();
        
        // Try to get the transcript if the method exists
        let currentTranscript = '';
        try {
          // @ts-ignore - Ignore property not existing error
          if (typeof webcamRecorderRef.current.getCurrentTranscript === 'function') {
            // @ts-ignore - Ignore property not existing error
            currentTranscript = webcamRecorderRef.current.getCurrentTranscript();
          }
        } catch (e) {
          console.warn('Could not get transcript:', e);
        }
        
        if (blob) {
          await handleRecordingComplete(blob, 'webcam');
          // Set transcript separately
          if (currentTranscript) {
            // @ts-ignore - Ignore string type error
            setTranscript(currentTranscript);
          }
        }
      }
      if (!screenBlob && screenRecorderRef.current?.getCurrentBlob()) {
        const blob = screenRecorderRef.current.getCurrentBlob();
        if (blob) {
          await handleRecordingComplete(blob, 'screen');
        }
      }
  
      // Now proceed with submission
      await submitMutation.mutateAsync();
    } catch (error) {
      console.error('Submit process failed:', error);
      toast({
        title: "Error",
        description: "Failed to process recordings. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      {compatibilityIssues.length > 0 && (
        <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
          <h2 className="font-medium text-yellow-800">Compatibility Warning</h2>
          <ul className="list-disc pl-5 mt-2 text-sm text-yellow-700">
            {compatibilityIssues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Webcam Recording</CardTitle>
          </CardHeader>
          <CardContent>
            <VideoRecorder
              ref={webcamRecorderRef}
              type="webcam"
              // @ts-ignore - Ignore type mismatch for transcript handling
              onRecordingComplete={(blob, transcriptText) => {
                // Add explicit logs for debugging
                console.log(`VIDEO RECORDER COMPLETE CALLBACK FIRED`);
                console.log(`Blob received:`, { size: blob.size, type: blob.type });
                console.log(`Transcript received:`, { 
                  text: transcriptText,
                  length: transcriptText?.length || 0,
                  sample: transcriptText?.substring(0, 50) 
                });
                
                // Save the blob
                handleRecordingComplete(blob, 'webcam');
                
                // Save transcript separately with explicit handling
                if (transcriptText) {
                  console.log('Setting transcript state with value:', transcriptText);
                  setTranscript(transcriptText);
                } else {
                  console.warn('No transcript received from recorder');
                }
              }}
              onError={handleRecordingError}
              maxDuration={3600}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Screen Recording</CardTitle>
          </CardHeader>
          <CardContent>
            <VideoRecorder
              ref={screenRecorderRef}
              type="screen"
              // @ts-ignore - Ignore type mismatch
              onRecordingComplete={(blob) => handleRecordingComplete(blob, 'screen')}
              onError={handleRecordingError}
              maxDuration={3600}
            />
          </CardContent>
        </Card>
      </div>

      {/* Transcript Card */}
      {transcript ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Speech Transcript</span>
              <Badge variant="outline">{transcript.length} characters</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-3 rounded-md border border-gray-200 max-h-60 overflow-y-auto">
              <p className="whitespace-pre-wrap">{transcript}</p>
            </div>
            
            <div className="mt-4">
              <details>
                <summary className="cursor-pointer text-sm font-medium text-gray-500 hover:text-gray-700">
                  Edit Transcript Manually
                </summary>
                <div className="mt-2">
                  <Textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    className="min-h-[150px]"
                    placeholder="Edit transcript here"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    You can edit the transcript above if the speech recognition didn't work correctly.
                  </p>
                </div>
              </details>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Speech Transcript</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
              <p className="text-gray-500">No transcript available. Try recording with your webcam.</p>
            </div>
            
            <div className="mt-4">
              <details>
                <summary className="cursor-pointer text-sm font-medium text-gray-500 hover:text-gray-700">
                  Enter Transcript Manually
                </summary>
                <div className="mt-2">
                  <Textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    className="min-h-[150px]"
                    placeholder="Enter your transcript here manually"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    If speech recognition isn't working, you can manually type your transcript here.
                  </p>
                </div>
              </details>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h1 className="text-3xl font-bold">{assessment.title}</h1>
        <p className="text-muted-foreground mt-2">{assessment.description}</p>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Question {currentQuestion + 1} of {questions.length}
        </p>
        <Badge>{question.type}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{question.content}</CardTitle>
        </CardHeader>
        <CardContent>
          {question.type === 'multiple_choice' && question.options && (
            <RadioGroup
              value={answers[question.id] || ''}
              onValueChange={handleAnswer}
            >
              <div className="space-y-3">
                {question.options.map((option, i) => (
                  <div key={i} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`option-${i}`} />
                    <Label htmlFor={`option-${i}`}>{option}</Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          )}

          {question.type === 'open_ended' && (
            <Textarea
              placeholder="Type your answer here..."
              value={answers[question.id] || ''}
              onChange={(e) => handleAnswer(e.target.value)}
              className="min-h-[200px]"
            />
          )}

          {question.type === 'coding' && (
            <div className="space-y-4">
              <Textarea
                placeholder="Write your code here..."
                value={answers[question.id] || question.codeTemplate || ''}
                onChange={(e) => handleAnswer(e.target.value)}
                className="min-h-[200px] font-mono"
              />
              {question.testCases && (
                <div className="space-y-2">
                  <h4 className="font-medium">Test Cases:</h4>
                  {question.testCases.map((test, i) => (
                    <div key={i} className="text-sm">
                      <span className="font-mono">Input: {test.input}</span>
                      <br />
                      <span className="font-mono">Expected: {test.expectedOutput}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentQuestion === 0}
        >
          Previous
        </Button>

        {currentQuestion === questions.length - 1 ? (
          <Button 
            onClick={handleSubmit}
            disabled={submitMutation.isPending || isUploading}
          >
            {(submitMutation.isPending || isUploading) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isUploading ? 'Uploading Videos...' : 'Submitting...'}
              </>
            ) : (
              "Submit Assessment"
            )}
          </Button>
        ) : (
          <Button onClick={handleNext}>Next Question</Button>
        )}
      </div>
    </div>
  );
}

function AssessmentSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-96 mt-2" />
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}