interface LoginResponse {
  success: boolean;
  token: string;
  expiresIn: number;
}

interface ApiKeysResponse {
  success: boolean;
  data: {
    items: ApiKeyListItem[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
    availableTags: string[];
  };
}

interface KeyIdResponse {
  success: boolean;
  data: {
    id: string;
  };
}

interface ApiKeyListItem {
  id: string;
  name: string;
  tags: string[];
  apiKey?: string;
  [key: string]: any;
}

interface ApiKeyUsageTotals {
  cost: number;
  tokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreateTokens: number;
  cacheReadTokens: number;
  requests: number;
  formattedCost: string;
}

interface ApiKeyWithUsage extends ApiKeyListItem {
  usage: {
    total: ApiKeyUsageTotals;
  };
}

interface BatchStatsResponse {
  success: boolean;
  data: Record<string, ApiKeyBatchStats>;
}

interface ApiKeyBatchStats {
  requests: number;
  tokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreateTokens: number;
  cacheReadTokens: number;
  cost: number;
  formattedCost?: string;
  [key: string]: any;
}

export class ApiClient {
  private baseUrl: string;
  private username: string;
  private password: string;
  private token: string | null = null;
  private expiresAt: number = 0;
  private readonly skewMs = 10000; // 10 seconds

  constructor() {
    this.baseUrl = process.env.BASE_URL || '';
    this.username = process.env.ADMIN_USERNAME || '';
    this.password = process.env.ADMIN_PASSWORD || '';
    
    if (!this.baseUrl || !this.username || !this.password) {
      throw new Error('Missing required environment variables: BASE_URL, ADMIN_USERNAME, ADMIN_PASSWORD');
    }
  }

  private async ensureValidToken(): Promise<void> {
    if (this.token && Date.now() + this.skewMs < this.expiresAt) {
      return;
    }

    await this.login();
  }

  private async login(): Promise<void> {
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries) {
      try {
        const response = await fetch(`${this.baseUrl}/web/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: this.username,
            password: this.password,
          }),
        });

        if (!response.ok) {
          throw new Error(`Login failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as LoginResponse;
        
        if (!data.success || !data.token) {
          throw new Error('Login response invalid');
        }

        this.token = data.token;
        this.expiresAt = Date.now() + data.expiresIn;
        return;
        
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          throw new Error(`Login failed after ${maxRetries} retries: ${error}`);
        }
        
        // Exponential backoff
        const delay = Math.pow(2, retries - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  private async fetchApiKeysPage(page: number, pageSize: number): Promise<ApiKeysResponse['data']> {
    await this.ensureValidToken();

    const response = await fetch(
      `${this.baseUrl}/admin/api-keys?page=${page}&pageSize=${pageSize}&searchMode=apiKey&sortBy=createdAt&sortOrder=desc&timeRange=all`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch api keys: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as ApiKeysResponse;
    
    if (!data.success || !data.data?.items || !data.data?.pagination) {
      throw new Error('Invalid response format from admin/api-keys');
    }

    return data.data;
  }

  private sanitizeApiKeyItem(item: ApiKeyListItem): ApiKeyListItem {
    const { apiKey, ...rest } = item;
    return rest;
  }

  private async fetchUsageBatch(keyIds: string[]): Promise<Record<string, ApiKeyBatchStats>> {
    await this.ensureValidToken();

    const response = await fetch(`${this.baseUrl}/admin/api-keys/batch-stats`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        keyIds,
        timeRange: 'all',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch usage stats: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as BatchStatsResponse;

    if (!data.success || !data.data) {
      throw new Error('Invalid response format from admin/api-keys/batch-stats');
    }

    return data.data;
  }

  private async getUsageStats(keyIds: string[]): Promise<Map<string, ApiKeyBatchStats>> {
    const usageMap = new Map<string, ApiKeyBatchStats>();
    const batchSize = 10;

    for (let i = 0; i < keyIds.length; i += batchSize) {
      const batch = keyIds.slice(i, i + batchSize);
      if (batch.length === 0) continue;

      const batchData = await this.fetchUsageBatch(batch);
      for (const [id, stats] of Object.entries(batchData)) {
        usageMap.set(id, stats);
      }
    }

    return usageMap;
  }

  async getCurrentCosts(): Promise<ApiKeyWithUsage[]> {
    const pageSize = 50;
    let page = 1;
    let totalPages = 1;
    const allItems: ApiKeyListItem[] = [];

    while (page <= totalPages) {
      const data = await this.fetchApiKeysPage(page, pageSize);
      allItems.push(...data.items);
      totalPages = data.pagination.totalPages || page;
      page += 1;
    }

    const shareableItems = allItems.filter(user => !user.tags?.includes("noshare"));
    const usageStats = await this.getUsageStats(shareableItems.map(item => item.id));

    return shareableItems.map((item) => {
      const sanitizedItem = this.sanitizeApiKeyItem(item);
      const stats = usageStats.get(item.id);
      const cost = Number(stats?.cost ?? 0);
      const formattedCost = stats?.formattedCost ?? `$${cost.toFixed(2)}`;

      return {
        ...sanitizedItem,
        usage: {
          total: {
            cost,
            tokens: Number(stats?.tokens ?? 0),
            inputTokens: Number(stats?.inputTokens ?? 0),
            outputTokens: Number(stats?.outputTokens ?? 0),
            cacheCreateTokens: Number(stats?.cacheCreateTokens ?? 0),
            cacheReadTokens: Number(stats?.cacheReadTokens ?? 0),
            requests: Number(stats?.requests ?? 0),
            formattedCost,
          },
        },
      };
    });
  }

  private async getKeyIdFromLegacy(apiKey: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/apiStats/api/get-key-id`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get key ID: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as KeyIdResponse;
    
    if (!data.success || !data.data?.id) {
      throw new Error('Invalid API key or response format');
    }

    return data.data.id;
  }

  private async getKeyIdFromList(apiKey: string): Promise<string> {
    const pageSize = 50;
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const data = await this.fetchApiKeysPage(page, pageSize);
      const match = data.items.find(item => item.apiKey === apiKey);
      if (match?.id) {
        return match.id;
      }

      totalPages = data.pagination.totalPages || page;
      page += 1;
    }

    throw new Error('Invalid API key or response format');
  }

  async getKeyId(apiKey: string): Promise<string> {
    try {
      return await this.getKeyIdFromLegacy(apiKey);
    } catch (error) {
      return await this.getKeyIdFromList(apiKey);
    }
  }
}

export const apiClient = new ApiClient();
