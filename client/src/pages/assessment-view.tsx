import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Share2, Edit, PlusCircle, Play, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Assessment, Question, AssessmentSubmission } from "@shared/schema";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import React, { useEffect, useRef   } from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface VideoPlayerProps {
  url: string;
  title: string;
}

export function VideoPlayer({ url, title }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [debug, setDebug] = useState<{exists: boolean; size?: number; error?: string}>();

  useEffect(() => {
    const checkVideo = async () => {
      try {
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
          setDebug({
            exists: true,
            size: Number(response.headers.get('content-length')),
          });
        } else {
          setDebug({
            exists: false,
            error: `HTTP ${response.status}: ${response.statusText}`
          });
        }
      } catch (error:any) {
        setDebug({
          exists: false,
          error: error.message
        });
      }
    };

    checkVideo();
  }, [url]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleError = (e: Event) => {
      console.error(`Video error for ${title}:`, e);
      setError(`Failed to load ${title.toLowerCase()}. Please check if the file exists.`);
      setIsLoading(false);
    };

    const handleLoadedData = () => {
      console.log(`${title} video loaded successfully`);
      setIsLoading(false);
      setError(null);
    };

    video.addEventListener('error', handleError);
    video.addEventListener('loadeddata', handleLoadedData);

    return () => {
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadeddata', handleLoadedData);
    };
  }, [title]);

  // Process URL to ensure it starts with /uploads/
  const processedUrl = url.includes('/uploads/') 
    ? url 
    : `/uploads/${url.split('/').pop()}`;

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p>{error}</p>
              <p className="text-sm opacity-70">Original URL: {url}</p>
              <p className="text-sm opacity-70">Processed URL: {processedUrl}</p>
              {debug && (
                <div className="text-sm opacity-70">
                  <p>File exists: {debug.exists ? 'Yes' : 'No'}</p>
                  {debug.size && <p>File size: {(debug.size / 1024 / 1024).toFixed(2)} MB</p>}
                  {debug.error && <p>Error: {debug.error}</p>}
                </div>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-medium">{title}</h3>
      {isLoading && (
        <div className="w-full aspect-video bg-muted animate-pulse rounded-lg" />
      )}
      <video
        ref={videoRef}
        className={`w-full aspect-video rounded-lg ${isLoading ? 'hidden' : ''}`}
        controls
        playsInline
        preload="metadata"
      >
        <source src={processedUrl} type="video/webm" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}

export default function AssessmentView() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<AssessmentSubmission | null>(null);

  // Fetch assessment
  const { data: assessment, isLoading } = useQuery<Assessment>({
    queryKey: [`/api/assessments/${id}`],
  });

  // Fetch submissions for this assessment
  const { data: submissions, isLoading: isLoadingSubmissions } = useQuery<AssessmentSubmission[]>({
    queryKey: [`/api/assessments/${id}/submissions`],
    enabled: !!id,
  });

  const updateAssessment = useMutation({
    mutationFn: async (updates: Partial<Assessment>) => {
      const res = await apiRequest("PATCH", `/api/assessments/${id}`, updates);
      if (!res.ok) {
        throw new Error("Failed to update assessment");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/assessments/${id}`] });
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Assessment updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update assessment",
        variant: "destructive",
      });
    },
  });

  const generateMoreQuestions = useMutation({
    mutationFn: async () => {
      if (!assessment) return;

      const res = await apiRequest("POST", "/api/generate-questions", {
        role: assessment.title,
        skills: (assessment.questions as Question[])[0]?.skills || [],
        difficulty: (assessment.questions as Question[])[0]?.difficulty || "intermediate",
        type: assessment.type
      });

      if (!res.ok) {
        throw new Error("Failed to generate questions");
      }

      const newQuestions = await res.json();
      await updateAssessment.mutateAsync({
        questions: [...(assessment.questions as Question[]), ...newQuestions]
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "New questions have been added to the assessment.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate more questions",
        variant: "destructive",
      });
    },
  });

  const copyShareLink = () => {
    const shareUrl = `${window.location.origin}/take-assessment/${id}`;
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Link Copied",
      description: "Assessment link has been copied to clipboard",
    });
  };

  const handleSave = () => {
    if (!assessment) return;
    updateAssessment.mutate(assessment);
  };

  if (isLoading) {
    return <AssessmentSkeleton />;
  }

  if (!assessment) {
    return <div>Assessment not found</div>;
  }

  const questions = assessment.questions as Question[];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          {isEditing ? (
            <Input
              value={assessment.title}
              onChange={(e) => {
                const newAssessment = { ...assessment, title: e.target.value };
                queryClient.setQueryData([`/api/assessments/${id}`], newAssessment);
              }}
              className="text-3xl font-bold"
            />
          ) : (
            <h1 className="text-3xl font-bold">{assessment.title}</h1>
          )}
          {isEditing ? (
            <Textarea
              value={assessment.description}
              onChange={(e) => {
                const newAssessment = { ...assessment, description: e.target.value };
                queryClient.setQueryData([`/api/assessments/${id}`], newAssessment);
              }}
              className="mt-2"
            />
          ) : (
            <p className="text-muted-foreground mt-2">{assessment.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyShareLink}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button
            variant={isEditing ? "default" : "outline"}
            onClick={() => {
              if (isEditing) {
                handleSave();
              } else {
                setIsEditing(true);
              }
            }}
          >
            <Edit className="h-4 w-4 mr-2" />
            {isEditing ? "Save Changes" : "Edit"}
          </Button>
          <Button onClick={() => navigate(`/take-assessment/${id}`)}>
            <Play className="h-4 w-4 mr-2" />
            Take Assessment
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Show submission details only when a submission is selected */}
        {selectedSubmission ? (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Submission Details</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    By {selectedSubmission.candidateName} on {new Date(selectedSubmission.submittedAt).toLocaleString()}
                  </p>
                </div>
                <Button variant="outline" onClick={() => setSelectedSubmission(null)}>
                  Back to List
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Video Recordings Section with improved error handling */}
              {(selectedSubmission.webcamRecordingUrl || selectedSubmission.screenRecordingUrl) && (
                <div className="mb-8 grid grid-cols-2 gap-4">
                  {selectedSubmission.webcamRecordingUrl && (
                    <VideoPlayer 
                      url={selectedSubmission.webcamRecordingUrl} 
                      title="Webcam Recording" 
                    />
                  )}
                  {selectedSubmission.screenRecordingUrl && (
                    <VideoPlayer 
                      url={selectedSubmission.screenRecordingUrl} 
                      title="Screen Recording" 
                    />
                  )}
                </div>
              )}

              {/* Answers and Evaluations */}
              <div className="space-y-6">
                {selectedSubmission.evaluations.map((evaluation) => {
                  const question = questions.find(q => q.id === evaluation.questionId);
                  const answer = selectedSubmission.answers[evaluation.questionId];

                  return (
                    <div key={evaluation.questionId} className="border-t pt-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="font-medium">{question?.content}</p>
                          <p className="text-muted-foreground">{answer}</p>
                        </div>
                        <Badge variant={evaluation.isCorrect ? "default" : "destructive"}>
                          {evaluation.score}%
                        </Badge>
                      </div>

                      <div className="mt-2 text-sm">
                        <p className="font-medium">Feedback:</p>
                        <p className="text-muted-foreground">{evaluation.feedback}</p>
                      </div>

                      {evaluation.testResults && (
                        <div className="mt-2 space-y-2">
                          <p className="text-sm font-medium">Test Results:</p>
                          {evaluation.testResults.map((test, i) => (
                            <div key={i} className="text-sm bg-muted p-2 rounded">
                              <div className="flex items-center gap-2">
                                <Badge variant={test.passed ? "default" : "destructive"}>
                                  {test.passed ? "Passed" : "Failed"}
                                </Badge>
                              </div>
                              <div className="mt-1 font-mono text-xs">
                                <div>Input: {test.input}</div>
                                <div>Expected: {test.expectedOutput}</div>
                                <div>Actual: {test.actualOutput}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Assessment Details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4">
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Type</dt>
                    <dd className="text-sm mt-1">{assessment.type}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Questions</dt>
                    <dd className="text-sm mt-1">{questions.length} questions</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {/* Submissions List */}
            <Card>
              <CardHeader>
                <CardTitle>Submissions</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingSubmissions ? (
                  <Skeleton className="h-32 w-full" />
                ) : submissions && submissions.length > 0 ? (
                  <div className="space-y-2">
                    {submissions.map((submission: AssessmentSubmission) => (
                      <Card key={submission.id} className="cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => setSelectedSubmission(submission)}>
                        <CardContent className="p-4 flex justify-between items-center">
                          <div>
                            <p className="font-medium">{submission.candidateName}</p>
                            <p className="text-sm text-muted-foreground">
                              Submitted on {new Date(submission.submittedAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge>{submission.totalScore}%</Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No submissions yet</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function AssessmentSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-96 mt-2" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}