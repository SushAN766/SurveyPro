import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import AdminSidebar from "@/components/admin-sidebar";
import StatsCards from "@/components/stats-cards";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Edit, Share, Trash2, UserPlus, FileEdit, Link as LinkIcon, TrendingUp } from "lucide-react";
import { useState } from "react";
import SurveyCreationModal from "@/components/survey-creation-modal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Link } from "wouter";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

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

  const { data: surveys, isLoading: surveysLoading } = useQuery({
    queryKey: ["/api/surveys"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: recentActivity } = useQuery({
    queryKey: ["/api/activity"],
    enabled: isAuthenticated,
    retry: false,
  });

  const deleteSurveyMutation = useMutation({
    mutationFn: async (surveyId: string) => {
      await apiRequest("DELETE", `/api/surveys/${surveyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surveys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "Survey deleted successfully",
      });
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
        description: "Failed to delete survey",
        variant: "destructive",
      });
    },
  });

  const toggleSurveyStatusMutation = useMutation({
    mutationFn: async ({ surveyId, status }: { surveyId: string; status: string }) => {
      await apiRequest("PUT", `/api/surveys/${surveyId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surveys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "Survey status updated successfully",
      });
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
        description: "Failed to update survey status",
        variant: "destructive",
      });
    },
  });

  const handleDeleteSurvey = (surveyId: string) => {
    if (window.confirm("Are you sure you want to delete this survey? This action cannot be undone.")) {
      deleteSurveyMutation.mutate(surveyId);
    }
  };

  const handleToggleStatus = (surveyId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "closed" : "active";
    toggleSurveyStatusMutation.mutate({ surveyId, status: newStatus });
  };

  const copyShareLink = (shareToken: string) => {
    const link = `${window.location.origin}/survey/${shareToken}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Success",
      description: "Survey link copied to clipboard",
    });
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
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      if (diffInHours < 1) return "Just now";
      return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
    }
    
    return date.toLocaleDateString();
  };

  if (isLoading) {
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

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      
      <div className="flex-1 overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground" data-testid="text-dashboard-title">Dashboard</h2>
              <p className="text-sm text-muted-foreground mt-1">Manage your surveys and view analytics</p>
            </div>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              data-testid="button-create-survey"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Survey
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <div className="p-6 space-y-6 overflow-y-auto h-full">
          {/* Stats Cards */}
          <StatsCards />

          {/* Recent Surveys */}
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Surveys</CardTitle>
                <Link href="/surveys">
                  <Button variant="ghost" size="sm" data-testid="link-view-all-surveys">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {surveysLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : !surveys || surveys.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No surveys created yet</p>
                  <Button 
                    onClick={() => setShowCreateModal(true)}
                    variant="outline"
                    data-testid="button-create-first-survey"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Survey
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Survey Name</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Responses</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Created</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {surveys.slice(0, 5).map((survey: any) => (
                        <tr key={survey.id} className="border-b border-border hover:bg-muted/50 transition-colors" data-testid={`row-survey-${survey.id}`}>
                          <td className="py-4 px-2">
                            <div>
                              <p className="font-medium text-foreground" data-testid={`text-survey-title-${survey.id}`}>{survey.title}</p>
                              {survey.description && (
                                <p className="text-sm text-muted-foreground" data-testid={`text-survey-description-${survey.id}`}>
                                  {survey.description.length > 60 ? `${survey.description.slice(0, 60)}...` : survey.description}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-2" data-testid={`status-survey-${survey.id}`}>
                            {getStatusBadge(survey.status)}
                          </td>
                          <td className="py-4 px-2">
                            <span className="font-medium text-foreground" data-testid={`text-response-count-${survey.id}`}>
                              {survey.responseCount || 0}
                            </span>
                          </td>
                          <td className="py-4 px-2">
                            <span className="text-sm text-muted-foreground" data-testid={`text-created-date-${survey.id}`}>
                              {formatDate(survey.createdAt)}
                            </span>
                          </td>
                          <td className="py-4 px-2">
                            <div className="flex items-center space-x-2">
                              <Link href={`/surveys/${survey.id}/analytics`}>
                                <Button variant="ghost" size="sm" data-testid={`button-view-${survey.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Link href={`/surveys/${survey.id}/edit`}>
                                <Button variant="ghost" size="sm" data-testid={`button-edit-${survey.id}`}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => copyShareLink(survey.shareToken)}
                                data-testid={`button-share-${survey.id}`}
                              >
                                <Share className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDeleteSurvey(survey.id)}
                                className="text-destructive hover:text-destructive"
                                data-testid={`button-delete-${survey.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions and Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-auto p-4"
                  onClick={() => setShowCreateModal(true)}
                  data-testid="button-quick-create-survey"
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                    <Plus className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-foreground">Create New Survey</p>
                    <p className="text-sm text-muted-foreground">Start building a new survey</p>
                  </div>
                </Button>
                
                <Link href="/surveys">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start h-auto p-4"
                    data-testid="button-quick-view-analytics"
                  >
                    <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center mr-3">
                      <TrendingUp className="h-5 w-5 text-accent" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-foreground">View All Surveys</p>
                      <p className="text-sm text-muted-foreground">Manage and analyze surveys</p>
                    </div>
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {!recentActivity || recentActivity.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
                  ) : (
                    recentActivity.slice(0, 4).map((activity: any, index: number) => (
                      <div key={index} className="flex items-start space-x-3" data-testid={`activity-${index}`}>
                        <div className="w-8 h-8 bg-secondary/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <UserPlus className="h-4 w-4 text-secondary" />
                        </div>
                        <div>
                          <p className="text-sm text-foreground">{activity.description}</p>
                          <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Survey Creation Modal */}
      <SurveyCreationModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />
    </div>
  );
}
