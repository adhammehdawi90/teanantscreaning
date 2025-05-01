import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Share2, Edit, PlusCircle, Play, ChevronRight, BarChart2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Assessment, Question, AssessmentSubmission, QuestionEvaluation } from "@shared/schema";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import React, { useRef } from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VideoAnalysisCharts } from "@/components/video-analysis-charts";

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

// Define the video analysis result type with the new structure
interface VideoAnalysisResult {
  summary: string;
  overall_score: number;
  participation_level?: {
    speaking_time_percentage: string;
    silence_periods: string;
    score: number;
  };
  language_proficiency: {
    clarity: { assessment: string; score: number } | string;
    vocabulary: { assessment: string; score: number } | string;
    grammar: { assessment: string; score: number } | string;
    fluency: { assessment: string; score: number } | string;
    effectiveness: { assessment: string; score: number } | string;
    notes?: string;
  };
  behavioral_analysis: {
    non_verbal: { assessment: string; score: number } | string;
    active_listening: { assessment: string; score: number } | string;
    engagement: { assessment: string; score: number } | string;
    notes?: string;
  };
  attitude_assessment: {
    professionalism: { assessment: string; score: number } | string;
    enthusiasm: { assessment: string; score: number } | string;
    positivity: { assessment: string; score: number } | string;
    critical_thinking: { assessment: string; score: number } | string;
    notes?: string;
  };
  critical_flags?: string[];
  final_recommendation?: string;
}

// Helper function to safely extract text from analysis fields
function getAssessmentText(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object' && value !== null) {
    if ('assessment' in value) {
      return typeof value.assessment === 'string' ? value.assessment : '';
    }
    return JSON.stringify(value);
  }
  return typeof value === 'string' ? value : String(value);
}

