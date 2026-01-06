import { useState, useEffect } from 'react';
import { UsageProgressBar } from './UsageProgressBar';

interface ClaudeAccount {
  id: string;
  name: string;
  status: string;
  accountType: string;
  lastUsedAt: string | null;
  usage?: {
    daily?: {
      tokens: number;
      requests: number;
      cost: number;
    };
  };
  claudeUsage?: {
    fiveHour?: {
      utilization: number;
      resetsAt: string;
      remainingSeconds: number;
    };
    sevenDay?: {
      utilization: number;
      resetsAt: string;
      remainingSeconds: number;
    };
    sevenDayOpus?: {
      utilization: number;
      resetsAt: string;
      remainingSeconds: number;
    };
  };
}

interface OpenAIAccount {
  id: string;
  name: string;
  status: string;
  accountType: string;
  lastUsedAt: string | null;
  usage?: {
    daily?: {
      tokens: number;
      requests: number;
      cost: number;
    };
  };
  codexUsage?: {
    primary?: {
      usedPercent: number;
      resetAfterSeconds: number;
      resetAt: string;
    };
    secondary?: {
      usedPercent: number;
      resetAfterSeconds: number;
      resetAt: string;
    };
  };
}

type UnifiedAccount = (ClaudeAccount | OpenAIAccount) & {
  platform: 'claude' | 'openai';
};

interface AIAccountsProps {
  apiKey: string;
}

