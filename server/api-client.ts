interface LoginResponse {
  success: boolean;
  token: string;
  expiresIn: number;
}

interface KeyUsageStatus {
  cost: number;
  tokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreateTokens: number;
  cacheReadTokens: number;
  requests: number;
  formattedCost: string;
}

interface ApiKeysResponse {
  success: boolean;
  data: {
    availableTags: string[];
    items: Array<{
      id: string;
      name: string;
      tags: string[];
      usage: {
        total: KeyUsageStatus;
      };
      [key: string]: any;
    }>
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    }
  };
}

interface BatchStatsResponse {
  success: boolean;
  data: Record<string, KeyUsageStatus>
}

interface KeyIdResponse {
  success: boolean;
  data: {
    id: string;
  };
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

  async getCurrentCosts(): Promise<ApiKeysResponse['data']['items']> {
    await this.ensureValidToken();

    const response = await fetch(`${this.baseUrl}/admin/api-keys?timeRange=all`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch current costs: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as ApiKeysResponse;
    
    if (!data.success || !Array.isArray(data.data.items)) {
      throw new Error('Invalid response format from admin/api-keys');
    }

    const noShareApiKeys = data.data.items.filter(user => !user.tags || !user.tags.includes("noshare"))

    const keyIds = noShareApiKeys.map(user => user.id);

    const batchStatsResponse = await fetch(`${this.baseUrl}/admin/api-keys/batch-stats`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        keyIds,
        timeRange: 'all',
      }),
    })

    if (!batchStatsResponse.ok) {
      throw new Error(`Failed to fetch batch stats: ${batchStatsResponse.status} ${batchStatsResponse.statusText}`);
    }

    const batchStatsData = await batchStatsResponse.json() as BatchStatsResponse;

    for (const user of noShareApiKeys) {
      const keyUsage = batchStatsData.data[user.id];
      if (keyUsage) {
        user.usage.total = keyUsage;
      }
    }

    return noShareApiKeys;
  }

  async getKeyId(apiKey: string): Promise<string> {
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
}

export const apiClient = new ApiClient();