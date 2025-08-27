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

interface PeriodOption {
  period: Period;
  totalCost: number | null; // null means still loading
}

export function HistoricalPeriods({ periods, apiKey, userId }: HistoricalPeriodsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);
  const [summary, setSummary] = useState<PeriodSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [periodOptions, setPeriodOptions] = useState<PeriodOption[]>([]);
  const [isSelectOpen, setIsSelectOpen] = useState(false);

  // Fetch total costs for all periods
  useEffect(() => {
    const fetchAllPeriodCosts = async () => {
      if (periods.length === 0) return;
      
      // Initialize with loading state (totalCost: null)
      const initialOptions: PeriodOption[] = periods.map(period => ({
        period,
        totalCost: null
      }));
      setPeriodOptions(initialOptions);
      
      if (!selectedPeriod && initialOptions.length > 0) {
        setSelectedPeriod(initialOptions[0].period);
      }
      
      // Fetch costs individually to update progressively
      const updatedOptions = [...initialOptions];
      
      for (let i = 0; i < periods.length; i++) {
        const period = periods[i];
        try {
          const response = await fetch(`/api/periods/${period.index}/summary`, {
            headers: { 'X-API-Key': apiKey },
          });
          
          if (response.ok) {
            const data = await response.json();
            updatedOptions[i] = { 
              period, 
              totalCost: data.totals?.totalCost || 0 
            };
          } else {
            updatedOptions[i] = { period, totalCost: 0 };
          }
        } catch {
          updatedOptions[i] = { period, totalCost: 0 };
        }
        
        // Update state after each fetch for progressive loading
        setPeriodOptions([...updatedOptions]);
      }
    };
    
    fetchAllPeriodCosts();
  }, [periods, apiKey]);
  
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

  const formatDate = (dateString: string | null, isFirstPeriod: boolean = false) => {
    if (!dateString) return isFirstPeriod ? 'Beginning' : 'Unknown';
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

  const formatDateRange = (startAt: string | null, endAt: string | null, isFirstPeriod: boolean = false) => {
    return `${formatDate(startAt, isFirstPeriod)} → ${formatDate(endAt)}`;
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
        <label className="block text-lg font-medium text-card-foreground mb-4">
          Select Historical Period
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsSelectOpen(!isSelectOpen)}
            className="flex w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="text-foreground">
              {selectedPeriod ? (
                <span className="flex items-center justify-between w-full">
                  <span>
                    Period #{selectedPeriod.index} - {formatDateRange(
                      selectedPeriod.startAt, 
                      selectedPeriod.endAt,
                      selectedPeriod.index === 0
                    )}
                  </span>
                  <span className="ml-2 text-primary font-medium">
                    {(() => {
                      const option = periodOptions.find(opt => opt.period.index === selectedPeriod.index);
                      if (!option || option.totalCost === null) {
                        return (
                          <span className="flex items-center">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-1"></div>
                            Loading...
                          </span>
                        );
                      }
                      return formatCurrency(option.totalCost);
                    })()}
                  </span>
                </span>
              ) : (
                'Select a period...'
              )}
            </span>
            <svg
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isSelectOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {isSelectOpen && (
            <div className="absolute top-full left-0 right-0 z-50 mt-2 max-h-60 overflow-auto rounded-md border border-border bg-card shadow-lg">
              {periodOptions.map((option) => (
                <button
                  key={option.period.index}
                  onClick={() => {
                    setSelectedPeriod(option.period);
                    setIsSelectOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-3 text-sm hover:bg-accent hover:text-accent-foreground ${
                    selectedPeriod?.index === option.period.index
                      ? 'bg-accent text-accent-foreground'
                      : 'text-card-foreground'
                  }`}
                >
                  <span>
                    Period #{option.period.index} - {formatDateRange(
                      option.period.startAt, 
                      option.period.endAt,
                      option.period.index === 0
                    )}
                  </span>
                  <span className="ml-2 text-primary font-medium">
                    {option.totalCost === null ? (
                      <span className="flex items-center">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-1"></div>
                        Loading...
                      </span>
                    ) : (
                      formatCurrency(option.totalCost)
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Click overlay to close dropdown */}
        {isSelectOpen && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsSelectOpen(false)}
          />
        )}
      </div>

      {selectedPeriod && (
        <>
          {/* Period Summary */}
          {isLoading ? (
            <>
              {/* Period summary skeleton */}
              <div className="bg-card p-6 rounded-lg shadow-sm border border-border animate-pulse">
                <div className="h-6 bg-muted rounded w-1/2 mb-4"></div>
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
            </>
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
                  Period #{selectedPeriod.index}: {formatDateRange(summary.period.startAt, summary.period.endAt, selectedPeriod.index === 0)}
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