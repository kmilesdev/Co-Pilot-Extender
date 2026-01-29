import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Cloud,
  CloudOff,
  ExternalLink,
  RefreshCw,
  Send,
  Sparkles,
  Loader2,
  Trash2,
} from "lucide-react";
import type { Ticket, ServiceNowHealthStatus } from "@shared/schema";

const priorityColors = {
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  urgent: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const statusColors = {
  open: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

export default function TicketDetailPage() {
  const [, params] = useRoute("/tickets/:id");
  const [, navigate] = useLocation();
  const ticketId = params?.id;
  const { toast } = useToast();

  const { data: ticket, isLoading } = useQuery<Ticket>({
    queryKey: ["/api/tickets", ticketId],
    enabled: !!ticketId,
  });

  const { data: snHealth } = useQuery<ServiceNowHealthStatus>({
    queryKey: ["/api/sn/health"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      return apiRequest("PATCH", `/api/tickets/${ticketId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({
        title: "Status updated",
        description: "Ticket status has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update ticket status.",
        variant: "destructive",
      });
    },
  });

  const createSnIncidentMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/sn/incidents/create-from-ticket/${ticketId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", ticketId] });
      toast({
        title: "Incident created",
        description: "ServiceNow incident has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create ServiceNow incident.",
        variant: "destructive",
      });
    },
  });

  const syncToSnMutation = useMutation({
    mutationFn: async (sysId: string) => {
      return apiRequest("PATCH", `/api/sn/incidents/${sysId}/sync-ticket/${ticketId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", ticketId] });
      toast({
        title: "Synced",
        description: "Ticket has been synced to ServiceNow.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync failed",
        description: error.message || "Failed to sync to ServiceNow.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/tickets/${ticketId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({
        title: "Ticket deleted",
        description: "The ticket has been permanently deleted.",
      });
      navigate("/tickets");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete ticket.",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = async (status: string) => {
    await updateStatusMutation.mutateAsync(status);
    if (ticket?.snSysId) {
      syncToSnMutation.mutate(ticket.snSysId);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-24" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-6">
        <Card className="max-w-md mx-auto mt-12">
          <CardContent className="pt-6 text-center">
            <h2 className="text-lg font-semibold">Ticket not found</h2>
            <p className="text-muted-foreground mt-2">
              The ticket you're looking for doesn't exist.
            </p>
            <Link href="/tickets">
              <Button className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Tickets
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const createdDate = ticket.createdAt
    ? new Date(ticket.createdAt).toLocaleString()
    : "N/A";
  const updatedDate = ticket.updatedAt
    ? new Date(ticket.updatedAt).toLocaleString()
    : "N/A";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/tickets">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{ticket.subject}</h1>
          <p className="text-sm text-muted-foreground">
            Created {createdDate}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{ticket.description}</p>
            </CardContent>
          </Card>

          {ticket.aiSuggestions && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{ticket.aiSuggestions}</p>
              </CardContent>
            </Card>
          )}

          {ticket.snSysId && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5 text-green-500" />
                  ServiceNow Integration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Incident Number</p>
                    <p className="text-lg font-mono">{ticket.snNumber}</p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      ticket.snSyncStatus === "ok"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                    }
                  >
                    {ticket.snSyncStatus === "ok" ? "Synced" : "Sync Failed"}
                  </Badge>
                </div>
                {ticket.snLastSyncAt && (
                  <p className="text-xs text-muted-foreground">
                    Last synced: {new Date(ticket.snLastSyncAt).toLocaleString()}
                  </p>
                )}
                {ticket.snLastError && (
                  <p className="text-xs text-red-500">{ticket.snLastError}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => syncToSnMutation.mutate(ticket.snSysId!)}
                    disabled={syncToSnMutation.isPending}
                    data-testid="button-sync-sn"
                  >
                    {syncToSnMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Sync to ServiceNow
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Status
                </label>
                <Select
                  value={ticket.status}
                  onValueChange={handleStatusChange}
                  disabled={updateStatusMutation.isPending || syncToSnMutation.isPending}
                >
                  <SelectTrigger
                    className="mt-1"
                    data-testid="select-ticket-status"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Priority
                </label>
                <div className="mt-1">
                  <Badge
                    className={`${priorityColors[ticket.priority as keyof typeof priorityColors]}`}
                  >
                    {ticket.priority}
                  </Badge>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Category
                </label>
                <p className="mt-1">{ticket.category || "-"}</p>
              </div>

              <Separator />

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Requester
                </label>
                <p className="mt-1">{ticket.requesterEmail || "-"}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Last Updated
                </label>
                <p className="mt-1 text-sm">{updatedDate}</p>
              </div>

              {(ticket.predictedCategory || ticket.predictedPriority) && (
                <>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      AI Predictions
                    </label>
                    <div className="mt-2 space-y-2">
                      {ticket.predictedCategory && (
                        <p className="text-sm">
                          Category: <strong>{ticket.predictedCategory}</strong>
                        </p>
                      )}
                      {ticket.predictedPriority && (
                        <p className="text-sm">
                          Priority: <strong>{ticket.predictedPriority}</strong>
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5" />
                ServiceNow
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!snHealth?.configured ? (
                <div className="text-center py-4">
                  <CloudOff className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    ServiceNow is not configured
                  </p>
                  <Link href="/servicenow">
                    <Button variant="link" size="sm" className="mt-2">
                      Configure now
                    </Button>
                  </Link>
                </div>
              ) : !ticket.snSysId ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    This ticket is not linked to ServiceNow
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => createSnIncidentMutation.mutate()}
                    disabled={createSnIncidentMutation.isPending}
                    data-testid="button-create-sn-incident"
                  >
                    {createSnIncidentMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Create ServiceNow Incident
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Cloud className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">{ticket.snNumber}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Linked to ServiceNow incident
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="w-full"
                    data-testid="button-delete-ticket"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Ticket
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this ticket?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the ticket
                      and remove it from the system.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : null}
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
