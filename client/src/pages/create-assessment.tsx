import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { extendedAssessmentSchema, type ExtendedAssessment } from "@/lib/assessment-helpers";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { X, Loader2, Video, FileText, CheckCircle } from "lucide-react";
import { useState } from "react";
import * as z from "zod";

type FormData = z.infer<typeof extendedAssessmentSchema>;

export default function CreateAssessment() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [includeVideoQuestions, setIncludeVideoQuestions] = useState(true);

  const form = useForm<FormData>({
    resolver: zodResolver(extendedAssessmentSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "technical",
      questions: [],
      createdById: 1, // Hardcoded for demo
      skills: [],
      difficulty: "intermediate"
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      setIsGenerating(true);
      try {
        // First generate questions
        const questionsRes = await apiRequest("POST", "/api/generate-questions", {
          role: data.title,
          skills: data.skills,
          difficulty: data.difficulty,
          type: data.type,
          includeVideoQuestions: includeVideoQuestions
        });

        if (!questionsRes.ok) {
          const error = await questionsRes.text();
          throw new Error(error);
        }

        const questions = await questionsRes.json();

        if (!questions || questions.length === 0) {
          throw new Error("No questions were generated. Please try again.");
        }

        // Then create assessment with generated questions
        const assessmentRes = await apiRequest("POST", "/api/assessments", {
          ...data,
          questions
        });

        if (!assessmentRes.ok) {
          const error = await assessmentRes.text();
          throw new Error(error);
        }

        return assessmentRes.json();
      } finally {
        setIsGenerating(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assessments"] });
      toast({
        title: "Success!",
        description: "Assessment created with AI-generated questions.",
      });
      navigate("/");
    },
    onError: (error: Error) => {
      console.error("Failed to create assessment:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create assessment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const [newSkill, setNewSkill] = useState("");

  const addSkill = () => {
    const skill = newSkill.trim();
    if (skill && !form.getValues("skills").includes(skill)) {
      form.setValue("skills", [...form.getValues("skills"), skill]);
      setNewSkill("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    form.setValue(
      "skills",
      form.getValues("skills").filter(skill => skill !== skillToRemove)
    );
  };

  async function onSubmit(data: FormData) {
    if (data.skills.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one required skill",
        variant: "destructive",
      });
      return;
    }

    try {
      await createMutation.mutateAsync(data);
    } catch (error) {
      console.error("Form submission error:", error);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">Create Assessment</h1>

      <Card className="p-6">
        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assessment Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Executive Assistant Assessment" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe what this assessment will evaluate" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assessment Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select assessment type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cognitive">Cognitive</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="situational">Situational Judgment</SelectItem>
                      <SelectItem value="coding">Coding Challenge</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="difficulty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Difficulty Level</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select difficulty level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Required Skills</FormLabel>
              <div className="flex gap-2">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Add a skill (e.g. Calendar Management, Email Organization)"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                />
                <Button type="button" onClick={addSkill}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {form.watch("skills").map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              {form.formState.errors.skills && (
                <p className="text-sm text-destructive">{form.formState.errors.skills.message}</p>
              )}
            </div>

            {/* Video Question Toggle */}
            <div className="flex items-center space-x-2">
              <Switch 
                id="video-questions"
                checked={includeVideoQuestions}
                onCheckedChange={setIncludeVideoQuestions}
              />
              <FormLabel htmlFor="video-questions" className="cursor-pointer flex items-center gap-2">
                <Video className="h-4 w-4" />
                Include video response questions
              </FormLabel>
            </div>

            {includeVideoQuestions && (
              <div className="rounded-md bg-muted p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Video Response Questions Enabled</p>
                    <p className="text-sm text-muted-foreground">
                      Candidates will be prompted to record webcam video responses to certain questions. 
                      These responses will be automatically analyzed for language proficiency, 
                      behavioral cues, and attitude assessment.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Button 
              type="submit" 
              disabled={isGenerating || createMutation.isPending}
              className="w-full"
            >
              {isGenerating || createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isGenerating ? "Generating Questions..." : "Creating Assessment..."}
                </>
              ) : (
                "Create Assessment"
              )}
            </Button>
          </form>
        </Form>
      </Card>
    </div>
  );
}