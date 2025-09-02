import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import AdminSidebar from "@/components/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Eye, Share, Plus, X, Trash2, GripVertical } from "lucide-react";

const questionSchema = z.object({
  text: z.string().min(1, "Question text is required"),
  type: z.enum(["multiple-choice", "text", "rating", "textarea"]),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  order: z.number(),
});

const surveySchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  anonymous: z.boolean().default(true),
  multipleResponses: z.boolean().default(false),
  status: z.enum(["draft", "active", "closed"]).default("draft"),
  questions: z.array(questionSchema),
});

type SurveyFormData = z.infer<typeof surveySchema>;

export default function SurveyBuilder() {
  const params = useParams();
  const surveyId = params.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [previewMode, setPreviewMode] = useState(false);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: survey, isLoading: surveyLoading } = useQuery({
    queryKey: [`/api/surveys/${surveyId}`],
    enabled: isAuthenticated && !!surveyId && surveyId !== "new",
    retry: false,
  });

  const form = useForm<SurveyFormData>({
    resolver: zodResolver(surveySchema),
    defaultValues: {
      title: "",
      description: "",
      anonymous: true,
      multipleResponses: false,
      status: "draft",
      questions: [],
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  // Set form values when survey data is loaded
  useEffect(() => {
    if (survey) {
      form.reset({
        title: survey.title,
        description: survey.description || "",
        anonymous: survey.anonymous,
        multipleResponses: survey.multipleResponses,
        status: survey.status,
        questions: survey.questions?.map((q: any, index: number) => ({
          text: q.text,
          type: q.type,
          required: q.required,
          options: q.options || [],
          order: index,
        })) || [],
      });
    }
  }, [survey, form]);

  const saveSurveyMutation = useMutation({
    mutationFn: async (data: SurveyFormData) => {
      if (surveyId === "new") {
        await apiRequest("POST", "/api/surveys", data);
      } else {
        await apiRequest("PUT", `/api/surveys/${surveyId}`, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surveys"] });
      queryClient.invalidateQueries({ queryKey: [`/api/surveys/${surveyId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "Survey saved successfully",
      });
      if (surveyId === "new") {
        setLocation("/dashboard");
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to save survey",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SurveyFormData) => {
    // Process questions to ensure proper order and clean options
    const processedQuestions = data.questions.map((question, index) => {
      const processedQuestion = {
        ...question,
        order: index,
      };

      if (question.type === "multiple-choice" && question.options) {
        processedQuestion.options = question.options.filter(option => option.trim() !== "");
      }

      return processedQuestion;
    });

    saveSurveyMutation.mutate({
      ...data,
      questions: processedQuestions,
    });
  };

  const addQuestion = () => {
    append({
      text: "",
      type: "multiple-choice",
      required: false,
      options: ["", ""],
      order: fields.length,
    });
  };

  const addOption = (questionIndex: number) => {
    const currentOptions = form.getValues(`questions.${questionIndex}.options`) || [];
    form.setValue(`questions.${questionIndex}.options`, [...currentOptions, ""]);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const currentOptions = form.getValues(`questions.${questionIndex}.options`) || [];
    if (currentOptions.length > 1) {
      const newOptions = currentOptions.filter((_, index) => index !== optionIndex);
      form.setValue(`questions.${questionIndex}.options`, newOptions);
    }
  };

  const copyShareLink = () => {
    if (survey?.shareToken) {
      const link = `${window.location.origin}/survey/${survey.shareToken}`;
      navigator.clipboard.writeText(link);
      toast({
        title: "Success",
        description: "Survey link copied to clipboard",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-secondary/10 text-secondary border-secondary/20">Active</Badge>;
      case "closed":
        return <Badge className="bg-accent/10 text-accent border-accent/20">Closed</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  const renderQuestionPreview = (question: any, index: number) => {
    switch (question.type) {
      case "multiple-choice":
        return (
          <div className="space-y-3">
            {question.options?.filter((opt: string) => opt.trim()).map((option: string, optionIndex: number) => (
              <div key={optionIndex} className="flex items-center space-x-3 p-3 rounded-lg border border-border">
                <div className="w-4 h-4 border-2 border-primary rounded-full"></div>
                <span className="text-foreground">{option}</span>
              </div>
            ))}
          </div>
        );

      case "rating":
        return (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Not likely</span>
            <div className="flex space-x-2">
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className="w-12 h-12 border border-border rounded-lg flex items-center justify-center">
                  <span className="font-medium text-foreground">{i + 1}</span>
                </div>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">Very likely</span>
          </div>
        );

      case "textarea":
        return (
          <div className="w-full p-3 border border-border rounded-lg bg-muted/30 min-h-[100px] flex items-center">
            <span className="text-muted-foreground">Long text response area...</span>
          </div>
        );

      case "text":
      default:
        return (
          <div className="w-full p-3 border border-border rounded-lg bg-muted/30 flex items-center">
            <span className="text-muted-foreground">Text input field...</span>
          </div>
        );
    }
  };

  if (isLoading || (surveyId !== "new" && surveyLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (surveyId !== "new" && !survey && !surveyLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <AdminSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">Survey Not Found</h2>
            <p className="text-muted-foreground mb-4">The survey you're looking for doesn't exist or you don't have permission to edit it.</p>
            <Link href="/dashboard">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      
      <div className="flex-1 overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" data-testid="button-back">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h2 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">
                  {surveyId === "new" ? "Create New Survey" : "Edit Survey"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {surveyId === "new" ? "Build your survey from scratch" : "Modify your survey settings and questions"}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {survey && getStatusBadge(survey.status)}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setPreviewMode(!previewMode)}
                data-testid="button-toggle-preview"
              >
                <Eye className="h-4 w-4 mr-2" />
                {previewMode ? "Edit" : "Preview"}
              </Button>
              {survey && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={copyShareLink}
                  data-testid="button-copy-link"
                >
                  <Share className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
              )}
              <Button 
                onClick={form.handleSubmit(onSubmit)}
                disabled={saveSurveyMutation.isPending}
                data-testid="button-save-survey"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveSurveyMutation.isPending ? "Saving..." : "Save Survey"}
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="p-6 overflow-y-auto h-full">
          {previewMode ? (
            /* Preview Mode */
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Survey Header Preview */}
              <Card className="border-border">
                <CardContent className="p-8">
                  <div className="bg-gradient-to-r from-primary to-secondary p-6 rounded-lg text-center mb-6">
                    <h1 className="text-2xl font-bold text-white mb-2" data-testid="text-preview-title">
                      {form.watch("title") || "Untitled Survey"}
                    </h1>
                    {form.watch("description") && (
                      <p className="text-white/80" data-testid="text-preview-description">
                        {form.watch("description")}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Anonymous Survey</span>
                    <span data-testid="text-preview-question-count">
                      {fields.length} Question{fields.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Questions Preview */}
              {fields.map((field, index) => {
                const question = form.watch(`questions.${index}`);
                return (
                  <Card key={field.id} className="border-border" data-testid={`preview-question-${index}`}>
                    <CardContent className="p-6">
                      <div className="mb-4">
                        <h3 className="text-lg font-medium text-foreground mb-2">
                          {question.text || `Question ${index + 1}`}
                        </h3>
                        {question.required && (
                          <Badge variant="destructive" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                      
                      {renderQuestionPreview(question, index)}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            /* Edit Mode */
            <div className="max-w-4xl mx-auto">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Survey Basic Info */}
                  <Card className="border-border">
                    <CardHeader>
                      <CardTitle>Survey Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Survey Title</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter survey title" 
                                {...field} 
                                data-testid="input-survey-title"
                              />
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
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Brief description of your survey"
                                rows={3}
                                {...field} 
                                data-testid="input-survey-description"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Survey Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-survey-status">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Questions */}
                  <Card className="border-border">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Questions</CardTitle>
                        <Button 
                          type="button" 
                          onClick={addQuestion}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground"
                          data-testid="button-add-question"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Question
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {fields.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground mb-4">No questions added yet</p>
                          <Button 
                            type="button" 
                            onClick={addQuestion}
                            variant="outline"
                            data-testid="button-add-first-question"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Your First Question
                          </Button>
                        </div>
                      ) : (
                        fields.map((field, questionIndex) => (
                          <div 
                            key={field.id} 
                            className="bg-muted/30 p-4 rounded-lg border border-border"
                            data-testid={`question-builder-${questionIndex}`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                                <span className="text-sm font-medium text-muted-foreground">
                                  Question {questionIndex + 1}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <FormField
                                  control={form.control}
                                  name={`questions.${questionIndex}.type`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                          <SelectTrigger className="w-[140px]" data-testid={`select-question-type-${questionIndex}`}>
                                            <SelectValue />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                                          <SelectItem value="text">Text Input</SelectItem>
                                          <SelectItem value="rating">Rating Scale</SelectItem>
                                          <SelectItem value="textarea">Long Text</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </FormItem>
                                  )}
                                />
                                
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => remove(questionIndex)}
                                  className="text-destructive hover:text-destructive"
                                  data-testid={`button-delete-question-${questionIndex}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <FormField
                                control={form.control}
                                name={`questions.${questionIndex}.text`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input 
                                        placeholder="Enter your question"
                                        {...field}
                                        data-testid={`input-question-text-${questionIndex}`}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              {/* Question Type Specific Fields */}
                              {form.watch(`questions.${questionIndex}.type`) === "multiple-choice" && (
                                <div className="space-y-2">
                                  <label className="block text-sm font-medium text-foreground">Answer Options</label>
                                  {form.watch(`questions.${questionIndex}.options`)?.map((option, optionIndex) => (
                                    <div key={optionIndex} className="flex items-center space-x-2">
                                      <FormField
                                        control={form.control}
                                        name={`questions.${questionIndex}.options.${optionIndex}`}
                                        render={({ field }) => (
                                          <FormItem className="flex-1">
                                            <FormControl>
                                              <Input 
                                                placeholder={`Option ${optionIndex + 1}`}
                                                {...field}
                                                data-testid={`input-option-${questionIndex}-${optionIndex}`}
                                              />
                                            </FormControl>
                                          </FormItem>
                                        )}
                                      />
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeOption(questionIndex, optionIndex)}
                                        className="text-destructive hover:text-destructive"
                                        data-testid={`button-remove-option-${questionIndex}-${optionIndex}`}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => addOption(questionIndex)}
                                    className="text-primary"
                                    data-testid={`button-add-option-${questionIndex}`}
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add Option
                                  </Button>
                                </div>
                              )}

                              <div className="flex items-center space-x-4">
                                <FormField
                                  control={form.control}
                                  name={`questions.${questionIndex}.required`}
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                      <FormControl>
                                        <Switch
                                          checked={field.value}
                                          onCheckedChange={field.onChange}
                                          data-testid={`switch-required-${questionIndex}`}
                                        />
                                      </FormControl>
                                      <FormLabel className="text-sm font-normal">
                                        Required
                                      </FormLabel>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  {/* Settings */}
                  <Card className="border-border">
                    <CardHeader>
                      <CardTitle>Survey Settings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="anonymous"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Anonymous Responses</FormLabel>
                                <div className="text-sm text-muted-foreground">
                                  Don't collect respondent information
                                </div>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="switch-anonymous"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="multipleResponses"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Multiple Responses</FormLabel>
                                <div className="text-sm text-muted-foreground">
                                  Allow multiple submissions per user
                                </div>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="switch-multiple-responses"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </form>
              </Form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
