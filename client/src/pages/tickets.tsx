import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Ticket,
  Plus,
  Search,
  Filter,
  Cloud,
  ExternalLink,
} from "lucide-react";
import type { Ticket as TicketType } from "@shared/schema";

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

function TicketTableRow({ ticket }: { ticket: TicketType }) {
  const createdDate = ticket.createdAt
    ? new Date(ticket.createdAt).toLocaleDateString()
    : "N/A";

  return (
    <TableRow
      className="cursor-pointer hover-elevate"
      data-testid={`ticket-row-${ticket.id}`}
    >
      <TableCell>
        <Link href={`/tickets/${ticket.id}`}>
          <span className="font-medium hover:underline">{ticket.subject}</span>
        </Link>
      </TableCell>
      <TableCell>
        <Badge
          variant="secondary"
          className={`${statusColors[ticket.status as keyof typeof statusColors]}`}
        >
          {ticket.status.replace("_", " ")}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge
          variant="secondary"
          className={`${priorityColors[ticket.priority as keyof typeof priorityColors]}`}
        >
          {ticket.priority}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {ticket.category || "-"}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {ticket.requesterEmail || "-"}
      </TableCell>
      <TableCell className="text-muted-foreground">{createdDate}</TableCell>
      <TableCell>
        {ticket.snNumber ? (
          <div className="flex items-center gap-1">
            <Cloud className="h-3 w-3 text-green-500" />
            <span className="text-xs">{ticket.snNumber}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </TableCell>
    </TableRow>
  );
}

export default function TicketsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const { data: tickets, isLoading } = useQuery<TicketType[]>({
    queryKey: ["/api/tickets"],
  });

  const filteredTickets = tickets?.filter((ticket) => {
    const matchesSearch =
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.requesterEmail?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || ticket.status === statusFilter;
    const matchesPriority =
      priorityFilter === "all" || ticket.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tickets</h1>
          <p className="text-muted-foreground">
            Manage and track all support tickets
          </p>
        </div>
        <Link href="/tickets/new">
          <Button data-testid="button-create-ticket">
            <Plus className="h-4 w-4 mr-2" />
            Create Ticket
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-tickets"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger
                  className="w-[140px]"
                  data-testid="select-status-filter"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger
                  className="w-[140px]"
                  data-testid="select-priority-filter"
                >
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : filteredTickets && filteredTickets.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>ServiceNow</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((ticket) => (
                    <TicketTableRow key={ticket.id} ticket={ticket} />
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Ticket className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No tickets found</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery || statusFilter !== "all" || priorityFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Get started by creating your first ticket"}
              </p>
              {!searchQuery && statusFilter === "all" && priorityFilter === "all" && (
                <Link href="/tickets/new">
                  <Button className="mt-4" data-testid="button-create-first-ticket">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Ticket
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
