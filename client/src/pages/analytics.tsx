import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  MessageCircle, 
  Ticket, 
  TrendingDown, 
  Clock, 
  Target, 
  DollarSign, 
  Download,
  Brain,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import type { AnalyticsSummary } from "@shared/schema";

export default function AnalyticsPage() {
  const { data: summary, isLoading } = useQuery<AnalyticsSummary>({
    queryKey: ["/api/analytics/summary"],
  });

  const { data: mlStatus } = useQuery({
    queryKey: ["/api/ml/status"],
  });

  const handleExport = () => {
    window.location.href = "/api/analytics/export";
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="text-center py-12 text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  const deflectionRate = summary?.totalChats && summary.totalChats > 0
    ? Math.round((summary.deflectedTickets / summary.totalChats) * 100)
    : 0;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            AI Insights & Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Track the impact of AI-powered support
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} data-testid="button-export-analytics">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card data-testid="card-total-chats">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Chats</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalChats || 0}</div>
            <p className="text-xs text-muted-foreground">AI conversations started</p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-tickets">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalTickets || 0}</div>
            <p className="text-xs text-muted-foreground">Support tickets created</p>
          </CardContent>
        </Card>

        <Card className="border-green-500/30 bg-green-500/5" data-testid="card-deflected-tickets">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Deflected Tickets</CardTitle>
            <TrendingDown className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary?.deflectedTickets || 0}</div>
            <p className="text-xs text-muted-foreground">Issues resolved by AI</p>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5" data-testid="card-cost-saved">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Estimated Savings</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              ${summary?.estimatedCostSaved?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">Based on $25/ticket</p>
          </CardContent>
        </Card>
      </div>

      {/* Second Row Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card data-testid="card-deflection-rate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Deflection Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-deflection-rate">{deflectionRate}%</div>
            <Progress value={deflectionRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Of chat users who resolved without a ticket
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-resolution-time">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.avgResolutionTimeHours?.toFixed(1) || 0}h
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Average time to resolve tickets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">ML Accuracy</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div>
                <div className="text-lg font-bold">
                  {((summary?.categoryAccuracy || 0) * 100).toFixed(0)}%
                </div>
                <p className="text-xs text-muted-foreground">Category</p>
              </div>
              <div>
                <div className="text-lg font-bold">
                  {((summary?.priorityAccuracy || 0) * 100).toFixed(0)}%
                </div>
                <p className="text-xs text-muted-foreground">Priority</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Categories & ML Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Ticket Categories</CardTitle>
            <CardDescription>Distribution of support tickets by category</CardDescription>
          </CardHeader>
          <CardContent>
            {summary?.topCategories && summary.topCategories.length > 0 ? (
              <div className="space-y-3">
                {summary.topCategories.map((cat, idx) => {
                  const total = summary.topCategories.reduce((acc, c) => acc + c.count, 0);
                  const percentage = total > 0 ? Math.round((cat.count / total) * 100) : 0;
                  return (
                    <div key={cat.category} className="flex items-center gap-3">
                      <div className="w-24 text-sm font-medium capitalize">
                        {cat.category}
                      </div>
                      <div className="flex-1">
                        <Progress value={percentage} className="h-2" />
                      </div>
                      <div className="w-16 text-sm text-right text-muted-foreground">
                        {cat.count} ({percentage}%)
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No ticket data yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              ML Model Status
            </CardTitle>
            <CardDescription>Current machine learning model performance</CardDescription>
          </CardHeader>
          <CardContent>
            {mlStatus ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Active Model</span>
                  {(mlStatus as any).activeModel ? (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      v{(mlStatus as any).activeModel.version}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Baseline Only
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Training Examples</span>
                  <span className="font-medium">{(mlStatus as any).trainingExamplesCount || 0}</span>
                </div>
                {(mlStatus as any).activeModel && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Last Trained</span>
                      <span className="text-muted-foreground text-sm">
                        {new Date((mlStatus as any).activeModel.trainedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">Category Accuracy</span>
                        <span className="font-medium">
                          {(((mlStatus as any).activeModel.categoryAccuracy || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress 
                        value={((mlStatus as any).activeModel.categoryAccuracy || 0) * 100} 
                        className="h-2" 
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">Priority Accuracy</span>
                        <span className="font-medium">
                          {(((mlStatus as any).activeModel.priorityAccuracy || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress 
                        value={((mlStatus as any).activeModel.priorityAccuracy || 0) * 100} 
                        className="h-2" 
                      />
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">Loading ML status...</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ROI Summary */}
      <Card className="mt-6 border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            ROI Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-primary">
                {summary?.deflectedTickets || 0}
              </div>
              <p className="text-sm text-muted-foreground">Tickets Prevented</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">
                ${summary?.estimatedCostSaved?.toLocaleString() || 0}
              </div>
              <p className="text-sm text-muted-foreground">Estimated Cost Saved</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">
                {summary?.avgResolutionTimeHours
                  ? Math.round(summary.avgResolutionTimeHours * (summary?.deflectedTickets || 0))
                  : 0}h
              </div>
              <p className="text-sm text-muted-foreground">IT Hours Saved</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
