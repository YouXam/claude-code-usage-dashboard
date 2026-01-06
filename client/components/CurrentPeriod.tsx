import { useState, useEffect } from 'react';
import { RankingTable } from './RankingTable';
import { UserDetailCard } from './UserDetailCard';

interface Period {
  index: number;
  startSnapshotId: number | null;
  startAt: string | null;
  endAt: string | null;
  isCurrent: boolean;
}

interface PeriodSummary {
  period: {
    index: number;
    startAt: string | null;
    endAt: string | null;
    isCurrent: boolean;
  };
  totals: {
    totalCost: number;
    userCount: number;
  };
  ranking: Array<{
    id: string;
    name: string;
    cost: number;
    share: number;
    isMe: boolean;
    rawStart: any;
    rawEnd: any;
    periodTokens: number;
    periodRequests: number;
  }>;
}

interface CurrentPeriodProps {
  period: Period;
  apiKey: string;
  userId: string;
}

export function CurrentPeriod({ period, apiKey, userId }: CurrentPeriodProps) {
  const [summary, setSummary] = useState<PeriodSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchSummary();
  }, [period.index]);

  const fetchSummary = async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError('');

    try {
      const response = await fetch(`/api/periods/${period.index}/summary`, {
        headers: {
          'X-API-Key': apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch period summary: ${response.status}`);
      }

      const data = await response.json();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load period data');
    } finally {
      if (isRefresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  const formatDate = (dateString: string | null, isEndDate = false) => {
    if (!dateString && isEndDate) return 'Now';
    if (!dateString) return 'Beginning';
    
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const myUser = summary?.ranking.find(u => u.isMe);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="bg-card p-6 rounded-lg shadow-sm border border-border animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-muted rounded w-2/3"></div>
            <div className="h-8 w-20 bg-muted rounded"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="h-8 bg-muted rounded w-24 mx-auto mb-2"></div>
              <div className="h-4 bg-muted rounded w-16 mx-auto"></div>
            </div>
            <div className="text-center">
              <div className="h-8 bg-muted rounded w-16 mx-auto mb-2"></div>
              <div className="h-4 bg-muted rounded w-20 mx-auto"></div>
            </div>
            <div className="text-center">
              <div className="h-8 bg-muted rounded w-20 mx-auto mb-2"></div>
              <div className="h-4 bg-muted rounded w-32 mx-auto"></div>
            </div>
          </div>
        </div>
        
        {/* Ranking table skeleton */}
        <div className="bg-card rounded-lg shadow-sm border border-border animate-pulse">
          <div className="p-6 border-b border-border">
            <div className="h-6 bg-muted rounded w-32"></div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3"><div className="h-4 bg-muted rounded w-12"></div></th>
                  <th className="px-6 py-3"><div className="h-4 bg-muted rounded w-16"></div></th>
                  <th className="px-6 py-3"><div className="h-4 bg-muted rounded w-16"></div></th>
                  <th className="px-6 py-3"><div className="h-4 bg-muted rounded w-20"></div></th>
                  <th className="px-6 py-3"><div className="h-4 bg-muted rounded w-16"></div></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...Array(3)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><div className="h-6 w-6 bg-muted rounded-full"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-12"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-12"></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* User detail card skeleton */}
        <div className="bg-card p-6 rounded-lg shadow-sm border border-border animate-pulse">
          <div className="h-6 bg-muted rounded w-48 mb-6"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="text-center">
                <div className="h-6 bg-muted rounded w-16 mx-auto mb-2"></div>
                <div className="h-4 bg-muted rounded w-12 mx-auto"></div>
              </div>
            ))}
          </div>
          <div className="h-10 bg-muted rounded w-32"></div>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="bg-card p-8 rounded-lg shadow-sm border border-border text-center">
        <div className="text-destructive mb-4">
          <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-card-foreground mb-2">Failed to Load Period Data</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <button
          onClick={() => fetchSummary()}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with period info */}
      <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-card-foreground">
            Current Period: {formatDate(summary.period.startAt)} → Now
          </h2>
          <button
            onClick={() => fetchSummary(true)}
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
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{formatCurrency(summary.totals.totalCost)}</div>
            <div className="text-sm text-muted-foreground">Total Cost</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{summary.totals.userCount}</div>
            <div className="text-sm text-muted-foreground">Active Users</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {myUser ? formatCurrency(myUser.cost) : '$0.00'}
            </div>
            <div className="text-sm text-muted-foreground">
              Your Cost ({myUser ? (myUser.share * 100).toFixed(2) : '0.00'}%)
            </div>
          </div>
        </div>
      </div>

      {/* Ranking Table */}
      <RankingTable 
        ranking={summary.ranking}
        title="User Ranking"
      />

      {/* User Detail Card */}
      <UserDetailCard 
        periodIndex={period.index}
        apiKey={apiKey}
        userId={userId}
      />
    </div>
  );
}