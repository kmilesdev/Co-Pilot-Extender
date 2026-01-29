import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ticketFormSchema, type TicketFormData } from "@shared/schema";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { Link } from "wouter";

export default function NewTicketPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const form = useForm<TicketFormData>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      subject: "",
      description: "",
      priority: "medium",
      category: undefined,
      requesterEmail: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: TicketFormData) => {
      const response = await apiRequest("POST", "/api/tickets", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({
        title: "Ticket created",
        description: "Your ticket has been submitted successfully.",
      });
      navigate(`/tickets/${data.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create ticket. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TicketFormData) => {
    createMutation.mutate(data);
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/tickets">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create New Ticket</h1>
          <p className="text-muted-foreground">
            Submit a new support request
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ticket Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Brief description of the issue"
                        {...field}
                        data-testid="input-subject"
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
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Provide detailed information about your issue..."
                        className="min-h-[150px] resize-none"
                        {...field}
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormDescription>
                      Include steps to reproduce, error messages, and any relevant details.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-priority">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="software">Software</SelectItem>
                          <SelectItem value="hardware">Hardware</SelectItem>
                          <SelectItem value="network">Network</SelectItem>
                          <SelectItem value="security">Security</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="requesterEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Email (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="your.email@company.com"
                        {...field}
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormDescription>
                      We'll use this to notify you of updates.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center gap-3 p-4 rounded-md bg-primary/5 border border-primary/20">
                <Sparkles className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">AI-Powered Analysis</p>
                  <p className="text-xs text-muted-foreground">
                    Our AI will analyze your ticket and provide helpful suggestions.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Link href="/tickets">
                  <Button variant="outline" type="button" data-testid="button-cancel">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-submit"
                >
                  {createMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Create Ticket
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
