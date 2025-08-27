import React, { useState, useEffect } from 'react';

interface UserDetail {
  id: string;
  name: string;
  startCost: number;
  endCost: number;
  deltaCost: number;
  raw: {
    start: any;
    end: any;
  };
}

interface UserDetailCardProps {
  periodIndex: number;
  apiKey: string;
  userId: string;
}

export function UserDetailCard({ periodIndex, apiKey, userId }: UserDetailCardProps) {
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showRawData, setShowRawData] = useState(false);

  useEffect(() => {
    fetchUserDetail();
  }, [periodIndex]);

  const fetchUserDetail = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/periods/${periodIndex}/me`, {
        headers: {
          'X-API-Key': apiKey,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('You are not found in this period (possibly deleted)');
        }
        throw new Error(`Failed to fetch user details: ${response.status}`);
      }

      const data = await response.json();
      setUserDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user details');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const calculateDelta = (endValue: number, startValue: number) => {
    const delta = endValue - startValue;
    return Math.max(0, delta); // Negative values treated as 0
  };

  if (isLoading) {
    return (
      <div className="bg-card p-6 rounded-lg shadow-sm border border-border animate-pulse">
        <div className="h-6 bg-muted rounded w-1/4 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-16 bg-muted rounded"></div>
          <div className="h-16 bg-muted rounded"></div>
          <div className="h-16 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
        <h3 className="text-lg font-medium text-card-foreground mb-4">Your Usage Details</h3>
        <div className="bg-chart-3/20 border border-chart-3/50 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-chart-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-chart-3">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!userDetail) return null;

  const endUsage = userDetail.raw.end?.usage?.total;
  const startUsage = userDetail.raw.start?.usage?.total;

  return (
    <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-card-foreground">Your Usage Details</h3>
        <button
          onClick={() => setShowRawData(!showRawData)}
          className="text-sm text-muted-foreground hover:text-card-foreground transition-colors"
        >
          {showRawData ? 'Hide Raw Data' : 'Show Raw Data'}
        </button>
      </div>

      {/* Cost Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="text-center p-4 bg-muted/50 rounded-lg">
          <div className="text-lg font-semibold text-card-foreground">{formatCurrency(userDetail.startCost)}</div>
          <div className="text-sm text-muted-foreground">Start Cost</div>
        </div>
        <div className="text-center p-4 bg-muted/50 rounded-lg">
          <div className="text-lg font-semibold text-card-foreground">{formatCurrency(userDetail.endCost)}</div>
          <div className="text-sm text-muted-foreground">End Cost</div>
        </div>
        <div className="text-center p-4 bg-primary/10 rounded-lg">
          <div className="text-lg font-semibold text-primary">{formatCurrency(userDetail.deltaCost)}</div>
          <div className="text-sm text-primary">Period Cost</div>
        </div>
      </div>

      {/* Usage Metrics */}
      {endUsage && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-lg font-semibold text-card-foreground">
              {formatNumber(calculateDelta(endUsage.requests || 0, startUsage?.requests || 0))}
            </div>
            <div className="text-sm text-muted-foreground">Requests</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-card-foreground">
              {formatNumber(calculateDelta(endUsage.tokens || 0, startUsage?.tokens || 0))}
            </div>
            <div className="text-sm text-muted-foreground">Total Tokens</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-card-foreground">
              {formatNumber(calculateDelta(endUsage.inputTokens || 0, startUsage?.inputTokens || 0))}
            </div>
            <div className="text-sm text-muted-foreground">Input Tokens</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-card-foreground">
              {formatNumber(calculateDelta(endUsage.outputTokens || 0, startUsage?.outputTokens || 0))}
            </div>
            <div className="text-sm text-muted-foreground">Output Tokens</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-card-foreground">
              {formatNumber(calculateDelta(endUsage.cacheCreateTokens || 0, startUsage?.cacheCreateTokens || 0))}
            </div>
            <div className="text-sm text-muted-foreground">Cache Create</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-card-foreground">
              {formatNumber(calculateDelta(endUsage.cacheReadTokens || 0, startUsage?.cacheReadTokens || 0))}
            </div>
            <div className="text-sm text-muted-foreground">Cache Read</div>
          </div>
        </div>
      )}

      {/* Raw Data */}
      {showRawData && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-card-foreground mb-2">Period Start Data</h4>
            <pre className="text-xs bg-muted/50 p-4 rounded-lg overflow-x-auto border border-border">
              {JSON.stringify(userDetail.raw.start, null, 2)}
            </pre>
          </div>
          <div>
            <h4 className="text-sm font-medium text-card-foreground mb-2">Period End Data</h4>
            <pre className="text-xs bg-muted/50 p-4 rounded-lg overflow-x-auto border border-border">
              {JSON.stringify(userDetail.raw.end, null, 2)}
            </pre>
          </div>
        </div>
      )}

    </div>
  );
}