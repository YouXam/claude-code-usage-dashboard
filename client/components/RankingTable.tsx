// React is used in JSX, TypeScript just doesn't detect it

interface RankingUser {
  id: string;
  name: string;
  cost: number;
  share: number;
  isMe: boolean;
  rawStart: any;
  rawEnd: any;
  periodTokens: number;
  periodRequests: number;
}

interface RankingTableProps {
  ranking: RankingUser[];
  title: string;
}

export function RankingTable({ ranking, title }: RankingTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercentage = (ratio: number) => {
    return (ratio * 100).toFixed(2) + '%';
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-chart-1/20 text-chart-1 rounded-full">
          🥇 1st
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-chart-2/20 text-chart-2 rounded-full">
          🥈 2nd
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-muted text-muted-foreground rounded-full">
          🥉 3rd
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-muted text-muted-foreground rounded-full">
        #{rank}
      </span>
    );
  };

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-lg font-medium text-card-foreground">{title}</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Rank
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                User
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Cost
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Share
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Requests
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Tokens
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {ranking.map((user, index) => {
              const rank = index + 1;
              
              return (
                <tr
                  key={user.isMe ? user.id : `user-${index}`}
                  className={`${
                    user.isMe ? 'bg-primary/10 border-l-4 border-l-primary' : ''
                  } hover:bg-muted/50 transition-colors`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRankBadge(rank)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-card-foreground">
                          {user.name}
                          {user.isMe && (
                            <span className="ml-2 inline-flex items-center px-2 py-1 text-xs font-medium bg-primary/20 text-primary rounded-full">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-semibold text-primary">
                      {formatCurrency(user.cost)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm text-card-foreground">
                      {formatPercentage(user.share)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm text-card-foreground">
                      {formatNumber(user.periodRequests)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm text-card-foreground">
                      {formatNumber(user.periodTokens)}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {ranking.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-card-foreground">No data available</h3>
          <p className="mt-1 text-sm text-muted-foreground">There are no users in this billing period.</p>
        </div>
      )}
    </div>
  );
}