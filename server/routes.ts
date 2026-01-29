import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { snClient } from "./servicenow-client";
import { ticketFormSchema } from "@shared/schema";
import { z } from "zod";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // =====================
  // Ticket Routes
  // =====================
  
  app.get("/api/tickets", async (req, res) => {
    try {
      const tickets = await storage.getTickets();
      res.json(tickets);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      res.status(500).json({ error: "Failed to fetch tickets" });
    }
  });

  app.get("/api/tickets/:id", async (req, res) => {
    try {
      const ticket = await storage.getTicket(req.params.id);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }
      res.json(ticket);
    } catch (error) {
      console.error("Error fetching ticket:", error);
      res.status(500).json({ error: "Failed to fetch ticket" });
    }
  });

  app.post("/api/tickets", async (req, res) => {
    try {
      const validatedData = ticketFormSchema.parse(req.body);
      
      const aiSuggestions = generateAISuggestions(
        validatedData.subject,
        validatedData.description
      );
      const predictedCategory = predictCategory(validatedData.description);
      const predictedPriority = predictPriority(validatedData.description);

      const ticket = await storage.createTicket({
        ...validatedData,
        status: "open",
        aiSuggestions,
        predictedCategory,
        predictedPriority,
      });

      res.status(201).json(ticket);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating ticket:", error);
      res.status(500).json({ error: "Failed to create ticket" });
    }
  });

  app.patch("/api/tickets/:id", async (req, res) => {
    try {
      const ticket = await storage.updateTicket(req.params.id, req.body);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }
      res.json(ticket);
    } catch (error) {
      console.error("Error updating ticket:", error);
      res.status(500).json({ error: "Failed to update ticket" });
    }
  });

  app.delete("/api/tickets/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteTicket(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Ticket not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting ticket:", error);
      res.status(500).json({ error: "Failed to delete ticket" });
    }
  });

  // =====================
  // ServiceNow Routes
  // =====================

  app.get("/api/sn/health", async (req, res) => {
    try {
      const health = await snClient.checkHealth();
      res.json(health);
    } catch (error) {
      console.error("Error checking ServiceNow health:", error);
      res.json({
        configured: false,
        connected: false,
        authType: null,
        instanceUrl: null,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.get("/api/sn/incidents", async (req, res) => {
    try {
      if (!snClient.isConfigured()) {
        return res.status(503).json({ 
          error: "ServiceNow is not configured" 
        });
      }

      const limit = parseInt(req.query.limit as string) || 25;
      const query = req.query.query as string | undefined;
      const state = req.query.state as string | undefined;

      const incidents = await snClient.getIncidents({ limit, query, state });
      res.json(incidents);
    } catch (error) {
      console.error("Error fetching ServiceNow incidents:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to fetch incidents" 
      });
    }
  });

  app.get("/api/sn/incidents/:sysId", async (req, res) => {
    try {
      if (!snClient.isConfigured()) {
        return res.status(503).json({ 
          error: "ServiceNow is not configured" 
        });
      }

      const incident = await snClient.getIncident(req.params.sysId);
      res.json(incident);
    } catch (error) {
      console.error("Error fetching ServiceNow incident:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to fetch incident" 
      });
    }
  });

  app.post("/api/sn/incidents/create-from-ticket/:ticketId", async (req, res) => {
    try {
      if (!snClient.isConfigured()) {
        return res.status(503).json({ 
          error: "ServiceNow is not configured" 
        });
      }

      const ticket = await storage.getTicket(req.params.ticketId);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      if (ticket.snSysId) {
        return res.status(400).json({ 
          error: "Ticket is already linked to a ServiceNow incident" 
        });
      }

      let description = ticket.description;
      if (ticket.aiSuggestions) {
        description += `\n\n--- AI Suggestions ---\n${ticket.aiSuggestions}`;
      }
      description += `\n\n[Copilot Ticket ID: ${ticket.id}]`;

      const snPriority = snClient.mapLocalPriorityToSn(ticket.priority);

      const incident = await snClient.createIncident({
        short_description: ticket.subject,
        description,
        priority: snPriority,
        category: ticket.category || "software",
        work_notes: `Created from Smart IT Copilot. Ticket ID: ${ticket.id}`,
      });

      const updatedTicket = await storage.updateTicket(ticket.id, {
        snSysId: incident.sys_id,
        snNumber: incident.number,
        snLastSyncAt: new Date(),
        snSyncStatus: "ok",
        snLastError: null,
      });

      res.status(201).json({
        ticket: updatedTicket,
        incident,
      });
    } catch (error) {
      console.error("Error creating ServiceNow incident:", error);
      
      if (req.params.ticketId) {
        await storage.updateTicket(req.params.ticketId, {
          snSyncStatus: "failed",
          snLastError: error instanceof Error ? error.message : "Unknown error",
        });
      }

      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to create incident" 
      });
    }
  });

  app.patch("/api/sn/incidents/:sysId/sync-ticket/:ticketId", async (req, res) => {
    try {
      if (!snClient.isConfigured()) {
        return res.status(503).json({ 
          error: "ServiceNow is not configured" 
        });
      }

      const ticket = await storage.getTicket(req.params.ticketId);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      const snState = snClient.mapLocalStatusToSnState(ticket.status);

      const updateData: Record<string, string> = {
        state: snState,
        work_notes: `Status updated from Smart IT Copilot to: ${ticket.status}`,
      };

      const incident = await snClient.updateIncident(req.params.sysId, updateData);

      const updatedTicket = await storage.updateTicket(ticket.id, {
        snLastSyncAt: new Date(),
        snSyncStatus: "ok",
        snLastError: null,
      });

      res.json({
        ticket: updatedTicket,
        incident,
      });
    } catch (error) {
      console.error("Error syncing to ServiceNow:", error);
      
      if (req.params.ticketId) {
        await storage.updateTicket(req.params.ticketId, {
          snSyncStatus: "failed",
          snLastError: error instanceof Error ? error.message : "Unknown error",
        });
      }

      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to sync incident" 
      });
    }
  });

  app.post("/api/sn/sync/pull", async (req, res) => {
    try {
      if (!snClient.isConfigured()) {
        return res.status(503).json({ 
          error: "ServiceNow is not configured" 
        });
      }

      const incidents = await snClient.getIncidents({ limit: 50 });
      const imported: string[] = [];
      const skipped: string[] = [];

      for (const incident of incidents) {
        const existing = await storage.getTicketBySnSysId(incident.sys_id);
        
        if (existing) {
          skipped.push(incident.number);
          continue;
        }

        const localPriority = snClient.mapSnPriorityToLocal(incident.priority);
        const localStatus = snClient.mapSnStateToLocalStatus(incident.state);

        await storage.createTicket({
          subject: incident.short_description,
          description: incident.description || "",
          status: localStatus,
          priority: localPriority,
          category: incident.category || "other",
          snSysId: incident.sys_id,
          snNumber: incident.number,
          snLastSyncAt: new Date(),
          snSyncStatus: "ok",
        });

        imported.push(incident.number);
      }

      res.json({
        message: `Imported ${imported.length} incidents, skipped ${skipped.length} existing`,
        imported,
        skipped,
      });
    } catch (error) {
      console.error("Error pulling ServiceNow incidents:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to pull incidents" 
      });
    }
  });

  // =====================
  // AI Troubleshooting Chat
  // =====================

  app.post("/api/tickets/:id/chat", async (req, res) => {
    try {
      const ticket = await storage.getTicket(req.params.id);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      const { message, history = [] } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const systemPrompt = `You are a friendly and helpful IT support assistant called Smart IT Copilot. Your job is to help users troubleshoot their IT issues step by step.

TICKET CONTEXT:
- Subject: ${ticket.subject}
- Description: ${ticket.description}
- Category: ${ticket.category || "Not specified"}
- Priority: ${ticket.priority}
- Status: ${ticket.status}
${ticket.aiSuggestions ? `- Initial AI Suggestions: ${ticket.aiSuggestions}` : ""}

INSTRUCTIONS:
1. Provide clear, simple, step-by-step instructions that anyone can follow
2. Use numbered steps for troubleshooting procedures
3. Ask follow-up questions if you need more information
4. Use simple, non-technical language whenever possible
5. If a step doesn't work, offer alternative solutions
6. Be encouraging and patient
7. Keep responses concise but thorough

Remember: The user may not be technical, so explain things in everyday terms.`;

      const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
        { role: "system", content: systemPrompt },
        ...history.map((msg: { role: string; content: string }) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        })),
        { role: "user", content: message },
      ];

      const stream = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: chatMessages,
        stream: true,
        max_completion_tokens: 2048,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true, fullResponse })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error in AI chat:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "AI chat failed. Please try again." })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to process chat message" });
      }
    }
  });

  return httpServer;
}

