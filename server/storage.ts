import { type User, type InsertUser, type Ticket, type InsertTicket } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getTickets(): Promise<Ticket[]>;
  getTicket(id: string): Promise<Ticket | undefined>;
  getTicketBySnSysId(snSysId: string): Promise<Ticket | undefined>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket | undefined>;
  deleteTicket(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private tickets: Map<string, Ticket>;

  constructor() {
    this.users = new Map();
    this.tickets = new Map();
    
    this.initializeDefaultUser();
    this.initializeSampleTickets();
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
        ...ticketData,
        id,
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
    const user: User = { ...insertUser, id };
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
}

export const storage = new MemStorage();
