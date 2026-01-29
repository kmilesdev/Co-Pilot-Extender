import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Ticket,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Cloud,
  CloudOff,
} from "lucide-react";
import type { Ticket as TicketType, ServiceNowHealthStatus } from "@shared/schema";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  trend?: { value: number; positive: boolean };
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-1" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            {trend && (
              <span
                className={
                  trend.positive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                }
              >
                <TrendingUp
                  className={`h-3 w-3 inline ${!trend.positive ? "rotate-180" : ""}`}
                />
                {trend.value}%
              </span>
            )}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function RecentTicketRow({ ticket }: { ticket: TicketType }) {
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

  return (
    <Link href={`/tickets/${ticket.id}`}>
      <div
        className="flex items-center justify-between p-3 rounded-md hover-elevate cursor-pointer border border-transparent hover:border-border"
        data-testid={`ticket-row-${ticket.id}`}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{ticket.subject}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {ticket.requesterEmail || "No requester"}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <Badge
            variant="secondary"
            className={`text-[10px] ${priorityColors[ticket.priority as keyof typeof priorityColors]}`}
          >
            {ticket.priority}
          </Badge>
          <Badge
            variant="secondary"
            className={`text-[10px] ${statusColors[ticket.status as keyof typeof statusColors]}`}
          >
            {ticket.status.replace("_", " ")}
          </Badge>
        </div>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { data: tickets, isLoading: ticketsLoading } = useQuery<TicketType[]>({
    queryKey: ["/api/tickets"],
  });

  const { data: snHealth, isLoading: snLoading } = useQuery<ServiceNowHealthStatus>({
    queryKey: ["/api/sn/health"],
  });

  const openTickets = tickets?.filter((t) => t.status === "open").length || 0;
  const inProgressTickets = tickets?.filter((t) => t.status === "in_progress").length || 0;
  const resolvedToday = tickets?.filter((t) => {
    if (t.status !== "resolved" || !t.updatedAt) return false;
    const today = new Date();
    const updated = new Date(t.updatedAt);
    return (
      updated.getDate() === today.getDate() &&
      updated.getMonth() === today.getMonth() &&
      updated.getFullYear() === today.getFullYear()
    );
  }).length || 0;

  const recentTickets = tickets?.slice(0, 5) || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's an overview of your IT support.
          </p>
        </div>
        <Link href="/tickets/new">
          <Button data-testid="button-new-ticket">
            <Ticket className="h-4 w-4 mr-2" />
            New Ticket
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Open Tickets"
          value={openTickets}
          icon={AlertCircle}
          description="Awaiting response"
          loading={ticketsLoading}
        />
        <StatCard
          title="In Progress"
          value={inProgressTickets}
          icon={Clock}
          description="Being worked on"
          loading={ticketsLoading}
        />
        <StatCard
          title="Resolved Today"
          value={resolvedToday}
          icon={CheckCircle}
          description="Great progress!"
          trend={{ value: 12, positive: true }}
          loading={ticketsLoading}
        />
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ServiceNow
            </CardTitle>
            {snLoading ? (
              <Skeleton className="h-4 w-4" />
            ) : snHealth?.connected ? (
              <Cloud className="h-4 w-4 text-green-500" />
            ) : (
              <CloudOff className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            {snLoading ? (
              <>
                <Skeleton className="h-6 w-24 mb-1" />
                <Skeleton className="h-3 w-32" />
              </>
            ) : snHealth?.configured ? (
              <>
                <div className="text-lg font-semibold">
                  {snHealth.connected ? (
                    <span className="text-green-600 dark:text-green-400">Connected</span>
                  ) : (
                    <span className="text-red-600 dark:text-red-400">Error</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {snHealth.authType === "oauth" ? "OAuth" : "Basic"} auth
                </p>
              </>
            ) : (
              <>
                <div className="text-lg font-semibold text-muted-foreground">
                  Not Configured
                </div>
                <p className="text-xs text-muted-foreground">
                  Set up in ServiceNow page
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Tickets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {ticketsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="h-4 w-4" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-48 mb-1" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))
            ) : recentTickets.length > 0 ? (
              recentTickets.map((ticket) => (
                <RecentTicketRow key={ticket.id} ticket={ticket} />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Ticket className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No tickets yet</p>
                <Link href="/tickets/new">
                  <Button variant="link" size="sm" className="mt-2">
                    Create your first ticket
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">AI Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Ticket Volume Trend</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {tickets?.length || 0} total tickets in the system
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Priority Distribution</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {tickets?.filter((t) => t.priority === "urgent" || t.priority === "high").length || 0} high priority tickets need attention
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                  <CheckCircle className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Resolution Rate</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    AI suggestions help resolve tickets faster
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