function generateAISuggestions(subject: string, description: string): string {
  const text = `${subject} ${description}`.toLowerCase();
  const suggestions: string[] = [];

  if (text.includes("email") || text.includes("outlook") || text.includes("mail")) {
    suggestions.push("Check email server connectivity and authentication settings");
    suggestions.push("Verify the user's credentials haven't expired");
    suggestions.push("Clear email client cache and reconfigure if needed");
  }
  
  if (text.includes("password") || text.includes("login") || text.includes("access")) {
    suggestions.push("Reset user password through Active Directory");
    suggestions.push("Check for account lockout policies");
    suggestions.push("Verify MFA/2FA configuration");
  }
  
  if (text.includes("printer") || text.includes("print")) {
    suggestions.push("Check printer network connectivity");
    suggestions.push("Verify print spooler service is running");
    suggestions.push("Clear print queue and restart printer");
  }
  
  if (text.includes("vpn") || text.includes("remote") || text.includes("connection")) {
    suggestions.push("Check VPN client version and update if needed");
    suggestions.push("Verify network firewall rules");
    suggestions.push("Test with different network to rule out ISP issues");
  }
  
  if (text.includes("slow") || text.includes("performance") || text.includes("freeze")) {
    suggestions.push("Check system resource usage (CPU, RAM, Disk)");
    suggestions.push("Run disk cleanup and defragmentation");
    suggestions.push("Check for pending Windows updates");
  }

  if (suggestions.length === 0) {
    suggestions.push("Gather more information about the issue");
    suggestions.push("Check if other users are experiencing similar issues");
    suggestions.push("Review recent changes to the system");
  }

  return suggestions.map((s, i) => `${i + 1}. ${s}`).join("\n");
}

