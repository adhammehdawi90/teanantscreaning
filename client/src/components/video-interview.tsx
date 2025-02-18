import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { VideoRecorder, VideoRecorderRef } from '@/components/VideoRecorder';
import { useToast } from '@/hooks/use-toast';
import { VideoStorageService } from '@/services/videoStorage';
import { AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react';

interface VideoInterviewProps {
  questions: {
    id: string;
    content: string;
    maxDuration?: number;
  }[];
  onComplete: (recordings: { questionId: string; videoUrl: string }[]) => void;
}

export function VideoInterview({ questions, onComplete }: VideoInterviewProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<{ questionId: string; videoUrl: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const recorderRef = useRef<VideoRecorderRef>(null);
  const { toast } = useToast();

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const hasRecordedCurrent = recordings.some(r => r.questionId === currentQuestion.id);

  const handleRecordingComplete = async (blob: Blob) => {
    try {
      setIsUploading(true);
      setError(null);

      const isValid = await VideoStorageService.validateVideo(blob);
      if (!isValid) {
        throw new Error('Invalid recording');
      }

      // Upload the video
      const videoUrl = await VideoStorageService.uploadVideo(
        blob,
        `interview-q${currentQuestionIndex + 1}`,
        currentQuestion.id
      );

      // Save the recording
      setRecordings(prev => [
        ...prev.filter(r => r.questionId !== currentQuestion.id),
        { questionId: currentQuestion.id, videoUrl }
      ]);

      toast({
        title: "Recording Saved",
        description: "Your response has been recorded successfully."
      });

      setIsRecording(false);
    } catch (error) {
      console.error('Recording error:', error);
      setError(error.message);
      toast({
        title: "Recording Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else if (recordings.length === questions.length) {
      onComplete(recordings);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Question {currentQuestionIndex + 1} of {questions.length}
        </div>
        <div className="text-sm font-medium">
          {recordings.length} of {questions.length} responses recorded
        </div>
      </div>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            Question {currentQuestionIndex + 1}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg mb-4">{currentQuestion.content}</p>
          {hasRecordedCurrent && (
            <Alert className="mb-4">
              <AlertDescription>
                You have already recorded a response for this question.
                Recording again will replace your previous response.
              </AlertDescription>
            </Alert>
          )}
          
          <VideoRecorder
            ref={recorderRef}
            type="webcam"
            onRecordingComplete={handleRecordingComplete}
            onError={setError}
            maxDuration={currentQuestion.maxDuration || 300} // 5 minutes default
          />

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePreviousQuestion}
          disabled={currentQuestionIndex === 0}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous Question
        </Button>

        {!isLastQuestion ? (
          <Button
            onClick={handleNextQuestion}
            disabled={!hasRecordedCurrent || isRecording || isUploading}
          >
            Next Question
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={() => onComplete(recordings)}
            disabled={recordings.length !== questions.length || isRecording || isUploading}
          >
            Complete Interview
          </Button>
        )}
      </div>
    </div>
  );
}