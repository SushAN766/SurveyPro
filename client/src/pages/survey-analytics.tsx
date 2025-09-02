import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import AdminSidebar from "@/components/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, BarChart3, Download, Share, Eye } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function SurveyAnalytics() {
  const params = useParams();
  const surveyId = params.id;
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

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
    enabled: isAuthenticated && !!surveyId,
    retry: false,
  });

  const { data: responseData, isLoading: responsesLoading } = useQuery({
    queryKey: [`/api/surveys/${surveyId}/responses`],
    enabled: isAuthenticated && !!surveyId,
    retry: false,
  });

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

  const exportData = () => {
    if (!responseData) return;
    
    // Create CSV data
    const csvData = responseData.responses.map((response: any) => {
      const row: any = { responseId: response.id, submittedAt: response.createdAt };
      responseData.answers.forEach((answer: any) => {
        if (answer.responseId === response.id) {
          const question = survey?.questions?.find((q: any) => q.id === answer.questionId);
          if (question) {
            row[question.text] = answer.value;
          }
        }
      });
      return row;
    });

    // Convert to CSV string
    if (csvData.length > 0) {
      const headers = Object.keys(csvData[0]).join(',');
      const csv = [headers, ...csvData.map(row => Object.values(row).join(','))].join('\n');
      
      // Download CSV
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${survey?.title || 'survey'}-responses.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Response data exported successfully",
      });
    }
  };

  const getQuestionAnalytics = (question: any) => {
    if (!responseData) return null;

    const questionAnswers = responseData.answers.filter((answer: any) => answer.questionId === question.id);
    
    if (question.type === "multiple-choice") {
      const optionCounts: Record<string, number> = {};
      question.options?.forEach((option: string) => {
        optionCounts[option] = 0;
      });
      
      questionAnswers.forEach((answer: any) => {
        if (optionCounts.hasOwnProperty(answer.value)) {
          optionCounts[answer.value]++;
        }
      });

      return Object.entries(optionCounts).map(([option, count]) => ({
        name: option.length > 20 ? option.slice(0, 20) + "..." : option,
        value: count,
        fullName: option,
      }));
    }

    if (question.type === "rating") {
      const ratingCounts: Record<string, number> = {};
      for (let i = 1; i <= 10; i++) {
        ratingCounts[i.toString()] = 0;
      }
      
      questionAnswers.forEach((answer: any) => {
        if (ratingCounts.hasOwnProperty(answer.value)) {
          ratingCounts[answer.value]++;
        }
      });

      return Object.entries(ratingCounts).map(([rating, count]) => ({
        name: rating,
        value: count,
      }));
    }

    return questionAnswers.map((answer: any) => answer.value);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const COLORS = ['hsl(217, 91%, 60%)', 'hsl(142, 69%, 58%)', 'hsl(4, 90%, 58%)', 'hsl(45, 93%, 47%)', 'hsl(262, 83%, 58%)', 'hsl(173, 58%, 39%)'];

  if (isLoading || surveyLoading) {
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

  if (!survey) {
    return (
      <div className="flex min-h-screen bg-background">
        <AdminSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">Survey Not Found</h2>
            <p className="text-muted-foreground mb-4">The survey you're looking for doesn't exist or you don't have permission to view it.</p>
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
                <h2 className="text-2xl font-semibold text-foreground" data-testid="text-survey-title">
                  {survey.title}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">Survey Analytics & Responses</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {getStatusBadge(survey.status)}
              <Button 
                variant="outline" 
                size="sm"
                onClick={copyShareLink}
                data-testid="button-copy-link"
              >
                <Share className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={exportData}
                disabled={!responseData || responseData.responses.length === 0}
                data-testid="button-export"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="p-6 space-y-6 overflow-y-auto h-full">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Responses</p>
                    <p className="text-2xl font-semibold text-foreground" data-testid="text-total-responses">
                      {responseData?.responses?.length || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Questions</p>
                    <p className="text-2xl font-semibold text-foreground" data-testid="text-question-count">
                      {survey.questions?.length || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-secondary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="text-lg font-semibold text-foreground" data-testid="text-created-date">
                      {formatDate(survey.createdAt)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                    <Eye className="h-6 w-6 text-accent" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Survey Description */}
          {survey.description && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Survey Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground" data-testid="text-survey-description">
                  {survey.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Question Analytics */}
          {responsesLoading ? (
            <Card className="border-border">
              <CardContent className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading response data...</p>
              </CardContent>
            </Card>
          ) : !responseData || responseData.responses.length === 0 ? (
            <Card className="border-border">
              <CardContent className="p-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Responses Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Share your survey to start collecting responses.
                </p>
                <Button onClick={copyShareLink} data-testid="button-share-survey">
                  <Share className="h-4 w-4 mr-2" />
                  Copy Survey Link
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {survey.questions?.map((question: any, index: number) => {
                const analytics = getQuestionAnalytics(question);
                
                return (
                  <Card key={question.id} className="border-border" data-testid={`card-question-analytics-${index}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span data-testid={`text-question-${index}-title`}>
                          Question {index + 1}: {question.text}
                        </span>
                        <Badge variant="outline" data-testid={`badge-question-${index}-type`}>
                          {question.type}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {question.type === "multiple-choice" && analytics ? (
                        <div className="space-y-4">
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={analytics}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({ name, value }) => `${name}: ${value}`}
                                  outerRadius={80}
                                  fill="#8884d8"
                                  dataKey="value"
                                >
                                  {analytics.map((entry: any, entryIndex: number) => (
                                    <Cell key={`cell-${entryIndex}`} fill={COLORS[entryIndex % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value, name, props) => [value, props.payload.fullName]} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {analytics.map((item: any, itemIndex: number) => (
                              <div key={itemIndex} className="text-center p-2 border border-border rounded">
                                <p className="font-medium text-foreground">{item.value}</p>
                                <p className="text-sm text-muted-foreground">{item.fullName}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : question.type === "rating" && analytics ? (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="value" fill="hsl(217, 91%, 60%)" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : analytics && Array.isArray(analytics) ? (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {analytics.length > 0 ? (
                            analytics.map((response: string, responseIndex: number) => (
                              <div key={responseIndex} className="p-3 bg-muted/30 rounded border border-border">
                                <p className="text-sm text-foreground">{response}</p>
                              </div>
                            ))
                          ) : (
                            <p className="text-muted-foreground text-center py-4">No responses yet</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">No responses yet</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