export function AIAccounts({ apiKey }: AIAccountsProps) {
  const [claudeAccounts, setClaudeAccounts] = useState<ClaudeAccount[]>([]);
  const [openaiAccounts, setOpenaiAccounts] = useState<OpenAIAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchAccounts();
    const interval = setInterval(fetchAccounts, 30000);
    return () => clearInterval(interval);
  }, [apiKey]);

  const fetchAccounts = async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    }

    try {
      const response = await fetch('/api/ai-accounts', {
        headers: {
          'X-API-Key': apiKey,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch AI accounts');
      }

      const data = await response.json();
      setClaudeAccounts(data.claude || []);
      setOpenaiAccounts(data.openai || []);
      setError('');
    } catch (err) {
      console.error('Error fetching AI accounts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load AI accounts');
    } finally {
      setIsLoading(false);
      if (isRefresh) {
        setIsRefreshing(false);
      }
    }
  };

  const formatLastUsed = (lastUsedAt: string | null) => {
    if (!lastUsedAt) return 'Never';
    const date = new Date(lastUsedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return '0m';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      if (hours > 0) return `${days}d ${hours}h`;
      return `${days}d`;
    }
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-chart-1 text-white';
      case 'blocked':
        return 'bg-chart-2 text-white';
      case 'unauthorized':
        return 'bg-chart-3 text-white';
      case 'temp_error':
        return 'bg-chart-4 text-white';
      default:
        return 'bg-chart-5 text-white';
    }
  };

  const getAccountName = (account: UnifiedAccount, totalCount: number) => {
    if (totalCount === 1) {
      return account.platform === 'claude' ? 'Claude' : 'OpenAI';
    }
    return `${account.platform === 'claude' ? 'Claude' : 'OpenAI'} (${account.name})`;
  };

  // Merge accounts
  const allAccounts: UnifiedAccount[] = [
    ...claudeAccounts.map(acc => ({ ...acc, platform: 'claude' as const })),
    ...openaiAccounts.map(acc => ({ ...acc, platform: 'openai' as const })),
  ];

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-medium text-card-foreground">AI Accounts Status</h3>
        </div>
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="ml-3 text-muted-foreground">Loading accounts...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-medium text-card-foreground">AI Accounts Status</h3>
        </div>
        <div className="text-center py-12">
          <p className="text-destructive">{error}</p>
          <button
            onClick={() => fetchAccounts(true)}
            className="mt-3 text-sm text-primary hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-card-foreground">AI Accounts Status</h3>
          <button
            onClick={() => fetchAccounts(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {allAccounts.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Account</th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Daily Usage</th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Usage Windows</th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Used</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {allAccounts.map((account) => {
                const platformCount = account.platform === 'claude' ? claudeAccounts.length : openaiAccounts.length;
                const isClaudeAccount = account.platform === 'claude';
                const claudeAcc = isClaudeAccount ? (account as ClaudeAccount) : null;
                const openaiAcc = !isClaudeAccount ? (account as OpenAIAccount) : null;

                return (
                  <tr key={account.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-card-foreground">
                        {getAccountName(account, platformCount)}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(account.status)}`}>
                        {account.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {account.usage?.daily && (isClaudeAccount || account.usage.daily.requests > 0) ? (
                        <div className="text-xs">
                          <div className="text-muted-foreground">{account.usage.daily.requests} reqs</div>
                          <div className="text-muted-foreground">${account.usage.daily.cost.toFixed(2)} cost</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">{isClaudeAccount ? 'No data' : 'No usage today'}</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {claudeAcc?.claudeUsage ? (
                        <div className="space-y-1.5 min-w-[180px]">
                          {claudeAcc.claudeUsage.fiveHour && (
                            <UsageProgressBar
                              label="5h Window"
                              resetTime={formatTime(claudeAcc.claudeUsage.fiveHour.remainingSeconds)}
                              percentage={claudeAcc.claudeUsage.fiveHour.utilization}
                              resetAfterSeconds={claudeAcc.claudeUsage.fiveHour.remainingSeconds}
                              resetAt={claudeAcc.claudeUsage.fiveHour.resetsAt}
                            />
                          )}
                          {claudeAcc.claudeUsage.sevenDay && (
                            <UsageProgressBar
                              label="7d Window"
                              resetTime={formatTime(claudeAcc.claudeUsage.sevenDay.remainingSeconds)}
                              percentage={claudeAcc.claudeUsage.sevenDay.utilization}
                              resetAfterSeconds={claudeAcc.claudeUsage.sevenDay.remainingSeconds}
                              resetAt={claudeAcc.claudeUsage.sevenDay.resetsAt}
                            />
                          )}
                          {claudeAcc.claudeUsage.sevenDayOpus && (
                            <UsageProgressBar
                              label="Opus Window"
                              resetTime={formatTime(claudeAcc.claudeUsage.sevenDayOpus.remainingSeconds)}
                              percentage={claudeAcc.claudeUsage.sevenDayOpus.utilization}
                              resetAfterSeconds={claudeAcc.claudeUsage.sevenDayOpus.remainingSeconds}
                              resetAt={claudeAcc.claudeUsage.sevenDayOpus.resetsAt}
                            />
                          )}
                        </div>
                      ) : openaiAcc?.codexUsage ? (
                        <div className="space-y-1.5 min-w-[180px]">
                          {openaiAcc.codexUsage.primary && (
                            <UsageProgressBar
                              label="5h Window"
                              resetTime={formatTime(openaiAcc.codexUsage.primary.resetAfterSeconds)}
                              percentage={openaiAcc.codexUsage.primary.usedPercent}
                              resetAfterSeconds={openaiAcc.codexUsage.primary.resetAfterSeconds}
                              resetAt={openaiAcc.codexUsage.primary.resetAt}
                            />
                          )}
                          {openaiAcc.codexUsage.secondary && (
                            <UsageProgressBar
                              label="7d Window"
                              resetTime={formatTime(openaiAcc.codexUsage.secondary.resetAfterSeconds)}
                              percentage={openaiAcc.codexUsage.secondary.usedPercent}
                              resetAfterSeconds={openaiAcc.codexUsage.secondary.resetAfterSeconds}
                              resetAt={openaiAcc.codexUsage.secondary.resetAt}
                            />
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">No data</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground text-xs text-left">{formatLastUsed(account.lastUsedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          No shared AI accounts found
        </div>
      )}
    </div>
  );
}