// Component to display video analysis results
function VideoAnalysisDisplay({ analysis }: { analysis: VideoAnalysisResult }) {
  return (
    <div className="space-y-6">
      {/* Summary Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold mb-2">Analysis Summary</h3>
        <p className="text-gray-700">{typeof analysis.summary === 'string' ? analysis.summary : ''}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="font-semibold">Overall Score:</span>
          <Badge className="text-md px-2">{typeof analysis.overall_score === 'number' ? analysis.overall_score : 0}/10</Badge>
        </div>
      </div>

      {/* Charts Section */}
      <VideoAnalysisCharts analysis={analysis} />

      {/* Detailed Analysis Sections */}
      <Tabs defaultValue="language">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="language">Language Proficiency</TabsTrigger>
          <TabsTrigger value="behavior">Behavioral Analysis</TabsTrigger>
          <TabsTrigger value="attitude">Attitude Assessment</TabsTrigger>
        </TabsList>
        
        <TabsContent value="language" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="border p-3 rounded-md">
              <h4 className="font-medium">Clarity</h4>
              <p className="text-sm text-gray-600">{getAssessmentText(analysis.language_proficiency.clarity)}</p>
            </div>
            <div className="border p-3 rounded-md">
              <h4 className="font-medium">Vocabulary</h4>
              <p className="text-sm text-gray-600">{getAssessmentText(analysis.language_proficiency.vocabulary)}</p>
            </div>
            <div className="border p-3 rounded-md">
              <h4 className="font-medium">Grammar</h4>
              <p className="text-sm text-gray-600">{getAssessmentText(analysis.language_proficiency.grammar)}</p>
            </div>
            <div className="border p-3 rounded-md">
              <h4 className="font-medium">Fluency</h4>
              <p className="text-sm text-gray-600">{getAssessmentText(analysis.language_proficiency.fluency)}</p>
            </div>
            <div className="border p-3 rounded-md col-span-2">
              <h4 className="font-medium">Effectiveness</h4>
              <p className="text-sm text-gray-600">{getAssessmentText(analysis.language_proficiency.effectiveness)}</p>
            </div>
          </div>
          {analysis.language_proficiency.notes && (
            <div className="mt-4">
              <h4 className="font-medium">Additional Notes</h4>
              <p className="text-sm text-gray-600">{typeof analysis.language_proficiency.notes === 'string' ? analysis.language_proficiency.notes : ''}</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="behavior" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="border p-3 rounded-md">
              <h4 className="font-medium">Non-verbal Communication</h4>
              <p className="text-sm text-gray-600">{getAssessmentText(analysis.behavioral_analysis.non_verbal)}</p>
            </div>
            <div className="border p-3 rounded-md">
              <h4 className="font-medium">Active Listening</h4>
              <p className="text-sm text-gray-600">{getAssessmentText(analysis.behavioral_analysis.active_listening)}</p>
            </div>
            <div className="border p-3 rounded-md col-span-2">
              <h4 className="font-medium">Engagement</h4>
              <p className="text-sm text-gray-600">{getAssessmentText(analysis.behavioral_analysis.engagement)}</p>
            </div>
          </div>
          {analysis.behavioral_analysis.notes && (
            <div className="mt-4">
              <h4 className="font-medium">Additional Notes</h4>
              <p className="text-sm text-gray-600">{typeof analysis.behavioral_analysis.notes === 'string' ? analysis.behavioral_analysis.notes : ''}</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="attitude" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="border p-3 rounded-md">
              <h4 className="font-medium">Professionalism</h4>
              <p className="text-sm text-gray-600">{getAssessmentText(analysis.attitude_assessment.professionalism)}</p>
            </div>
            <div className="border p-3 rounded-md">
              <h4 className="font-medium">Enthusiasm</h4>
              <p className="text-sm text-gray-600">{getAssessmentText(analysis.attitude_assessment.enthusiasm)}</p>
            </div>
            <div className="border p-3 rounded-md">
              <h4 className="font-medium">Positivity</h4>
              <p className="text-sm text-gray-600">{getAssessmentText(analysis.attitude_assessment.positivity)}</p>
            </div>
            <div className="border p-3 rounded-md">
              <h4 className="font-medium">Critical Thinking</h4>
              <p className="text-sm text-gray-600">{getAssessmentText(analysis.attitude_assessment.critical_thinking)}</p>
            </div>
          </div>
          {analysis.attitude_assessment.notes && (
            <div className="mt-4">
              <h4 className="font-medium">Additional Notes</h4>
              <p className="text-sm text-gray-600">{typeof analysis.attitude_assessment.notes === 'string' ? analysis.attitude_assessment.notes : ''}</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Define the TestResult interface
interface TestResult {
  passed: boolean;
  input: string;
  expectedOutput: string;
  actualOutput: string;
}

// MongoDB compatible submission interface
interface MongoDbSubmission {
  _id: string;
  assessmentId: string;
  candidateId?: string;
  candidateName: string;
  submittedAt: string;
  answers: Record<string, string>;
  evaluations: QuestionEvaluation[];
  totalScore: number;
  screenRecordingUrl: string | null;
  webcamRecordingUrl: string | null;
}

export default function AssessmentView() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<MongoDbSubmission | null>(null);
  const [videoAnalysis, setVideoAnalysis] = useState<VideoAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Redirect if ID is invalid
  useEffect(() => {
    if (!id || id === "undefined") {
      console.warn("Invalid assessment ID, redirecting to dashboard");
      toast({
        title: "Error",
        description: "Invalid assessment ID. Please select a valid assessment.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }
  }, [id, navigate, toast]);

  // Don't fetch if ID is invalid
  const validId = id && id !== "undefined" ? id : null;

  // Fetch assessment
  const { data: assessment, isLoading } = useQuery<Assessment>({
    queryKey: [`/api/assessments/${validId}`],
    enabled: !!validId, // Only run query if we have a valid ID
  });

  // Fetch submissions for this assessment
  const { data: submissions, isLoading: isLoadingSubmissions } = useQuery<MongoDbSubmission[]>({
    queryKey: [`/api/assessments/${validId}/submissions`],
    enabled: !!validId, // Only run query if we have a valid ID
  });

  const updateAssessment = useMutation({
    mutationFn: async (updates: Partial<Assessment>) => {
      const res = await apiRequest("PATCH", `/api/assessments/${validId}`, updates);
      if (!res.ok) {
        throw new Error("Failed to update assessment");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/assessments/${validId}`] });
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
    const shareUrl = `${window.location.origin}/take-assessment/${validId}`;
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

  // Video analysis mutation
  const analyzeVideo = useMutation({
    mutationFn: async (submissionId: string) => {
      setIsAnalyzing(true);
      try {
        const res = await apiRequest("POST", `/api/submissions/${submissionId}/analyze`);
        if (!res.ok) {
          throw new Error("Failed to analyze video");
        }
        return res.json();
      } finally {
        setIsAnalyzing(false);
      }
    },
    onSuccess: (data) => {
      setVideoAnalysis(data);
      toast({
        title: "Analysis Complete",
        description: "Video analysis has been completed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze the interview video",
        variant: "destructive",
      });
    },
  });

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
                queryClient.setQueryData([`/api/assessments/${validId}`], newAssessment);
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
                queryClient.setQueryData([`/api/assessments/${validId}`], newAssessment);
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
          <Button onClick={() => navigate(`/take-assessment/${validId}`)}>
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
                <Button variant="outline" onClick={() => {
                  setSelectedSubmission(null);
                  setVideoAnalysis(null);
                }}>
                  Back to List
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Video Recordings Section with analysis button */}
              {(selectedSubmission.webcamRecordingUrl || selectedSubmission.screenRecordingUrl) && (
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Recordings</h3>
                    {selectedSubmission.webcamRecordingUrl && !isAnalyzing && (
                      <Button 
                        onClick={() => analyzeVideo.mutate(selectedSubmission._id)} 
                        variant="outline"
                        disabled={isAnalyzing || !!videoAnalysis}
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Analyzing...
                          </>
                        ) : videoAnalysis ? (
                          "Analysis Complete"
                        ) : (
                          <>
                            <BarChart2 className="h-4 w-4 mr-2" />
                            Analyze Interview
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
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
                </div>
              )}

              {/* Video Analysis Results Section */}
              {videoAnalysis && (
                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle>Interview Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <VideoAnalysisDisplay analysis={videoAnalysis} />
                  </CardContent>
                </Card>
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
                          {(typeof evaluation.testResults === 'string' 
                            ? JSON.parse(evaluation.testResults) as TestResult[]
                            : evaluation.testResults as TestResult[] || []
                          ).map((test: TestResult, i: number) => (
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
                    {submissions.map((submission: MongoDbSubmission) => (
                      <Card key={submission._id} className="cursor-pointer hover:bg-accent/50 transition-colors"
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