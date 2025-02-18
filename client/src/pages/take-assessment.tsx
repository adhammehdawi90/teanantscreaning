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
import { VideoRecorderRef } from '@/components/VideoRecorder';
import { VideoStorageService } from "@/services/videoStorage";
import { navigate } from "wouter/use-browser-location";
import { queryClient } from "@/lib/queryClient";

export default function TakeAssessment() {
  const { id } = useParams();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isVideoCompatible, setIsVideoCompatible] = useState(true);
  const [compatibilityIssues, setCompatibilityIssues] = useState<string[]>([]);
  const [webcamBlob, setWebcamBlob] = useState<Blob | null>(null);
  const [screenBlob, setScreenBlob] = useState<Blob | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const webcamRecorderRef = useRef<VideoRecorderRef>(null);
  const screenRecorderRef = useRef<VideoRecorderRef>(null);

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
        toast({
          title: "Video Recording Issues",
          description: "Your browser may not fully support video recording. " + issues.join(". "),
          variant: "warning"
        });
      }
    } catch (error) {
      console.error('❌ Error checking compatibility:', error);
      setIsVideoCompatible(false);
      setCompatibilityIssues(['Failed to check browser compatibility']);
    }
  }, []);

  const handleRecordingComplete = async (blob: Blob, type: 'webcam' | 'screen') => {
    try {
      console.log(`Processing ${type} recording:`, {
        size: blob.size,
        type: blob.type
      });
  
      const isValid = await VideoStorageService.validateVideo(blob);
      if (!isValid) {
        throw new Error(`Invalid ${type} recording`);
      }
  
      if (type === 'webcam') {
        setWebcamBlob(blob);
        console.log('Webcam recording saved in state');
      } else {
        setScreenBlob(blob);
        console.log('Screen recording saved in state');
      }
  
      toast({
        title: "Recording Saved",
        description: `${type} recording completed successfully`
      });
    } catch (error: any) {
      console.error(`${type} recording error:`, error);
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
            id
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
            id
          );
          console.log('Screen recording upload successful:', videoUrls.screenRecordingUrl);
        }
  
        const payload = {
          answers,
          ...videoUrls
        };
  
        console.log('Submitting assessment with complete payload:', payload);
  
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
        if (blob) {
          await handleRecordingComplete(blob, 'webcam');
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
    <div className="max-w-4xl mx-auto space-y-8 pb-8">
      {!isVideoCompatible && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Video recording may not work properly in your browser.
                {compatibilityIssues.map((issue, index) => (
                  <span key={index} className="block">{issue}</span>
                ))}
              </p>
            </div>
          </div>
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
              onRecordingComplete={(blob) => handleRecordingComplete(blob, 'webcam')}
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
              onRecordingComplete={(blob) => handleRecordingComplete(blob, 'screen')}
              onError={handleRecordingError}
              maxDuration={3600}
            />
          </CardContent>
        </Card>
      </div>

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