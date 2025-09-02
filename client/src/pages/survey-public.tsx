import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Lock, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function SurveyPublic() {
  const params = useParams();
  const shareToken = params.shareToken;
  const { toast } = useToast();
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { data: survey, isLoading, error } = useQuery({
    queryKey: [`/api/public/surveys/${shareToken}`],
    enabled: !!shareToken,
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", `/api/public/surveys/${shareToken}/responses`, data);
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Success",
        description: "Your response has been submitted successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit response",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (questionId: string, value: string) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!survey) return;

    // Validate required questions
    const requiredQuestions = survey.questions?.filter((q: any) => q.required) || [];
    const missingRequired = requiredQuestions.filter((q: any) => !responses[q.id]);
    
    if (missingRequired.length > 0) {
      toast({
        title: "Required Fields Missing",
        description: "Please fill in all required fields before submitting.",
        variant: "destructive",
      });
      return;
    }

    // Convert responses to answer format
    const answers = Object.entries(responses).map(([questionId, value]) => ({
      questionId,
      value,
    }));

    submitMutation.mutate({
      answers,
      respondentId: `anonymous_${Date.now()}`,
    });
  };

  const renderQuestion = (question: any, index: number) => {
    const questionId = question.id;
    const value = responses[questionId] || "";

    switch (question.type) {
      case "multiple-choice":
        return (
          <div className="space-y-3" key={questionId}>
            <RadioGroup 
              value={value} 
              onValueChange={(newValue) => handleInputChange(questionId, newValue)}
              data-testid={`question-${index}-multiple-choice`}
            >
              {question.options?.map((option: string, optionIndex: number) => (
                <div key={optionIndex} className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted cursor-pointer transition-colors">
                  <RadioGroupItem value={option} id={`${questionId}-${optionIndex}`} />
                  <Label htmlFor={`${questionId}-${optionIndex}`} className="flex-1 cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case "rating":
        return (
          <div className="space-y-4" key={questionId}>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Not likely</span>
              <div className="flex space-x-2">
                {Array.from({ length: 10 }, (_, i) => {
                  const rating = (i + 1).toString();
                  return (
                    <Label 
                      key={i}
                      htmlFor={`${questionId}-${rating}`}
                      className={`flex items-center justify-center w-12 h-12 border border-border rounded-lg cursor-pointer hover:bg-muted transition-colors ${
                        value === rating ? 'bg-primary text-primary-foreground border-primary' : ''
                      }`}
                      data-testid={`rating-${index}-${rating}`}
                    >
                      <input
                        type="radio"
                        id={`${questionId}-${rating}`}
                        name={questionId}
                        value={rating}
                        onChange={(e) => handleInputChange(questionId, e.target.value)}
                        className="sr-only"
                      />
                      <span className="font-medium">{rating}</span>
                    </Label>
                  );
                })}
              </div>
              <span className="text-sm text-muted-foreground">Very likely</span>
            </div>
          </div>
        );

      case "textarea":
        return (
          <Textarea
            key={questionId}
            value={value}
            onChange={(e) => handleInputChange(questionId, e.target.value)}
            placeholder="Enter your response here..."
            className="min-h-[100px]"
            data-testid={`question-${index}-textarea`}
          />
        );

      case "text":
      default:
        return (
          <Input
            key={questionId}
            type="text"
            value={value}
            onChange={(e) => handleInputChange(questionId, e.target.value)}
            placeholder="Enter your answer..."
            data-testid={`question-${index}-text`}
          />
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading survey...</p>
        </div>
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <div className="text-destructive mb-4">
              <Lock className="h-12 w-12 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Survey Not Found</h2>
            <p className="text-muted-foreground">
              This survey may have been closed, deleted, or the link is invalid.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <div className="text-secondary mb-4">
              <CheckCircle className="h-12 w-12 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Thank You!</h2>
            <p className="text-muted-foreground">
              Your response has been submitted successfully. We appreciate your feedback!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Survey Header */}
        <Card className="border-border mb-6">
          <CardContent className="p-8">
            <div className="bg-gradient-to-r from-primary to-secondary p-6 rounded-lg text-center mb-6">
              <h1 className="text-2xl font-bold text-white mb-2" data-testid="text-survey-title">
                {survey.title}
              </h1>
              {survey.description && (
                <p className="text-white/80" data-testid="text-survey-description">
                  {survey.description}
                </p>
              )}
            </div>
            
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Lock className="h-4 w-4" />
                <span>Anonymous Survey</span>
              </div>
              <span data-testid="text-question-count">
                {survey.questions?.length || 0} Question{survey.questions?.length !== 1 ? 's' : ''}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Survey Questions */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {survey.questions?.map((question: any, index: number) => (
            <Card key={question.id} className="border-border" data-testid={`card-question-${index}`}>
              <CardContent className="p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-foreground mb-2" data-testid={`text-question-${index}-title`}>
                    {question.text}
                  </h3>
                  {question.required && (
                    <Badge variant="destructive" className="text-xs" data-testid={`badge-required-${index}`}>
                      Required
                    </Badge>
                  )}
                </div>
                
                {renderQuestion(question, index)}
              </CardContent>
            </Card>
          ))}

          {/* Submit Button */}
          <Card className="border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground flex items-center">
                  <Lock className="h-4 w-4 mr-2" />
                  Your responses are anonymous and secure
                </div>
                <Button 
                  type="submit" 
                  disabled={submitMutation.isPending}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3"
                  data-testid="button-submit-survey"
                >
                  {submitMutation.isPending ? "Submitting..." : "Submit Survey"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
