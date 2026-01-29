import type { ServiceNowIncident, ServiceNowHealthStatus, ServiceNowUser, ServiceNowGroup } from "@shared/schema";

interface ServiceNowConfig {
  instanceUrl: string;
  authType: "basic" | "oauth";
  username?: string;
  password?: string;
  clientId?: string;
  clientSecret?: string;
  tokenUrl?: string;
  defaultAssignmentGroupSysId?: string;
  defaultCallerSysId?: string;
}

interface ServiceNowResponse<T> {
  result: T;
}

class ServiceNowClient {
  private config: ServiceNowConfig | null = null;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    const instanceUrl = process.env.SN_INSTANCE_URL;
    const authType = process.env.SN_AUTH_TYPE as "basic" | "oauth" | undefined;

    if (!instanceUrl || !authType) {
      this.config = null;
      return;
    }

    this.config = {
      instanceUrl: instanceUrl.replace(/\/$/, ""),
      authType,
      username: process.env.SN_USERNAME,
      password: process.env.SN_PASSWORD,
      clientId: process.env.SN_CLIENT_ID,
      clientSecret: process.env.SN_CLIENT_SECRET,
      tokenUrl: process.env.SN_TOKEN_URL,
      defaultAssignmentGroupSysId: process.env.SN_DEFAULT_ASSIGNMENT_GROUP_SYSID,
      defaultCallerSysId: process.env.SN_DEFAULT_CALLER_SYSID,
    };
  }

  isConfigured(): boolean {
    if (!this.config) return false;
    
    if (this.config.authType === "basic") {
      return !!(this.config.username && this.config.password);
    } else if (this.config.authType === "oauth") {
      return !!(this.config.clientId && this.config.clientSecret);
    }
    
    return false;
  }

  getConfig(): ServiceNowConfig | null {
    return this.config;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    if (!this.config) {
      throw new Error("ServiceNow not configured");
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json",
    };

    if (this.config.authType === "basic") {
      const credentials = Buffer.from(
        `${this.config.username}:${this.config.password}`
      ).toString("base64");
      headers["Authorization"] = `Basic ${credentials}`;
    } else if (this.config.authType === "oauth") {
      const token = await this.getOAuthToken();
      headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
  }

  private async getOAuthToken(): Promise<string> {
    if (!this.config || this.config.authType !== "oauth") {
      throw new Error("OAuth not configured");
    }

    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const tokenUrl = this.config.tokenUrl || 
      `${this.config.instanceUrl}/oauth_token.do`;

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.config.clientId!,
      client_secret: this.config.clientSecret!,
    });

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`OAuth token request failed: ${response.statusText}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;

    return this.accessToken!;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: Record<string, any>,
    retries: number = 3
  ): Promise<T> {
    if (!this.config) {
      throw new Error("ServiceNow not configured");
    }

    const url = `${this.config.instanceUrl}${endpoint}`;
    const headers = await this.getAuthHeaders();

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });

        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After") || "5";
          await new Promise((resolve) => 
            setTimeout(resolve, parseInt(retryAfter) * 1000)
          );
          continue;
        }

        if (response.status >= 500 && attempt < retries - 1) {
          await new Promise((resolve) => 
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`ServiceNow API error: ${response.status} - ${errorText}`);
        }

        const data: ServiceNowResponse<T> = await response.json();
        return data.result;
      } catch (error) {
        if (attempt === retries - 1) throw error;
      }
    }

    throw new Error("Max retries exceeded");
  }

  async checkHealth(): Promise<ServiceNowHealthStatus> {
    if (!this.isConfigured()) {
      return {
        configured: false,
        connected: false,
        authType: null,
        instanceUrl: null,
        error: "ServiceNow is not configured. Set required environment variables.",
      };
    }

    try {
      await this.request<any[]>(
        "GET",
        "/api/now/table/incident?sysparm_limit=1&sysparm_fields=sys_id"
      );
      return {
        configured: true,
        connected: true,
        authType: this.config!.authType,
        instanceUrl: this.config!.instanceUrl,
        error: null,
      };
    } catch (error) {
      return {
        configured: true,
        connected: false,
        authType: this.config!.authType,
        instanceUrl: this.config!.instanceUrl,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getIncidents(options: {
    limit?: number;
    query?: string;
    state?: string;
  } = {}): Promise<ServiceNowIncident[]> {
    const params = new URLSearchParams();
    params.set("sysparm_limit", String(options.limit || 25));
    params.set(
      "sysparm_fields",
      "sys_id,number,short_description,description,state,priority,category,caller_id,assignment_group,sys_updated_on,sys_created_on"
    );
    params.set("sysparm_display_value", "false");
    params.set("sysparm_order_by", "sys_updated_onDESC");

    const queryParts: string[] = [];
    if (options.query) {
      queryParts.push(options.query);
    }
    if (options.state) {
      queryParts.push(`state=${options.state}`);
    }
    if (queryParts.length > 0) {
      params.set("sysparm_query", queryParts.join("^"));
    }

    return this.request<ServiceNowIncident[]>(
      "GET",
      `/api/now/table/incident?${params.toString()}`
    );
  }

  async getIncident(sysId: string): Promise<ServiceNowIncident> {
    return this.request<ServiceNowIncident>(
      "GET",
      `/api/now/table/incident/${sysId}`
    );
  }

  async createIncident(data: {
    short_description: string;
    description: string;
    priority: string;
    category?: string;
    caller_id?: string;
    work_notes?: string;
  }): Promise<ServiceNowIncident> {
    const body: Record<string, any> = {
      short_description: data.short_description,
      description: data.description,
      priority: data.priority,
    };

    if (data.category) {
      body.category = data.category;
    }

    if (data.caller_id) {
      body.caller_id = data.caller_id;
    } else if (this.config?.defaultCallerSysId) {
      body.caller_id = this.config.defaultCallerSysId;
    }

    if (this.config?.defaultAssignmentGroupSysId) {
      body.assignment_group = this.config.defaultAssignmentGroupSysId;
    }

    if (data.work_notes) {
      body.work_notes = data.work_notes;
    }

    return this.request<ServiceNowIncident>(
      "POST",
      "/api/now/table/incident",
      body
    );
  }

  async updateIncident(
    sysId: string,
    data: Partial<{
      state: string;
      priority: string;
      work_notes: string;
      comments: string;
      close_notes: string;
      close_code: string;
    }>
  ): Promise<ServiceNowIncident> {
    return this.request<ServiceNowIncident>(
      "PATCH",
      `/api/now/table/incident/${sysId}`,
      data
    );
  }

  mapLocalPriorityToSn(priority: string): string {
    const mapping: Record<string, string> = {
      low: "4",
      medium: "3",
      high: "2",
      urgent: "1",
    };
    return mapping[priority] || "3";
  }

  mapSnPriorityToLocal(priority: string): string {
    const mapping: Record<string, string> = {
      "1": "urgent",
      "2": "high",
      "3": "medium",
      "4": "low",
      "5": "low",
    };
    return mapping[priority] || "medium";
  }

  mapLocalStatusToSnState(status: string): string {
    const mapping: Record<string, string> = {
      open: "1",
      in_progress: "2",
      pending: "3",
      resolved: "4",
      closed: "5",
    };
    return mapping[status] || "1";
  }

  mapSnStateToLocalStatus(state: string): string {
    const mapping: Record<string, string> = {
      "1": "open",
      "2": "in_progress",
      "3": "pending",
      "4": "resolved",
      "5": "closed",
      "6": "closed",
    };
    return mapping[state] || "open";
  }

  async getUsers(options: {
    limit?: number;
    activeOnly?: boolean;
    groupSysId?: string;
  } = {}): Promise<ServiceNowUser[]> {
    const params = new URLSearchParams();
    params.set("sysparm_limit", String(options.limit || 100));
    params.set(
      "sysparm_fields",
      "sys_id,user_name,first_name,last_name,email,title,department,active"
    );
    params.set("sysparm_display_value", "false");
    
    const queryParts: string[] = [];
    if (options.activeOnly !== false) {
      queryParts.push("active=true");
    }
    if (queryParts.length > 0) {
      params.set("sysparm_query", queryParts.join("^"));
    }

    return this.request<ServiceNowUser[]>(
      "GET",
      `/api/now/table/sys_user?${params.toString()}`
    );
  }

  async getUser(sysId: string): Promise<ServiceNowUser> {
    return this.request<ServiceNowUser>(
      "GET",
      `/api/now/table/sys_user/${sysId}`
    );
  }

  async getGroups(options: {
    limit?: number;
    activeOnly?: boolean;
  } = {}): Promise<ServiceNowGroup[]> {
    const params = new URLSearchParams();
    params.set("sysparm_limit", String(options.limit || 100));
    params.set(
      "sysparm_fields",
      "sys_id,name,description,manager,email,active"
    );
    params.set("sysparm_display_value", "false");
    
    const queryParts: string[] = [];
    if (options.activeOnly !== false) {
      queryParts.push("active=true");
    }
    queryParts.push("type=");
    if (queryParts.length > 0) {
      params.set("sysparm_query", queryParts.join("^"));
    }

    return this.request<ServiceNowGroup[]>(
      "GET",
      `/api/now/table/sys_user_group?${params.toString()}`
    );
  }

  async getGroup(sysId: string): Promise<ServiceNowGroup> {
    return this.request<ServiceNowGroup>(
      "GET",
      `/api/now/table/sys_user_group/${sysId}`
    );
  }

  async getGroupMembers(groupSysId: string): Promise<ServiceNowUser[]> {
    const params = new URLSearchParams();
    params.set("sysparm_limit", "100");
    params.set("sysparm_fields", "user");
    params.set("sysparm_query", `group=${groupSysId}`);

    const memberships = await this.request<{ user: string }[]>(
      "GET",
      `/api/now/table/sys_user_grmember?${params.toString()}`
    );

    const users: ServiceNowUser[] = [];
    for (const membership of memberships) {
      if (membership.user) {
        try {
          const user = await this.getUser(membership.user);
          users.push(user);
        } catch {
          // Skip users that can't be fetched
        }
      }
    }

    return users;
  }
}

export const snClient = new ServiceNowClient();
