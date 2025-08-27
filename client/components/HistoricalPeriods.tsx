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

interface HistoricalPeriodsProps {
  periods: Period[];
  apiKey: string;
  userId: string;
}

export function HistoricalPeriods({ periods, apiKey, userId }: HistoricalPeriodsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);
  const [summary, setSummary] = useState<PeriodSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (periods.length > 0 && !selectedPeriod) {
      setSelectedPeriod(periods[0] || null); // Select the most recent historical period
    }
  }, [periods]);

  useEffect(() => {
    if (selectedPeriod) {
      fetchSummary(selectedPeriod.index);
    }
  }, [selectedPeriod]);

  const fetchSummary = async (periodIndex: number) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/periods/${periodIndex}/summary`, {
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
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown';
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

  const formatDateRange = (startAt: string | null, endAt: string | null) => {
    return `${formatDate(startAt)} → ${formatDate(endAt)}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (periods.length === 0) {
    return (
      <div className="bg-card p-8 rounded-lg shadow-sm border border-border text-center">
        <svg className="mx-auto h-12 w-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-2 text-lg font-medium text-card-foreground">No Historical Periods</h3>
        <p className="mt-1 text-muted-foreground">
          Historical periods will appear here after you create billing snapshots using the <code>bun begin-period</code> command.
        </p>
      </div>
    );
  }

  const myUser = summary?.ranking.find(u => u.isMe);

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
        <label htmlFor="period-select" className="block text-lg font-medium text-card-foreground mb-4">
          Select Historical Period
        </label>
        <select
          id="period-select"
          value={selectedPeriod?.index ?? ''}
          onChange={(e) => {
            const periodIndex = parseInt(e.target.value);
            const period = periods.find(p => p.index === periodIndex);
            setSelectedPeriod(period || null);
          }}
          className="block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring sm:text-sm bg-background text-foreground"
        >
          {periods.map((period) => (
            <option key={period.index} value={period.index}>
              Period #{period.index} - {formatDateRange(period.startAt, period.endAt)}
            </option>
          ))}
        </select>
      </div>

      {selectedPeriod && (
        <>
          {/* Period Summary */}
          {isLoading ? (
            <div className="bg-card p-6 rounded-lg shadow-sm border border-border animate-pulse">
              <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="h-20 bg-muted rounded"></div>
                <div className="h-20 bg-muted rounded"></div>
                <div className="h-20 bg-muted rounded"></div>
              </div>
            </div>
          ) : error ? (
            <div className="bg-card p-8 rounded-lg shadow-sm border border-border text-center">
              <div className="text-destructive mb-4">
                <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-card-foreground mb-2">Failed to Load Period Data</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <button
                onClick={() => fetchSummary(selectedPeriod.index)}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : summary && (
            <>
              <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
                <h2 className="text-lg font-semibold text-card-foreground mb-4">
                  Period #{selectedPeriod.index}: {formatDateRange(summary.period.startAt, summary.period.endAt)}
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{formatCurrency(summary.totals.totalCost)}</div>
                    <div className="text-sm text-muted-foreground">Total Cost</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-card-foreground">{summary.totals.userCount}</div>
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
                title={`Period #${selectedPeriod.index} Ranking`}
              />

              {/* User Detail Card */}
              <UserDetailCard 
                periodIndex={selectedPeriod.index}
                apiKey={apiKey}
                userId={userId}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}