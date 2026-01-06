import { useState, useEffect } from 'react';
import { CurrentPeriod } from './CurrentPeriod';
import { HistoricalPeriods } from './HistoricalPeriods';
import { AIAccounts } from './AIAccounts';

interface DashboardProps {
  apiKey: string;
  userId: string;
  onLogout: () => void;
}

interface Period {
  index: number;
  startSnapshotId: number | null;
  startAt: string | null;
  endAt: string | null;
  isCurrent: boolean;
}

export function Dashboard({ apiKey, userId, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'current' | 'historical'>('current');
  const [periods, setPeriods] = useState<Period[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchPeriods();
  }, []);

  const fetchPeriods = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/periods', {
        headers: {
          'X-API-Key': apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch periods: ${response.status}`);
      }

      const data = await response.json();
      setPeriods(data.periods || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load periods');
    } finally {
      setIsLoading(false);
    }
  };

  const currentPeriod = periods.find(p => p.isCurrent);
  const historicalPeriods = periods.filter(p => !p.isCurrent);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-muted-foreground mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-card p-8 rounded-lg shadow-sm border border-border max-w-md w-full mx-4">
          <div className="text-center">
            <svg className="h-12 w-12 text-destructive mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="text-lg font-medium text-card-foreground mb-2">Error Loading Dashboard</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              onClick={fetchPeriods}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card shadow-sm border-b border-border">
        <div className="container mx-auto px-4 lg:px-8 max-w-6xl">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-semibold text-card-foreground">Claude Code Usage Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={onLogout}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 lg:px-8 max-w-6xl py-8">
        <AIAccounts apiKey={apiKey} />

        <div className="mb-6">
          <div className="border-b border-border">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('current')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'current'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                Current Period
              </button>
              <button
                onClick={() => setActiveTab('historical')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'historical'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                Historical Periods
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'current' && currentPeriod && (
          <CurrentPeriod 
            period={currentPeriod}
            apiKey={apiKey}
            userId={userId}
          />
        )}

        {activeTab === 'historical' && (
          <HistoricalPeriods 
            periods={historicalPeriods}
            apiKey={apiKey}
            userId={userId}
          />
        )}

        {activeTab === 'current' && !currentPeriod && (
          <div className="bg-card p-8 rounded-lg shadow-sm border border-border text-center">
            <p className="text-muted-foreground">No current period found. This happens when there are no billing snapshots yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}