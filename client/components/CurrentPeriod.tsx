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
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchSummary();
  }, [period.index]);

  const fetchSummary = async () => {
    setIsLoading(true);
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
      setIsLoading(false);
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
        <div className="bg-card p-6 rounded-lg shadow-sm border border-border animate-pulse">
          <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-20 bg-muted rounded"></div>
            <div className="h-20 bg-muted rounded"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
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
          onClick={fetchSummary}
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
        <h2 className="text-lg font-semibold text-card-foreground mb-4">
          Current Period: {formatDate(summary.period.startAt)} → {formatDate(summary.period.endAt, true)}
        </h2>
        
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