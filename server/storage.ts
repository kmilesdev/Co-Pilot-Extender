import { 
  type User, type InsertUser, type Ticket, type InsertTicket, 
  type SyncedUser, type SyncedGroup,
  type Conversation, type InsertConversation, type ConversationMessage, type InsertConversationMessage,
  type KBDocument, type InsertKBDocument, type KBChunk, type InsertKBChunk,
  type MLTrainingExample, type InsertMLTrainingExample, type MLModelVersion, type InsertMLModelVersion,
  type AnalyticsEvent, type InsertAnalyticsEvent
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;

  // Tickets
  getTickets(): Promise<Ticket[]>;
  getTicket(id: string): Promise<Ticket | undefined>;
  getTicketBySnSysId(snSysId: string): Promise<Ticket | undefined>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket | undefined>;
  deleteTicket(id: string): Promise<boolean>;

  // Synced Users (ServiceNow)
  getSyncedUsers(): Promise<SyncedUser[]>;
  getSyncedUser(id: string): Promise<SyncedUser | undefined>;
  getSyncedUserBySnSysId(snSysId: string): Promise<SyncedUser | undefined>;
  upsertSyncedUser(user: Omit<SyncedUser, "id">): Promise<SyncedUser>;
  deleteSyncedUser(id: string): Promise<boolean>;
  clearSyncedUsers(): Promise<void>;

  // Synced Groups (ServiceNow)
  getSyncedGroups(): Promise<SyncedGroup[]>;
  getSyncedGroup(id: string): Promise<SyncedGroup | undefined>;
  getSyncedGroupBySnSysId(snSysId: string): Promise<SyncedGroup | undefined>;
  upsertSyncedGroup(group: Omit<SyncedGroup, "id">): Promise<SyncedGroup>;
  deleteSyncedGroup(id: string): Promise<boolean>;
  clearSyncedGroups(): Promise<void>;

  // Conversations
  getConversations(userId?: string): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  getConversationByTicketId(ticketId: string): Promise<Conversation | undefined>;
  createConversation(conv: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined>;
  deleteConversation(id: string): Promise<boolean>;

  // Conversation Messages
  getConversationMessages(conversationId: string): Promise<ConversationMessage[]>;
  addConversationMessage(msg: InsertConversationMessage): Promise<ConversationMessage>;

  // Knowledge Base Documents
  getKBDocuments(): Promise<KBDocument[]>;
  getKBDocument(id: string): Promise<KBDocument | undefined>;
  createKBDocument(doc: InsertKBDocument): Promise<KBDocument>;
  updateKBDocument(id: string, updates: Partial<KBDocument>): Promise<KBDocument | undefined>;
  deleteKBDocument(id: string): Promise<boolean>;

  // Knowledge Base Chunks
  getKBChunks(documentId: string): Promise<KBChunk[]>;
  getAllKBChunks(): Promise<KBChunk[]>;
  createKBChunk(chunk: InsertKBChunk): Promise<KBChunk>;
  deleteKBChunksForDocument(documentId: string): Promise<void>;

  // ML Training Examples
  getMLTrainingExamples(): Promise<MLTrainingExample[]>;
  createMLTrainingExample(example: InsertMLTrainingExample): Promise<MLTrainingExample>;

  // ML Model Versions
  getMLModelVersions(): Promise<MLModelVersion[]>;
  getActiveMLModel(): Promise<MLModelVersion | undefined>;
  createMLModelVersion(model: InsertMLModelVersion): Promise<MLModelVersion>;
  setActiveMLModel(id: string): Promise<void>;

  // Analytics Events
  getAnalyticsEvents(startDate?: Date, endDate?: Date): Promise<AnalyticsEvent[]>;
  createAnalyticsEvent(event: InsertAnalyticsEvent): Promise<AnalyticsEvent>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private tickets: Map<string, Ticket>;
  private syncedUsers: Map<string, SyncedUser>;
  private syncedGroups: Map<string, SyncedGroup>;
  private conversations: Map<string, Conversation>;
  private conversationMessages: Map<string, ConversationMessage>;
  private kbDocuments: Map<string, KBDocument>;
  private kbChunks: Map<string, KBChunk>;
  private mlTrainingExamples: Map<string, MLTrainingExample>;
  private mlModelVersions: Map<string, MLModelVersion>;
  private analyticsEvents: Map<string, AnalyticsEvent>;

  constructor() {
    this.users = new Map();
    this.tickets = new Map();
    this.syncedUsers = new Map();
    this.syncedGroups = new Map();
    this.conversations = new Map();
    this.conversationMessages = new Map();
    this.kbDocuments = new Map();
    this.kbChunks = new Map();
    this.mlTrainingExamples = new Map();
    this.mlModelVersions = new Map();
    this.analyticsEvents = new Map();
    
    this.initializeDefaultUser();
    this.initializeSampleTickets();
    this.initializeSampleKBDocuments();
  }

  private async initializeDefaultUser() {
    const adminUser: User = {
      id: randomUUID(),
      username: "admin",
      password: "admin123",
      email: "admin@company.com",
      role: "admin",
    };
    this.users.set(adminUser.id, adminUser);
  }

  private async initializeSampleTickets() {
    const sampleTickets: InsertTicket[] = [
      {
        subject: "Cannot access company email on mobile",
        description: "I've been unable to access my work email from my mobile phone since yesterday. I've tried restarting the app and my phone but the issue persists. Getting an authentication error.",
        status: "open",
        priority: "high",
        category: "software",
        requesterEmail: "john.doe@company.com",
        aiSuggestions: "This appears to be an email configuration issue. Suggested steps:\n1. Check if the user's password was recently changed\n2. Verify mobile device management policies\n3. Consider re-adding the email account on the device",
        predictedCategory: "software",
        predictedPriority: "high",
      },
      {
        subject: "Printer not working in Building A",
        description: "The main printer on the 3rd floor of Building A is showing an error and not printing any documents. Multiple users are affected.",
        status: "in_progress",
        priority: "medium",
        category: "hardware",
        requesterEmail: "jane.smith@company.com",
        aiSuggestions: "Hardware issue affecting multiple users - likely needs physical inspection. Check:\n1. Paper jam indicators\n2. Toner levels\n3. Network connectivity to the printer",
        predictedCategory: "hardware",
        predictedPriority: "medium",
      },
      {
        subject: "VPN connection drops frequently",
        description: "When working from home, my VPN connection drops every 30 minutes or so. This is disrupting my work as I need constant access to internal resources.",
        status: "pending",
        priority: "medium",
        category: "network",
        requesterEmail: "mike.johnson@company.com",
        aiSuggestions: "Intermittent VPN issues could be caused by:\n1. ISP instability\n2. VPN client needs updating\n3. Firewall or antivirus interference\nRecommend checking VPN client version first.",
        predictedCategory: "network",
        predictedPriority: "medium",
      },
      {
        subject: "Request for new software license",
        description: "I need a license for Adobe Creative Cloud for an upcoming marketing project. This is time-sensitive as the project starts next week.",
        status: "open",
        priority: "low",
        category: "software",
        requesterEmail: "sarah.wilson@company.com",
        predictedCategory: "software",
        predictedPriority: "low",
      },
      {
        subject: "Suspicious email received",
        description: "I received an email asking me to reset my password with a link that looks suspicious. I did not click on it but wanted to report this.",
        status: "resolved",
        priority: "urgent",
        category: "security",
        requesterEmail: "tom.brown@company.com",
        aiSuggestions: "Potential phishing attempt. Good that user didn't click.\n1. Forward to security team for analysis\n2. Block sender if confirmed malicious\n3. Send reminder to team about phishing awareness",
        predictedCategory: "security",
        predictedPriority: "urgent",
      },
    ];

    for (const ticketData of sampleTickets) {
      const id = randomUUID();
      const now = new Date();
      const ticket: Ticket = {
        id,
        subject: ticketData.subject,
        description: ticketData.description,
        status: ticketData.status || "open",
        priority: ticketData.priority || "medium",
        category: ticketData.category || null,
        predictedCategory: ticketData.predictedCategory || null,
        predictedPriority: ticketData.predictedPriority || null,
        aiSuggestions: ticketData.aiSuggestions || null,
        requesterEmail: ticketData.requesterEmail || null,
        createdAt: new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        updatedAt: now,
        assignedTo: null,
        snSysId: null,
        snNumber: null,
        snLastSyncAt: null,
        snSyncStatus: null,
        snLastError: null,
      };
      this.tickets.set(id, ticket);
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      email: insertUser.email ?? null,
      role: insertUser.role ?? "end_user",
    };
    this.users.set(id, user);
    return user;
  }

  async getTickets(): Promise<Ticket[]> {
    return Array.from(this.tickets.values()).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async getTicket(id: string): Promise<Ticket | undefined> {
    return this.tickets.get(id);
  }

  async getTicketBySnSysId(snSysId: string): Promise<Ticket | undefined> {
    return Array.from(this.tickets.values()).find(
      (ticket) => ticket.snSysId === snSysId,
    );
  }

  async createTicket(insertTicket: InsertTicket): Promise<Ticket> {
    const id = randomUUID();
    const now = new Date();
    const ticket: Ticket = {
      ...insertTicket,
      id,
      status: insertTicket.status || "open",
      priority: insertTicket.priority || "medium",
      createdAt: now,
      updatedAt: now,
      category: insertTicket.category || null,
      predictedCategory: insertTicket.predictedCategory || null,
      predictedPriority: insertTicket.predictedPriority || null,
      aiSuggestions: insertTicket.aiSuggestions || null,
      requesterEmail: insertTicket.requesterEmail || null,
      assignedTo: insertTicket.assignedTo || null,
      snSysId: insertTicket.snSysId || null,
      snNumber: insertTicket.snNumber || null,
      snLastSyncAt: insertTicket.snLastSyncAt || null,
      snSyncStatus: insertTicket.snSyncStatus || null,
      snLastError: insertTicket.snLastError || null,
    };
    this.tickets.set(id, ticket);
    return ticket;
  }

  async updateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket | undefined> {
    const ticket = this.tickets.get(id);
    if (!ticket) return undefined;

    const updatedTicket: Ticket = {
      ...ticket,
      ...updates,
      id,
      updatedAt: new Date(),
    };
    this.tickets.set(id, updatedTicket);
    return updatedTicket;
  }

  async deleteTicket(id: string): Promise<boolean> {
    return this.tickets.delete(id);
  }

  async getSyncedUsers(): Promise<SyncedUser[]> {
    return Array.from(this.syncedUsers.values()).sort((a, b) => {
      const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
      const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }

  async getSyncedUser(id: string): Promise<SyncedUser | undefined> {
    return this.syncedUsers.get(id);
  }

  async getSyncedUserBySnSysId(snSysId: string): Promise<SyncedUser | undefined> {
    return Array.from(this.syncedUsers.values()).find(
      (user) => user.snSysId === snSysId
    );
  }

  async upsertSyncedUser(userData: Omit<SyncedUser, "id">): Promise<SyncedUser> {
    const existing = await this.getSyncedUserBySnSysId(userData.snSysId);
    if (existing) {
      const updated: SyncedUser = { ...existing, ...userData };
      this.syncedUsers.set(existing.id, updated);
      return updated;
    }

    const id = randomUUID();
    const user: SyncedUser = { ...userData, id };
    this.syncedUsers.set(id, user);
    return user;
  }

  async deleteSyncedUser(id: string): Promise<boolean> {
    return this.syncedUsers.delete(id);
  }

  async clearSyncedUsers(): Promise<void> {
    this.syncedUsers.clear();
  }

  async getSyncedGroups(): Promise<SyncedGroup[]> {
    return Array.from(this.syncedGroups.values()).sort((a, b) => 
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
  }

  async getSyncedGroup(id: string): Promise<SyncedGroup | undefined> {
    return this.syncedGroups.get(id);
  }

  async getSyncedGroupBySnSysId(snSysId: string): Promise<SyncedGroup | undefined> {
    return Array.from(this.syncedGroups.values()).find(
      (group) => group.snSysId === snSysId
    );
  }

  async upsertSyncedGroup(groupData: Omit<SyncedGroup, "id">): Promise<SyncedGroup> {
    const existing = await this.getSyncedGroupBySnSysId(groupData.snSysId);
    if (existing) {
      const updated: SyncedGroup = { ...existing, ...groupData };
      this.syncedGroups.set(existing.id, updated);
      return updated;
    }

    const id = randomUUID();
    const group: SyncedGroup = { ...groupData, id };
    this.syncedGroups.set(id, group);
    return group;
  }

  async deleteSyncedGroup(id: string): Promise<boolean> {
    return this.syncedGroups.delete(id);
  }

  async clearSyncedGroups(): Promise<void> {
    this.syncedGroups.clear();
  }

  // Users - extended methods
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated: User = { ...user, ...updates, id };
    this.users.set(id, updated);
    return updated;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  // Conversations
  async getConversations(userId?: string): Promise<Conversation[]> {
    let convs = Array.from(this.conversations.values());
    if (userId) {
      convs = convs.filter(c => c.userId === userId);
    }
    return convs.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async getConversationByTicketId(ticketId: string): Promise<Conversation | undefined> {
    return Array.from(this.conversations.values()).find(c => c.ticketId === ticketId);
  }

  async createConversation(conv: InsertConversation): Promise<Conversation> {
    const id = randomUUID();
    const now = new Date();
    const conversation: Conversation = {
      ...conv,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined> {
    const conv = this.conversations.get(id);
    if (!conv) return undefined;
    const updated: Conversation = { ...conv, ...updates, id, updatedAt: new Date() };
    this.conversations.set(id, updated);
    return updated;
  }

  async deleteConversation(id: string): Promise<boolean> {
    // Also delete messages
    const msgEntries = Array.from(this.conversationMessages.entries());
    for (const [msgId, msg] of msgEntries) {
      if (msg.conversationId === id) {
        this.conversationMessages.delete(msgId);
      }
    }
    return this.conversations.delete(id);
  }

  // Conversation Messages
  async getConversationMessages(conversationId: string): Promise<ConversationMessage[]> {
    return Array.from(this.conversationMessages.values())
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async addConversationMessage(msg: InsertConversationMessage): Promise<ConversationMessage> {
    const id = randomUUID();
    const message: ConversationMessage = {
      ...msg,
      id,
      createdAt: new Date(),
    };
    this.conversationMessages.set(id, message);
    // Update conversation timestamp
    const conv = this.conversations.get(msg.conversationId);
    if (conv) {
      conv.updatedAt = new Date();
      this.conversations.set(conv.id, conv);
    }
    return message;
  }

  // Knowledge Base Documents
  private async initializeSampleKBDocuments() {
    const sampleDocs: InsertKBDocument[] = [
      {
        title: "VPN Connection Troubleshooting Guide",
        content: `# VPN Connection Issues

## Common Problems and Solutions

### Issue: VPN Disconnects Frequently
1. Check your internet connection stability
2. Update VPN client to the latest version
3. Try switching between TCP and UDP protocols
4. Disable any conflicting firewall rules
5. Contact IT if issues persist after 3 attempts

### Issue: Cannot Connect to VPN
1. Verify your credentials are correct
2. Ensure you're not on a restricted network
3. Check if the VPN server is reachable
4. Clear cached credentials and try again

### When to Escalate
- If you've tried all steps above
- If you see error codes starting with "500"
- If multiple users are affected`,
        category: "network",
        tags: ["vpn", "network", "connectivity", "remote-work"],
        createdBy: null,
        updatedBy: null,
      },
      {
        title: "Email Configuration for Mobile Devices",
        content: `# Email Setup Guide

## iOS Devices
1. Go to Settings > Mail > Accounts
2. Tap "Add Account" > Microsoft Exchange
3. Enter your work email address
4. Use autodiscover or manual settings
5. Accept the security profile

## Android Devices
1. Open Gmail or Email app
2. Add account > Exchange/Office 365
3. Enter your credentials
4. Allow device management if prompted

## Common Issues
- Password sync: Change password in Outlook first
- Certificate errors: Install company root certificate
- Sync issues: Check server settings match IT specs`,
        category: "software",
        tags: ["email", "mobile", "outlook", "configuration"],
        createdBy: null,
        updatedBy: null,
      },
      {
        title: "Password Reset Procedures",
        content: `# Password Reset Guide

## Self-Service Reset
1. Go to password.company.com
2. Enter your username
3. Answer security questions
4. Create new password following policy

## Password Requirements
- Minimum 12 characters
- Mix of upper/lowercase letters
- At least one number
- At least one special character
- Cannot reuse last 10 passwords

## If Self-Service Fails
Contact IT Help Desk:
- Phone: 555-HELP
- Email: helpdesk@company.com
- Portal: support.company.com`,
        category: "security",
        tags: ["password", "security", "authentication", "self-service"],
        createdBy: null,
        updatedBy: null,
      },
    ];

    for (const doc of sampleDocs) {
      await this.createKBDocument(doc);
    }
  }

  async getKBDocuments(): Promise<KBDocument[]> {
    return Array.from(this.kbDocuments.values()).sort((a, b) => 
      b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  async getKBDocument(id: string): Promise<KBDocument | undefined> {
    return this.kbDocuments.get(id);
  }

  async createKBDocument(doc: InsertKBDocument): Promise<KBDocument> {
    const id = randomUUID();
    const now = new Date();
    const document: KBDocument = {
      ...doc,
      id,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    this.kbDocuments.set(id, document);
    return document;
  }

  async updateKBDocument(id: string, updates: Partial<KBDocument>): Promise<KBDocument | undefined> {
    const doc = this.kbDocuments.get(id);
    if (!doc) return undefined;
    const updated: KBDocument = {
      ...doc,
      ...updates,
      id,
      updatedAt: new Date(),
      version: doc.version + 1,
    };
    this.kbDocuments.set(id, updated);
    return updated;
  }

  async deleteKBDocument(id: string): Promise<boolean> {
    await this.deleteKBChunksForDocument(id);
    return this.kbDocuments.delete(id);
  }

  // Knowledge Base Chunks
  async getKBChunks(documentId: string): Promise<KBChunk[]> {
    return Array.from(this.kbChunks.values())
      .filter(c => c.documentId === documentId)
      .sort((a, b) => a.chunkIndex - b.chunkIndex);
  }

  async getAllKBChunks(): Promise<KBChunk[]> {
    return Array.from(this.kbChunks.values());
  }

  async createKBChunk(chunk: InsertKBChunk): Promise<KBChunk> {
    const id = randomUUID();
    const kbChunk: KBChunk = {
      ...chunk,
      id,
      createdAt: new Date(),
    };
    this.kbChunks.set(id, kbChunk);
    return kbChunk;
  }

  async deleteKBChunksForDocument(documentId: string): Promise<void> {
    const chunkEntries = Array.from(this.kbChunks.entries());
    for (const [id, chunk] of chunkEntries) {
      if (chunk.documentId === documentId) {
        this.kbChunks.delete(id);
      }
    }
  }

  // ML Training Examples
  async getMLTrainingExamples(): Promise<MLTrainingExample[]> {
    return Array.from(this.mlTrainingExamples.values()).sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async createMLTrainingExample(example: InsertMLTrainingExample): Promise<MLTrainingExample> {
    const id = randomUUID();
    const trainingExample: MLTrainingExample = {
      ...example,
      id,
      createdAt: new Date(),
    };
    this.mlTrainingExamples.set(id, trainingExample);
    return trainingExample;
  }

  // ML Model Versions
  async getMLModelVersions(): Promise<MLModelVersion[]> {
    return Array.from(this.mlModelVersions.values()).sort((a, b) => b.version - a.version);
  }

  async getActiveMLModel(): Promise<MLModelVersion | undefined> {
    return Array.from(this.mlModelVersions.values()).find(m => m.isActive);
  }

  async createMLModelVersion(model: InsertMLModelVersion): Promise<MLModelVersion> {
    const id = randomUUID();
    const versions = await this.getMLModelVersions();
    const nextVersion = versions.length > 0 ? Math.max(...versions.map(v => v.version)) + 1 : 1;
    const modelVersion: MLModelVersion = {
      ...model,
      id,
      version: nextVersion,
      trainedAt: new Date(),
    };
    this.mlModelVersions.set(id, modelVersion);
    return modelVersion;
  }

  async setActiveMLModel(id: string): Promise<void> {
    const modelEntries = Array.from(this.mlModelVersions.entries());
    for (const [modelId, model] of modelEntries) {
      model.isActive = modelId === id;
      this.mlModelVersions.set(modelId, model);
    }
  }

  // Analytics Events
  async getAnalyticsEvents(startDate?: Date, endDate?: Date): Promise<AnalyticsEvent[]> {
    let events = Array.from(this.analyticsEvents.values());
    if (startDate) {
      events = events.filter(e => e.createdAt >= startDate);
    }
    if (endDate) {
      events = events.filter(e => e.createdAt <= endDate);
    }
    return events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createAnalyticsEvent(event: InsertAnalyticsEvent): Promise<AnalyticsEvent> {
    const id = randomUUID();
    const analyticsEvent: AnalyticsEvent = {
      ...event,
      id,
      createdAt: new Date(),
    };
    this.analyticsEvents.set(id, analyticsEvent);
    return analyticsEvent;
  }
}

export const storage = new MemStorage();