function predictCategory(description: string): string {
  const text = description.toLowerCase();
  
  if (text.includes("email") || text.includes("software") || text.includes("application") || 
      text.includes("app") || text.includes("install") || text.includes("license")) {
    return "software";
  }
  
  if (text.includes("printer") || text.includes("hardware") || text.includes("monitor") || 
      text.includes("keyboard") || text.includes("mouse") || text.includes("laptop")) {
    return "hardware";
  }
  
  if (text.includes("vpn") || text.includes("network") || text.includes("wifi") || 
      text.includes("internet") || text.includes("connection")) {
    return "network";
  }
  
  if (text.includes("phishing") || text.includes("suspicious") || text.includes("security") || 
      text.includes("virus") || text.includes("malware") || text.includes("hack")) {
    return "security";
  }
  
  return "other";
}

function predictPriority(description: string): string {
  const text = description.toLowerCase();
  
  if (text.includes("urgent") || text.includes("critical") || text.includes("down") || 
      text.includes("not working") || text.includes("security") || text.includes("breach")) {
    return "urgent";
  }
  
  if (text.includes("multiple users") || text.includes("team") || text.includes("important") ||
      text.includes("deadline") || text.includes("asap")) {
    return "high";
  }
  
  if (text.includes("when possible") || text.includes("low priority") || 
      text.includes("minor") || text.includes("nice to have")) {
    return "low";
  }
  
  return "medium";
}
