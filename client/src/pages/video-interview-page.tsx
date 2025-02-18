import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { VideoInterview } from '@/components/VideoInterview';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useParams, useLocation } from 'wouter';

interface Question {
  id: string;
  content: string;
  maxDuration?: number;
}

interface InterviewSetup {
  title: string;
  description: string;
  questions: Question[];
}

export default function VideoInterviewPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(true);
  const [interview, setInterview] = useState<InterviewSetup>({
    title: '',
    description: '',
    questions: []
  });

  const addQuestion = () => {
    setInterview(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          id: Math.random().toString(36).substring(7),
          content: '',
          maxDuration: 300 // 5 minutes default
        }
      ]
    }));
  };

  const removeQuestion = (index: number) => {
    setInterview(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const updateQuestion = (index: number, content: string) => {
    setInterview(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === index ? { ...q, content } : q
      )
    }));
  };

  const handleStartInterview = () => {
    if (!interview.title || !interview.description || interview.questions.length === 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields and add at least one question.",
        variant: "destructive"
      });
      return;
    }
    setIsEditing(false);
  };

  const handleComplete = async (recordings: { questionId: string; videoUrl: string }[]) => {
    try {
      // Here you would typically save the interview responses to your backend
      console.log('Interview completed:', recordings);
      
      toast({
        title: "Success",
        description: "Interview completed successfully!"
      });
      
      // Redirect to dashboard or completion page
      setLocation('/');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save interview responses.",
        variant: "destructive"
      });
    }
  };

  if (!isEditing) {
    return (
      <VideoInterview
        questions={interview.questions}
        onComplete={handleComplete}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Setup Video Interview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Interview Title</label>
            <Input
              value={interview.title}
              onChange={e => setInterview(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter interview title"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={interview.description}
              onChange={e => setInterview(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter interview description"
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Questions</h3>
              <Button onClick={addQuestion} variant="outline" size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Question
              </Button>
            </div>

            {interview.questions.map((question, index) => (
              <Card key={question.id}>
                <CardContent className="pt-4 flex gap-4">
                  <div className="flex-1">
                    <Textarea
                      value={question.content}
                      onChange={e => updateQuestion(index, e.target.value)}
                      placeholder={`Enter question ${index + 1}`}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeQuestion(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button
            className="w-full"
            onClick={handleStartInterview}
            disabled={interview.questions.length === 0}
          >
            Start Interview
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}