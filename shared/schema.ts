import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  role: text("role").notNull().default("user"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  role: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const tickets = pgTable("tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("open"),
  priority: text("priority").notNull().default("medium"),
  category: text("category"),
  predictedCategory: text("predicted_category"),
  predictedPriority: text("predicted_priority"),
  aiSuggestions: text("ai_suggestions"),
  requesterEmail: text("requester_email"),
  assignedTo: varchar("assigned_to"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  snSysId: text("sn_sys_id"),
  snNumber: text("sn_number"),
  snLastSyncAt: timestamp("sn_last_sync_at"),
  snSyncStatus: text("sn_sync_status"),
  snLastError: text("sn_last_error"),
});

export const insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof tickets.$inferSelect;

export const priorityValues = ["low", "medium", "high", "urgent"] as const;
export const statusValues = ["open", "in_progress", "pending", "resolved", "closed"] as const;
export const categoryValues = ["software", "hardware", "network", "security", "other"] as const;
export const roleValues = ["user", "agent", "admin"] as const;
export const snSyncStatusValues = ["ok", "failed", "pending"] as const;

export const ticketFormSchema = z.object({
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  priority: z.enum(priorityValues),
  category: z.enum(categoryValues).optional(),
  requesterEmail: z.string().email().optional().or(z.literal("")),
});

export type TicketFormData = z.infer<typeof ticketFormSchema>;

export interface ServiceNowIncident {
  sys_id: string;
  number: string;
  short_description: string;
  description: string;
  state: string;
  priority: string;
  category: string;
  caller_id: string;
  assignment_group: string;
  sys_updated_on: string;
  sys_created_on: string;
}

export interface ServiceNowHealthStatus {
  configured: boolean;
  connected: boolean;
  authType: string | null;
  instanceUrl: string | null;
  error: string | null;
}

// AI Chat types for ticket troubleshooting
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface TroubleshootingRequest {
  ticketId: string;
  message: string;
  history: { role: "user" | "assistant"; content: string }[];
}
