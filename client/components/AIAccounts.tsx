import { useState, useEffect, useRef } from 'react';
import { UsageProgressBar } from './UsageProgressBar';

interface ClaudeAccount {
  id: string;
  name: string;
  status: string;
  accountType: string;
  lastUsedAt: string | null;
  schedulable?: boolean;
  stoppedReason?: string;
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
  schedulable?: boolean;
  stoppedReason?: string;
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
  const [refreshError, setRefreshError] = useState<string>('');
  const [initialError, setInitialError] = useState<string>('');
  const hasLoadedDataRef = useRef(false);

  useEffect(() => {
    fetchAccounts('initial');
    const interval = setInterval(() => fetchAccounts('auto'), 30000);
    return () => clearInterval(interval);
  }, [apiKey]);

  const fetchAccounts = async (type: 'initial' | 'manual' | 'auto' = 'auto') => {
    if (type === 'manual') {
      setIsRefreshing(true);
      setRefreshError('');
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
      setRefreshError('');
      setInitialError('');
      hasLoadedDataRef.current = true;
    } catch (err) {
      console.error('Error fetching AI accounts:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load AI accounts';

      if (type === 'initial') {
        setInitialError(errorMessage);
      } else if (hasLoadedDataRef.current) {
        // Only set refresh error if we have previously loaded data successfully
        setRefreshError(errorMessage);
      }
    } finally {
      if (type === 'initial') {
        setIsLoading(false);
      }
      if (type === 'manual') {
        setIsRefreshing(false);
      }
    }
  };

  const handleRetry = () => {
    setRefreshError('');
    fetchAccounts('manual');
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

  if (initialError) {
    return (
      <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-medium text-card-foreground">AI Accounts Status</h3>
        </div>
        <div className="text-center py-12">
          <p className="text-destructive">{initialError}</p>
          <button
            onClick={() => fetchAccounts('initial')}
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
          <div className="flex items-center gap-3">
            {refreshError && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-destructive">{refreshError}</span>
                <button
                  onClick={handleRetry}
                  className="text-sm text-primary hover:underline"
                >
                  Retry
                </button>
              </div>
            )}
            <button
              onClick={() => fetchAccounts('manual')}
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
      </div>

      {allAccounts.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Account</th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[120px]">Daily Usage</th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[200px]">Usage Windows</th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[110px]">Last Used</th>
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
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(account.status)}`}>
                          {account.status}
                        </span>
                        {account.schedulable === false && (
                          <span className="relative inline-flex items-center group">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-destructive/15 text-destructive cursor-pointer">
                              Not schedulable
                              <svg
                                className="ml-1 h-3 w-3"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <circle cx="12" cy="12" r="9" />
                                <path d="M12 8h.01M11 12h1v4h1" />
                              </svg>
                            </span>
                            <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-max -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-sm opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                              {account.stoppedReason || 'Not schedulable'}
                            </span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 min-w-[120px]">
                      {account.usage?.daily && (isClaudeAccount || account.usage.daily.requests > 0) ? (
                        <div className="text-xs">
                          <div className="text-muted-foreground">{account.usage.daily.requests} reqs</div>
                          <div className="text-muted-foreground">${account.usage.daily.cost.toFixed(2)} cost</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">{isClaudeAccount ? 'No data' : 'No usage today'}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 min-w-[300px]">
                      {claudeAcc?.claudeUsage ? (
                        <div className="space-y-1.5 min-w-[180px]">
                          {claudeAcc.claudeUsage.fiveHour && (
                            <UsageProgressBar
                              label="5h Window"
                              percentage={claudeAcc.claudeUsage.fiveHour.utilization}
                              resetAt={claudeAcc.claudeUsage.fiveHour.resetsAt}
                            />
                          )}
                          {claudeAcc.claudeUsage.sevenDay && (
                            <UsageProgressBar
                              label="7d Window"
                              percentage={claudeAcc.claudeUsage.sevenDay.utilization}
                              resetAt={claudeAcc.claudeUsage.sevenDay.resetsAt}
                            />
                          )}
                          {claudeAcc.claudeUsage.sevenDayOpus && (
                            <UsageProgressBar
                              label="Opus Window"
                              percentage={claudeAcc.claudeUsage.sevenDayOpus.utilization}
                              resetAt={claudeAcc.claudeUsage.sevenDayOpus.resetsAt}
                            />
                          )}
                        </div>
                      ) : openaiAcc?.codexUsage ? (
                        <div className="space-y-1.5 min-w-[180px]">
                          {openaiAcc.codexUsage.primary && (
                            <UsageProgressBar
                              label="5h Window"
                              percentage={openaiAcc.codexUsage.primary.usedPercent}
                              resetAt={openaiAcc.codexUsage.primary.resetAt}
                            />
                          )}
                          {openaiAcc.codexUsage.secondary && (
                            <UsageProgressBar
                              label="7d Window"
                              percentage={openaiAcc.codexUsage.secondary.usedPercent}
                              resetAt={openaiAcc.codexUsage.secondary.resetAt}
                            />
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">No data</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground text-xs text-left min-w-[110px]">{formatLastUsed(account.lastUsedAt)}</td>
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
