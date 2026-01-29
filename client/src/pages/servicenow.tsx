import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Cloud,
  CloudOff,
  RefreshCw,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Settings,
} from "lucide-react";
import type { ServiceNowIncident, ServiceNowHealthStatus, SyncedUser, SyncedGroup } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Building2 } from "lucide-react";

const stateLabels: Record<string, string> = {
  "1": "New",
  "2": "In Progress",
  "3": "On Hold",
  "4": "Resolved",
  "5": "Closed",
  "6": "Canceled",
};

const priorityLabels: Record<string, string> = {
  "1": "Critical",
  "2": "High",
  "3": "Medium",
  "4": "Low",
  "5": "Planning",
};

const priorityColors: Record<string, string> = {
  "1": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  "2": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  "3": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  "4": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  "5": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

function IncidentDetailModal({
  incident,
  open,
  onClose,
}: {
  incident: ServiceNowIncident | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!incident) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono">{incident.number}</span>
            <Badge
              variant="secondary"
              className={priorityColors[incident.priority] || ""}
            >
              {priorityLabels[incident.priority] || incident.priority}
            </Badge>
          </DialogTitle>
          <DialogDescription>{incident.short_description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
            <p className="mt-1 whitespace-pre-wrap">
              {incident.description || "No description provided"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">State</h4>
              <p className="mt-1">{stateLabels[incident.state] || incident.state}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Category</h4>
              <p className="mt-1">{incident.category || "-"}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Created</h4>
              <p className="mt-1">
                {incident.sys_created_on
                  ? new Date(incident.sys_created_on).toLocaleString()
                  : "-"}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Updated</h4>
              <p className="mt-1">
                {incident.sys_updated_on
                  ? new Date(incident.sys_updated_on).toLocaleString()
                  : "-"}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ServiceNowPage() {
  const { toast } = useToast();
  const [selectedIncident, setSelectedIncident] = useState<ServiceNowIncident | null>(null);

  const { data: health, isLoading: healthLoading } = useQuery<ServiceNowHealthStatus>({
    queryKey: ["/api/sn/health"],
  });

  const { data: incidents, isLoading: incidentsLoading, refetch: refetchIncidents } = useQuery<ServiceNowIncident[]>({
    queryKey: ["/api/sn/incidents"],
    enabled: health?.connected === true,
  });

  const fetchIncidentsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/sn/incidents");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sn/incidents"] });
      toast({
        title: "Incidents fetched",
        description: "Latest incidents have been loaded from ServiceNow.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch incidents.",
        variant: "destructive",
      });
    },
  });

  const pullIncidentsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/sn/sync/pull", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({
        title: "Incidents imported",
        description: "ServiceNow incidents have been imported as local tickets.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Import failed",
        description: error.message || "Failed to import incidents.",
        variant: "destructive",
      });
    },
  });

  const { data: syncedUsers, isLoading: usersLoading, refetch: refetchUsers } = useQuery<SyncedUser[]>({
    queryKey: ["/api/sn/users"],
    enabled: health?.connected === true,
  });

  const { data: syncedGroups, isLoading: groupsLoading, refetch: refetchGroups } = useQuery<SyncedGroup[]>({
    queryKey: ["/api/sn/groups"],
    enabled: health?.connected === true,
  });

  const syncUsersMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/sn/sync/users", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sn/users"] });
      toast({
        title: "Users synced",
        description: "Users have been synced from ServiceNow.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync failed",
        description: error.message || "Failed to sync users.",
        variant: "destructive",
      });
    },
  });

  const syncGroupsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/sn/sync/groups", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sn/groups"] });
      toast({
        title: "Groups synced",
        description: "Assignment groups have been synced from ServiceNow.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync failed",
        description: error.message || "Failed to sync groups.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ServiceNow Integration</h1>
          <p className="text-muted-foreground">
            Manage incidents and sync with ServiceNow
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              Connection Status
            </CardTitle>
            {healthLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : health?.configured ? (
              health.connected ? (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                  <XCircle className="h-3 w-3 mr-1" />
                  Connection Error
                </Badge>
              )
            ) : (
              <Badge variant="secondary">
                <CloudOff className="h-3 w-3 mr-1" />
                Not Configured
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {healthLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          ) : !health?.configured ? (
            <div className="text-center py-8">
              <CloudOff className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">ServiceNow Not Configured</h3>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                To connect to ServiceNow, you need to set the following environment variables:
              </p>
              <div className="mt-4 text-left max-w-sm mx-auto bg-muted/50 rounded-md p-4 font-mono text-sm">
                <p>SN_INSTANCE_URL</p>
                <p>SN_AUTH_TYPE (basic or oauth)</p>
                <p className="text-muted-foreground mt-2"># For Basic Auth:</p>
                <p>SN_USERNAME</p>
                <p>SN_PASSWORD</p>
                <p className="text-muted-foreground mt-2"># For OAuth:</p>
                <p>SN_CLIENT_ID</p>
                <p>SN_CLIENT_SECRET</p>
              </div>
              <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
                <Settings className="h-4 w-4" />
                <span>Configure these in your Replit Secrets</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Instance</p>
                  <p className="mt-1 font-mono text-sm truncate">{health.instanceUrl}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Auth Type</p>
                  <p className="mt-1 capitalize">{health.authType}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <p className="mt-1">
                    {health.connected ? (
                      <span className="text-green-600 dark:text-green-400">Ready</span>
                    ) : (
                      <span className="text-red-600 dark:text-red-400">{health.error}</span>
                    )}
                  </p>
                </div>
              </div>
              {health.error && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300">
                  <AlertCircle className="h-4 w-4 mt-0.5" />
                  <p className="text-sm">{health.error}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {health?.connected && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>ServiceNow Incidents</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchIncidents()}
                  disabled={incidentsLoading}
                  data-testid="button-refresh-incidents"
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${incidentsLoading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => pullIncidentsMutation.mutate()}
                  disabled={pullIncidentsMutation.isPending}
                  data-testid="button-import-incidents"
                >
                  {pullIncidentsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Import as Tickets
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {incidentsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            ) : incidents && incidents.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Number</TableHead>
                      <TableHead>Short Description</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incidents.map((incident) => (
                      <TableRow
                        key={incident.sys_id}
                        className="cursor-pointer hover-elevate"
                        onClick={() => setSelectedIncident(incident)}
                        data-testid={`incident-row-${incident.sys_id}`}
                      >
                        <TableCell className="font-mono">{incident.number}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {incident.short_description}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {stateLabels[incident.state] || incident.state}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={priorityColors[incident.priority] || ""}
                          >
                            {priorityLabels[incident.priority] || incident.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {incident.sys_updated_on
                            ? new Date(incident.sys_updated_on).toLocaleDateString()
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Cloud className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">No incidents found</h3>
                <p className="text-muted-foreground mt-1">
                  There are no incidents in your ServiceNow instance.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {health?.connected && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Users & Groups
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncUsersMutation.mutate()}
                  disabled={syncUsersMutation.isPending}
                  data-testid="button-sync-users"
                >
                  {syncUsersMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Sync Users
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncGroupsMutation.mutate()}
                  disabled={syncGroupsMutation.isPending}
                  data-testid="button-sync-groups"
                >
                  {syncGroupsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Sync Groups
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="users">
              <TabsList className="mb-4">
                <TabsTrigger value="users" data-testid="tab-users">
                  <Users className="h-4 w-4 mr-2" />
                  Users ({syncedUsers?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="groups" data-testid="tab-groups">
                  <Building2 className="h-4 w-4 mr-2" />
                  Groups ({syncedGroups?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="users">
                {usersLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4 p-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                    ))}
                  </div>
                ) : syncedUsers && syncedUsers.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Username</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {syncedUsers.map((user) => (
                          <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                            <TableCell className="font-medium">
                              {user.firstName} {user.lastName}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {user.username}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {user.email || "-"}
                            </TableCell>
                            <TableCell>{user.title || "-"}</TableCell>
                            <TableCell>{user.department || "-"}</TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={
                                  user.active
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                    : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                                }
                              >
                                {user.active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium">No users synced</h3>
                    <p className="text-muted-foreground mt-1">
                      Click "Sync Users" to import users from ServiceNow.
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="groups">
                {groupsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4 p-3">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-64" />
                      </div>
                    ))}
                  </div>
                ) : syncedGroups && syncedGroups.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {syncedGroups.map((group) => (
                          <TableRow key={group.id} data-testid={`group-row-${group.id}`}>
                            <TableCell className="font-medium">{group.name}</TableCell>
                            <TableCell className="text-muted-foreground max-w-xs truncate">
                              {group.description || "-"}
                            </TableCell>
                            <TableCell>{group.email || "-"}</TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={
                                  group.active
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                    : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                                }
                              >
                                {group.active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium">No groups synced</h3>
                    <p className="text-muted-foreground mt-1">
                      Click "Sync Groups" to import assignment groups from ServiceNow.
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      <IncidentDetailModal
        incident={selectedIncident}
        open={!!selectedIncident}
        onClose={() => setSelectedIncident(null)}
      />
    </div>
  );
}
