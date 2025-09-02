import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Plus, X, Trash2 } from "lucide-react";

const questionSchema = z.object({
  text: z.string().min(1, "Question text is required"),
  type: z.enum(["multiple-choice", "text", "rating", "textarea"]),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
});

const surveySchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  anonymous: z.boolean().default(true),
  multipleResponses: z.boolean().default(false),
  questions: z.array(questionSchema).min(1, "At least one question is required"),
});

type SurveyFormData = z.infer<typeof surveySchema>;

interface SurveyCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SurveyCreationModal({ isOpen, onClose }: SurveyCreationModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDraft, setIsDraft] = useState(false);

  const form = useForm<SurveyFormData>({
    resolver: zodResolver(surveySchema),
    defaultValues: {
      title: "",
      description: "",
      anonymous: true,
      multipleResponses: false,
      questions: [
        {
          text: "",
          type: "multiple-choice",
          required: false,
          options: ["", ""],
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  const createSurveyMutation = useMutation({
    mutationFn: async (data: SurveyFormData & { status: string }) => {
      await apiRequest("POST", "/api/surveys", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surveys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: `Survey ${isDraft ? 'saved as draft' : 'created'} successfully`,
      });
      form.reset();
      onClose();
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
        description: "Failed to create survey",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SurveyFormData) => {
    // Filter out empty options for multiple choice questions
    const processedQuestions = data.questions.map(question => {
      if (question.type === "multiple-choice" && question.options) {
        return {
          ...question,
          options: question.options.filter(option => option.trim() !== ""),
        };
      }
      return question;
    });

    const surveyData = {
      ...data,
      questions: processedQuestions,
      status: isDraft ? "draft" : "active",
    };

    createSurveyMutation.mutate(surveyData);
  };

  const addQuestion = () => {
    append({
      text: "",
      type: "multiple-choice",
      required: false,
      options: ["", ""],
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

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="modal-create-survey">
        <DialogHeader>
          <DialogTitle data-testid="text-modal-title">Create New Survey</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
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
            </div>

            {/* Questions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-medium text-foreground">Questions</h4>
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

              {fields.map((field, questionIndex) => (
                <div 
                  key={field.id} 
                  className="bg-muted/30 p-4 rounded-lg border border-border"
                  data-testid={`question-${questionIndex}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-muted-foreground">
                      Question {questionIndex + 1}
                    </span>
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
                      
                      {fields.length > 1 && (
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
                      )}
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
              ))}
            </div>

            {/* Settings */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-foreground">Settings</h4>
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
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-border">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                variant="outline"
                onClick={() => {
                  setIsDraft(true);
                  form.handleSubmit(onSubmit)();
                }}
                disabled={createSurveyMutation.isPending}
                data-testid="button-save-draft"
              >
                Save Draft
              </Button>
              <Button 
                type="submit"
                disabled={createSurveyMutation.isPending}
                onClick={() => setIsDraft(false)}
                data-testid="button-create-survey"
              >
                {createSurveyMutation.isPending ? "Creating..." : "Create Survey"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
