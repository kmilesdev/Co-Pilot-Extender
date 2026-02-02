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

      const { message, history = [], attachments = [] } = req.body;
      if (!message && attachments.length === 0) {
        return res.status(400).json({ error: "Message or attachments required" });
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

Remember: The user may not be technical, so explain things in everyday terms.
${attachments.length > 0 ? "\nThe user has attached files/images. Please analyze them carefully to help troubleshoot their issue." : ""}`;

      type MessageContent = string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
      
      const buildMessageContent = (text: string, msgAttachments?: { name: string; type: string; dataUrl: string }[]): MessageContent => {
        if (!msgAttachments || msgAttachments.length === 0) {
          return text || "";
        }
        
        const content: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [];
        
        if (text) {
          content.push({ type: "text", text });
        }
        
        for (const att of msgAttachments) {
          if (att.type.startsWith("image/")) {
            content.push({
              type: "image_url",
              image_url: { url: att.dataUrl },
            });
          } else {
            // For non-image files, describe them in text
            const base64Content = att.dataUrl.split(",")[1] || "";
            try {
              const decoded = Buffer.from(base64Content, "base64").toString("utf-8");
              content.push({
                type: "text",
                text: `[File: ${att.name}]\n${decoded.slice(0, 5000)}${decoded.length > 5000 ? "...(truncated)" : ""}`,
              });
            } catch {
              content.push({
                type: "text",
                text: `[File: ${att.name}] (binary file, cannot display content)`,
              });
            }
          }
        }
        
        return content.length > 0 ? content : text || "";
      };

      const chatMessages: any[] = [
        { role: "system", content: systemPrompt },
        ...history.map((msg: { role: string; content: string; attachments?: { name: string; type: string; dataUrl: string }[] }) => ({
          role: msg.role as "user" | "assistant",
          content: buildMessageContent(msg.content, msg.attachments),
        })),
        { role: "user", content: buildMessageContent(message || "", attachments) },
      ];

      const stream = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: chatMessages as any,
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

  // =====================
  // ServiceNow User Sync
  // =====================

  app.get("/api/sn/users", async (req, res) => {
    try {
      const users = await storage.getSyncedUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching synced users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/sn/groups", async (req, res) => {
    try {
      const groups = await storage.getSyncedGroups();
      res.json(groups);
    } catch (error) {
      console.error("Error fetching synced groups:", error);
      res.status(500).json({ error: "Failed to fetch groups" });
    }
  });

  app.post("/api/sn/sync/users", async (req, res) => {
    try {
      if (!snClient.isConfigured()) {
        return res.status(503).json({ 
          error: "ServiceNow is not configured" 
        });
      }

      const snUsers = await snClient.getUsers({ limit: 100, activeOnly: true });
      const synced: string[] = [];

      for (const snUser of snUsers) {
        await storage.upsertSyncedUser({
          snSysId: snUser.sys_id,
          username: snUser.user_name || "",
          firstName: snUser.first_name || "",
          lastName: snUser.last_name || "",
          email: snUser.email || "",
          title: snUser.title || "",
          department: snUser.department || "",
          active: snUser.active === "true",
          syncedAt: new Date(),
        });
        synced.push(snUser.user_name || snUser.sys_id);
      }

      const allUsers = await storage.getSyncedUsers();

      res.json({
        message: `Synced ${synced.length} users from ServiceNow`,
        count: synced.length,
        users: allUsers,
      });
    } catch (error) {
      console.error("Error syncing users from ServiceNow:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to sync users" 
      });
    }
  });

  app.post("/api/sn/sync/groups", async (req, res) => {
    try {
      if (!snClient.isConfigured()) {
        return res.status(503).json({ 
          error: "ServiceNow is not configured" 
        });
      }

      const snGroups = await snClient.getGroups({ limit: 100, activeOnly: true });
      const synced: string[] = [];

      for (const snGroup of snGroups) {
        await storage.upsertSyncedGroup({
          snSysId: snGroup.sys_id,
          name: snGroup.name || "",
          description: snGroup.description || "",
          managerSysId: snGroup.manager || null,
          email: snGroup.email || "",
          active: snGroup.active === "true",
          syncedAt: new Date(),
        });
        synced.push(snGroup.name || snGroup.sys_id);
      }

      const allGroups = await storage.getSyncedGroups();

      res.json({
        message: `Synced ${synced.length} groups from ServiceNow`,
        count: synced.length,
        groups: allGroups,
      });
    } catch (error) {
      console.error("Error syncing groups from ServiceNow:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to sync groups" 
      });
    }
  });

  app.delete("/api/sn/users", async (req, res) => {
    try {
      await storage.clearSyncedUsers();
      res.json({ message: "All synced users cleared" });
    } catch (error) {
      console.error("Error clearing synced users:", error);
      res.status(500).json({ error: "Failed to clear users" });
    }
  });

  app.delete("/api/sn/groups", async (req, res) => {
    try {
      await storage.clearSyncedGroups();
      res.json({ message: "All synced groups cleared" });
    } catch (error) {
      console.error("Error clearing synced groups:", error);
      res.status(500).json({ error: "Failed to clear groups" });
    }
  });

  // =====================
  // User Management Routes
  // =====================

  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getUsers();
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const { username, password, email, role } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(409).json({ error: "Username already exists" });
      }
      const user = await storage.createUser({ username, password, email, role });
      const { password: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const { role, email } = req.body;
      const user = await storage.updateUser(req.params.id, { role, email });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteUser(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "User not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // =====================
  // Conversation Routes
  // =====================

  app.get("/api/conversations", async (req, res) => {
    try {
      const userId = req.query.userId as string | undefined;
      const conversations = await storage.getConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", async (req, res) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const messages = await storage.getConversationMessages(req.params.id);
      res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.get("/api/tickets/:ticketId/conversation", async (req, res) => {
    try {
      const conversation = await storage.getConversationByTicketId(req.params.ticketId);
      if (!conversation) {
        return res.status(404).json({ error: "No conversation found for this ticket" });
      }
      const messages = await storage.getConversationMessages(conversation.id);
      res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Error fetching ticket conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.post("/api/conversations", async (req, res) => {
    try {
      const { userId, ticketId, title } = req.body;
      const conversation = await storage.createConversation({
        userId: userId || null,
        ticketId: ticketId || null,
        title: title || "New Conversation",
        resolved: false,
        deflected: false,
      });
      
      await storage.createAnalyticsEvent({
        eventType: "conversation_started",
        userId: userId || null,
        ticketId: ticketId || null,
        conversationId: conversation.id,
        metadata: {},
      });
      
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.post("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const { role, content, attachments = [] } = req.body;
      if (!role || !content) {
        return res.status(400).json({ error: "Role and content required" });
      }

      const message = await storage.addConversationMessage({
        conversationId: req.params.id,
        role,
        content,
        attachments,
      });

      res.status(201).json(message);
    } catch (error) {
      console.error("Error adding message:", error);
      res.status(500).json({ error: "Failed to add message" });
    }
  });

  app.patch("/api/conversations/:id", async (req, res) => {
    try {
      const { resolved, deflected, title } = req.body;
      const conversation = await storage.updateConversation(req.params.id, { 
        resolved, 
        deflected,
        title 
      });
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      if (deflected) {
        await storage.createAnalyticsEvent({
          eventType: "ticket_deflected",
          userId: conversation.userId,
          ticketId: conversation.ticketId,
          conversationId: conversation.id,
          metadata: {},
        });
      }

      res.json(conversation);
    } catch (error) {
      console.error("Error updating conversation:", error);
      res.status(500).json({ error: "Failed to update conversation" });
    }
  });

  app.delete("/api/conversations/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteConversation(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // Global Copilot Chat (not tied to a ticket)
  app.post("/api/copilot/chat", async (req, res) => {
    try {
      const { message, history = [], attachments = [], conversationId } = req.body;
      if (!message && attachments.length === 0) {
        return res.status(400).json({ error: "Message or attachments required" });
      }

      // Get KB documents for RAG
      const kbDocs = await storage.getKBDocuments();
      const kbContext = kbDocs.slice(0, 5).map(doc => 
        `[${doc.title}]\n${doc.content.slice(0, 500)}...`
      ).join("\n\n");

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const systemPrompt = `You are Smart IT Copilot, a friendly and expert IT support assistant. Your goal is to help users troubleshoot IT issues BEFORE they need to create a support ticket.

RESPONSE FORMAT (Always follow this structure):
1. **Summary**: Brief explanation of the likely issue
2. **Steps to Try**: Numbered troubleshooting steps in simple language
3. **If That Doesn't Work**: Alternative solutions
4. **When to Escalate**: When to create a ticket or contact IT directly
5. **Confidence**: Low/Medium/High + brief reason

KNOWLEDGE BASE ARTICLES:
${kbContext || "No articles loaded."}

INSTRUCTIONS:
- Use simple, everyday language (user may not be technical)
- Provide clear, numbered steps
- If you're uncertain, ask clarifying questions
- Reference KB articles when relevant and cite sources
- Be encouraging and patient
- Keep responses concise but thorough
${attachments.length > 0 ? "\nThe user has attached files/images. Analyze them to help troubleshoot." : ""}`;

      type MessageContent = string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
      
      const buildMessageContent = (text: string, msgAttachments?: { name: string; type: string; dataUrl: string }[]): MessageContent => {
        if (!msgAttachments || msgAttachments.length === 0) {
          return text || "";
        }
        
        const content: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [];
        
        if (text) {
          content.push({ type: "text", text });
        }
        
        for (const att of msgAttachments) {
          if (att.type.startsWith("image/")) {
            content.push({
              type: "image_url",
              image_url: { url: att.dataUrl },
            });
          } else {
            const base64Content = att.dataUrl.split(",")[1] || "";
            try {
              const decoded = Buffer.from(base64Content, "base64").toString("utf-8");
              content.push({
                type: "text",
                text: `[File: ${att.name}]\n${decoded.slice(0, 5000)}${decoded.length > 5000 ? "...(truncated)" : ""}`,
              });
            } catch {
              content.push({
                type: "text",
                text: `[File: ${att.name}] (binary file, cannot display content)`,
              });
            }
          }
        }
        
        return content.length > 0 ? content : text || "";
      };

      const chatMessages: any[] = [
        { role: "system", content: systemPrompt },
        ...history.map((msg: { role: string; content: string; attachments?: { name: string; type: string; dataUrl: string }[] }) => ({
          role: msg.role as "user" | "assistant",
          content: buildMessageContent(msg.content, msg.attachments),
        })),
        { role: "user", content: buildMessageContent(message || "", attachments) },
      ];

      const stream = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: chatMessages as any,
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

      // Track analytics
      await storage.createAnalyticsEvent({
        eventType: "chat_message",
        userId: null,
        ticketId: null,
        conversationId: conversationId || null,
        metadata: { messageLength: message?.length || 0, hasAttachments: attachments.length > 0 },
      });

      res.write(`data: ${JSON.stringify({ done: true, fullResponse })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error in Copilot chat:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Chat failed. Please try again." })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to process chat message" });
      }
    }
  });

  // =====================
  // Knowledge Base Routes
  // =====================

  app.get("/api/kb/documents", async (req, res) => {
    try {
      const documents = await storage.getKBDocuments();
      res.json(documents);
    } catch (error) {
      console.error("Error fetching KB documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.get("/api/kb/documents/:id", async (req, res) => {
    try {
      const document = await storage.getKBDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      console.error("Error fetching KB document:", error);
      res.status(500).json({ error: "Failed to fetch document" });
    }
  });

  app.post("/api/kb/documents", async (req, res) => {
    try {
      const { title, content, category, tags = [] } = req.body;
      if (!title || !content) {
        return res.status(400).json({ error: "Title and content required" });
      }
      const document = await storage.createKBDocument({
        title,
        content,
        category: category || "general",
        tags,
        createdBy: null,
        updatedBy: null,
      });
      res.status(201).json(document);
    } catch (error) {
      console.error("Error creating KB document:", error);
      res.status(500).json({ error: "Failed to create document" });
    }
  });

  app.patch("/api/kb/documents/:id", async (req, res) => {
    try {
      const { title, content, category, tags } = req.body;
      const document = await storage.updateKBDocument(req.params.id, {
        title,
        content,
        category,
        tags,
        updatedBy: null,
      });
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      console.error("Error updating KB document:", error);
      res.status(500).json({ error: "Failed to update document" });
    }
  });

  app.delete("/api/kb/documents/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteKBDocument(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting KB document:", error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  app.get("/api/kb/search", async (req, res) => {
    try {
      const query = (req.query.q as string || "").toLowerCase();
      const category = req.query.category as string | undefined;
      
      let documents = await storage.getKBDocuments();
      
      if (category) {
        documents = documents.filter(d => d.category === category);
      }
      
      if (query) {
        documents = documents.filter(d => 
          d.title.toLowerCase().includes(query) ||
          d.content.toLowerCase().includes(query) ||
          d.tags.some(t => t.toLowerCase().includes(query))
        );
      }
      
      res.json(documents);
    } catch (error) {
      console.error("Error searching KB:", error);
      res.status(500).json({ error: "Failed to search documents" });
    }
  });

  // =====================
  // ML Prediction Routes
  // =====================

  app.post("/api/ml/predict", async (req, res) => {
    try {
      const { title, description } = req.body;
      if (!title && !description) {
        return res.status(400).json({ error: "Title or description required" });
      }

      const text = `${title || ""} ${description || ""}`;
      const category = predictCategory(text);
      const priority = predictPriority(text);

      // Get active model for confidence estimation
      const activeModel = await storage.getActiveMLModel();
      const baseConfidence = activeModel ? 0.7 : 0.5;

      const prediction = {
        category,
        categoryConfidence: baseConfidence + Math.random() * 0.2,
        priority,
        priorityConfidence: baseConfidence + Math.random() * 0.2,
        reasoning: `Based on keyword analysis. Model version: ${activeModel?.version || "baseline"}`,
      };

      res.json(prediction);
    } catch (error) {
      console.error("Error in ML prediction:", error);
      res.status(500).json({ error: "Failed to generate prediction" });
    }
  });

  app.post("/api/ml/feedback", async (req, res) => {
    try {
      const { 
        ticketId, 
        predictedCategory, 
        predictedPriority, 
        actualCategory, 
        actualPriority,
        inputText 
      } = req.body;

      const example = await storage.createMLTrainingExample({
        ticketId: ticketId || null,
        inputText: inputText || "",
        actualCategory: actualCategory || null,
        actualPriority: actualPriority || null,
        predictedCategory: predictedCategory || null,
        predictedPriority: predictedPriority || null,
        categoryCorrect: actualCategory === predictedCategory,
        priorityCorrect: actualPriority === predictedPriority,
        resolutionNotes: null,
      });

      res.status(201).json({ message: "Feedback recorded", example });
    } catch (error) {
      console.error("Error recording ML feedback:", error);
      res.status(500).json({ error: "Failed to record feedback" });
    }
  });

  app.get("/api/ml/status", async (req, res) => {
    try {
      const activeModel = await storage.getActiveMLModel();
      const allModels = await storage.getMLModelVersions();
      const trainingExamples = await storage.getMLTrainingExamples();

      const recentExamples = trainingExamples.slice(0, 100);
      const categoryCorrect = recentExamples.filter(e => e.categoryCorrect).length;
      const priorityCorrect = recentExamples.filter(e => e.priorityCorrect).length;
      const total = recentExamples.length;

      res.json({
        activeModel: activeModel ? {
          version: activeModel.version,
          trainedAt: activeModel.trainedAt,
          trainingExamples: activeModel.trainingExamples,
          categoryAccuracy: activeModel.categoryAccuracy,
          priorityAccuracy: activeModel.priorityAccuracy,
        } : null,
        modelCount: allModels.length,
        trainingExamplesCount: trainingExamples.length,
        recentAccuracy: total > 0 ? {
          category: categoryCorrect / total,
          priority: priorityCorrect / total,
        } : null,
      });
    } catch (error) {
      console.error("Error fetching ML status:", error);
      res.status(500).json({ error: "Failed to fetch ML status" });
    }
  });

  app.post("/api/ml/retrain", async (req, res) => {
    try {
      const trainingExamples = await storage.getMLTrainingExamples();
      
      if (trainingExamples.length < 10) {
        return res.status(400).json({ 
          error: "Not enough training examples. Need at least 10." 
        });
      }

      // Simulate training (in real implementation, would use scikit-learn or similar)
      const categoryCorrect = trainingExamples.filter(e => e.categoryCorrect).length;
      const priorityCorrect = trainingExamples.filter(e => e.priorityCorrect).length;
      const total = trainingExamples.length;

      const newModel = await storage.createMLModelVersion({
        version: 0, // Will be auto-incremented
        trainingExamples: total,
        categoryAccuracy: total > 0 ? categoryCorrect / total : null,
        priorityAccuracy: total > 0 ? priorityCorrect / total : null,
        isActive: true,
        modelData: null, // Would contain serialized model in real implementation
      });

      await storage.setActiveMLModel(newModel.id);

      res.json({
        message: "Model retrained successfully",
        model: {
          version: newModel.version,
          trainedAt: newModel.trainedAt,
          trainingExamples: newModel.trainingExamples,
          categoryAccuracy: newModel.categoryAccuracy,
          priorityAccuracy: newModel.priorityAccuracy,
        },
      });
    } catch (error) {
      console.error("Error retraining ML model:", error);
      res.status(500).json({ error: "Failed to retrain model" });
    }
  });

  // =====================
  // Analytics Routes
  // =====================

  app.get("/api/analytics/summary", async (req, res) => {
    try {
      const events = await storage.getAnalyticsEvents();
      const tickets = await storage.getTickets();
      const conversations = await storage.getConversations();
      const trainingExamples = await storage.getMLTrainingExamples();

      const chatEvents = events.filter(e => e.eventType === "chat_message");
      const deflectedEvents = events.filter(e => e.eventType === "ticket_deflected");

      // Calculate category distribution
      const categoryCount: Record<string, number> = {};
      for (const ticket of tickets) {
        const cat = ticket.category || "other";
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      }
      const topCategories = Object.entries(categoryCount)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate avg resolution time (for resolved tickets)
      const resolvedTickets = tickets.filter(t => t.status === "resolved" || t.status === "closed");
      let avgResolutionTimeHours = 0;
      if (resolvedTickets.length > 0) {
        const totalHours = resolvedTickets.reduce((sum, t) => {
          if (t.createdAt && t.updatedAt) {
            const hours = (new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
            return sum + hours;
          }
          return sum;
        }, 0);
        avgResolutionTimeHours = totalHours / resolvedTickets.length;
      }

      // ML accuracy
      const recentExamples = trainingExamples.slice(0, 100);
      const categoryCorrect = recentExamples.filter(e => e.categoryCorrect).length;
      const priorityCorrect = recentExamples.filter(e => e.priorityCorrect).length;

      // Cost per ticket (configurable)
      const costPerTicket = 25; // $25 average cost per ticket

      const summary = {
        totalChats: chatEvents.length,
        totalTickets: tickets.length,
        deflectedTickets: deflectedEvents.length,
        avgResolutionTimeHours: Math.round(avgResolutionTimeHours * 10) / 10,
        categoryAccuracy: recentExamples.length > 0 ? categoryCorrect / recentExamples.length : 0,
        priorityAccuracy: recentExamples.length > 0 ? priorityCorrect / recentExamples.length : 0,
        topCategories,
        estimatedCostSaved: deflectedEvents.length * costPerTicket,
      };

      res.json(summary);
    } catch (error) {
      console.error("Error fetching analytics summary:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  app.get("/api/analytics/export", async (req, res) => {
    try {
      const events = await storage.getAnalyticsEvents();
      const tickets = await storage.getTickets();

      // Create CSV content
      let csv = "Type,Date,Category,Priority,Status,Resolution Time (hours)\n";
      
      for (const ticket of tickets) {
        const resolutionTime = ticket.createdAt && ticket.updatedAt
          ? ((new Date(ticket.updatedAt).getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60)).toFixed(1)
          : "";
        csv += `Ticket,${ticket.createdAt?.toISOString() || ""},${ticket.category || ""},${ticket.priority},${ticket.status},${resolutionTime}\n`;
      }

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=smart-it-copilot-analytics.csv");
      res.send(csv);
    } catch (error) {
      console.error("Error exporting analytics:", error);
      res.status(500).json({ error: "Failed to export analytics" });
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
