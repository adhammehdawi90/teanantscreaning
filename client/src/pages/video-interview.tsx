import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoRecorder } from "@/components/VideoRecorder";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Define the VideoInterview type locally
interface VideoInterview {
  id: number;
  title: string;
  description: string;
  questions: {
    id: string;
    content: string;
  }[];
  candidateId: number;
  assessmentId: number;
  videoUrl?: string;
}

export default function VideoInterview() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: interview, isLoading } = useQuery<VideoInterview>({
    queryKey: [`/api/video-interviews/${id}`],
    enabled: id !== "new",
  });

  // First create a new interview if we're on the "new" route
  const createInterview = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/video-interviews", {
        title: "Video Interview",
        description: "Candidate video interview",
        questions: [],
        candidateId: 1, // TODO: Replace with actual candidate ID
        assessmentId: 1, // TODO: Replace with actual assessment ID
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/video-interviews"] });
      // After creating, update the URL to use the new ID
      navigate(`/video-interview/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create interview",
        variant: "destructive",
      });
    },
  });

  const uploadVideo = useMutation({
    mutationFn: async (videoBlob: Blob) => {
      if (!interview?.id) {
        throw new Error('No interview ID available');
      }

      const formData = new FormData();
      formData.append('video', videoBlob);

      const uploadRes = await fetch(`/api/video-interviews/${interview.id}/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload video');
      }

      return uploadRes.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/video-interviews/${interview?.id}`] });
      toast({
        title: "Success",
        description: "Video uploaded successfully",
      });
      navigate("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload video",
        variant: "destructive",
      });
    },
  });

  const handleRecordingComplete = async (videoBlob: Blob) => {
    try {
      if (id === "new") {
        await createInterview.mutateAsync();
      } else {
        await uploadVideo.mutateAsync(videoBlob);
      }
    } catch (error) {
      console.error("Error handling recording:", error);
    }
  };

  if (isLoading) {
    return <InterviewSkeleton />;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">
          {id === "new" ? "New Video Interview" : interview?.title}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recording</CardTitle>
        </CardHeader>
        <CardContent>
          <VideoRecorder 
            type="webcam"
            onRecordingComplete={handleRecordingComplete}
            onError={(error: Error) => {
              toast({
                title: "Recording Error",
                description: error.message,
                variant: "destructive"
              });
            }}
            maxDuration={300} // 5 minutes
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Interview Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {interview?.questions.map((question: {id: string; content: string}, i: number) => (
            <div key={i} className="p-4 rounded-lg border bg-card">
              <p className="font-medium">Question {i + 1}</p>
              <p className="mt-1 text-muted-foreground">{question.content}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function InterviewSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-10 w-48" />
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="aspect-video w-full" />
        </CardContent>
      </Card>
    </div>
  );
}