import { db } from './database';
import { apiClient } from './api-client';

export interface UserData {
  id: string;
  name: string;
  usage: {
    total: {
      cost: number;
      tokens: number;
      inputTokens: number;
      outputTokens: number;
      cacheCreateTokens: number;
      cacheReadTokens: number;
      requests: number;
      formattedCost: string;
    };
  };
  [key: string]: any;
}

export interface PeriodInfo {
  index: number;
  startSnapshotId: number | null;
  startAt: string | null;
  endAt: string | null;
  isCurrent: boolean;
}

export interface UserRanking {
  id: string;
  name: string;
  cost: number;
  share: number;
  isMe: boolean;
  rawStart: UserData | null;
  rawEnd: UserData | null;
  periodTokens: number;
  periodRequests: number;
}

export interface PeriodSummary {
  period: PeriodInfo;
  totals: {
    totalCost: number;
    userCount: number;
  };
  ranking: UserRanking[];
}

export interface UserDetail {
  id: string;
  name: string;
  startCost: number;
  endCost: number;
  deltaCost: number;
  raw: {
    start: UserData | null;
    end: UserData | null;
  };
}

function mapFromDataArray(data: UserData[]): Map<string, UserData> {
  const m = new Map<string, UserData>();
  for (const u of data ?? []) m.set(u.id, u);
  return m;
}

function computePeriodDelta(startData: UserData[], endData: UserData[], meId?: string) {
  const start = mapFromDataArray(startData);
  const end = mapFromDataArray(endData);

  const ids = new Set<string>([...Array.from(start.keys()), ...Array.from(end.keys())]);
  const users: UserRanking[] = [];
  
  for (const id of Array.from(ids)) {
    const endU = end.get(id);
    if (!endU) continue; // 删除用户：不计入

    const startU = start.get(id);
    const startCost = Number(startU?.usage?.total?.cost ?? 0);
    const endCost = Number(endU?.usage?.total?.cost ?? 0);
    const startTokens = Number(startU?.usage?.total?.tokens ?? 0);
    const endTokens = Number(endU?.usage?.total?.tokens ?? 0);
    const startRequests = Number(startU?.usage?.total?.requests ?? 0);
    const endRequests = Number(endU?.usage?.total?.requests ?? 0);

    let delta = endCost - startCost;
    if (!Number.isFinite(delta) || delta < 0) delta = 0;
    
    let deltaTokens = endTokens - startTokens;
    if (!Number.isFinite(deltaTokens) || deltaTokens < 0) deltaTokens = 0;
    
    let deltaRequests = endRequests - startRequests;
    if (!Number.isFinite(deltaRequests) || deltaRequests < 0) deltaRequests = 0;

    users.push({
      id: meId === id ? id : '', // Only include ID for current user
      name: endU.name || 'User',
      cost: +delta.toFixed(6),
      share: 0, // will be calculated below
      isMe: meId === id,
      rawStart: start.get(id) ?? null,
      rawEnd: endU,
      periodTokens: deltaTokens,
      periodRequests: deltaRequests
    });
  }

  const totalCost = users.reduce((s, u) => s + u.cost, 0);
  for (const u of users) u.share = totalCost > 0 ? u.cost / totalCost : 0;
  users.sort((a, b) => b.cost - a.cost);

  const me = meId ? users.find(u => u.id === meId) : null;

  return { users, totalCost: +totalCost.toFixed(6), me };
}

export class BillingCalculator {
  async getPeriods(): Promise<PeriodInfo[]> {
    const snapshots = db.getSnapshots();
    const periods: PeriodInfo[] = [];

    if (snapshots.length === 0) {
      // No snapshots case: only current period from beginning
      periods.push({
        index: 0,
        startSnapshotId: null,
        startAt: null,
        endAt: null,
        isCurrent: true
      });
    } else {
      // Add current period (last snapshot to now)
      const lastSnapshot = snapshots[snapshots.length - 1];
      if (lastSnapshot) {
        periods.push({
          index: snapshots.length,
          startSnapshotId: lastSnapshot.id,
          startAt: lastSnapshot.created_at,
          endAt: null,
          isCurrent: true
        });
      }

      // Add first historical period: from beginning to first snapshot
      const firstSnapshot = snapshots[0];
      if (firstSnapshot) {
        periods.push({
          index: 0,
          startSnapshotId: null,
          startAt: null,
          endAt: firstSnapshot.created_at,
          isCurrent: false
        });
      }

      // Add other historical periods: from snapshot to snapshot
      for (let i = 1; i < snapshots.length; i++) {
        const startSnapshot = snapshots[i - 1];
        const endSnapshot = snapshots[i];
        
        if (startSnapshot && endSnapshot) {
          periods.push({
            index: i,
            startSnapshotId: startSnapshot.id,
            startAt: startSnapshot.created_at,
            endAt: endSnapshot.created_at,
            isCurrent: false
          });
        }
      }
    }

    return periods;
  }

  async getPeriodSummary(periodIndex: number, meId?: string): Promise<PeriodSummary> {
    const periods = await this.getPeriods();
    const period = periods.find(p => p.index === periodIndex);
    
    if (!period) {
      throw new Error(`Period ${periodIndex} not found`);
    }

    let startData: UserData[] = [];
    let endData: UserData[] = [];

    if (period.index === 0) {
      // First historical period: start from 0, end with first snapshot
      if (period.endAt) {
        // There is a snapshot - find it and use it as endData
        const snapshots = db.getSnapshots();
        const endSnapshot = snapshots.find(s => s.created_at === period.endAt);
        if (endSnapshot) {
          // Handle double JSON encoding issue
          let rawData = endSnapshot.raw_json;
          if (typeof rawData === 'string' && rawData.startsWith('"')) {
            rawData = JSON.parse(rawData);
          }
          endData = JSON.parse(rawData);
        }
      } else {
        // No snapshots case: start from 0, end with current data
        endData = await apiClient.getCurrentCosts();
      }
    } else if (period.isCurrent) {
      // Current period: start from latest snapshot data, end with current data
      const startSnapshot = db.getSnapshotById(period.startSnapshotId!);
      if (startSnapshot) {
        // Handle double JSON encoding issue
        let rawData = startSnapshot.raw_json;
        if (typeof rawData === 'string' && rawData.startsWith('"')) {
          rawData = JSON.parse(rawData);
        }
        startData = JSON.parse(rawData);
      }
      endData = await apiClient.getCurrentCosts();
    } else {
      // Historical period: both start and end from snapshots
      const startSnapshot = db.getSnapshotById(period.startSnapshotId!);
      if (startSnapshot) {
        // Handle double JSON encoding issue
        let rawData = startSnapshot.raw_json;
        if (typeof rawData === 'string' && rawData.startsWith('"')) {
          rawData = JSON.parse(rawData);
        }
        startData = JSON.parse(rawData);
      }

      const snapshots = db.getSnapshots();
      const endSnapshotIndex = snapshots.findIndex(s => s.created_at === period.endAt);
      if (endSnapshotIndex !== -1 && snapshots[endSnapshotIndex]) {
        // Handle double JSON encoding issue
        let rawData = snapshots[endSnapshotIndex]!.raw_json;
        if (typeof rawData === 'string' && rawData.startsWith('"')) {
          rawData = JSON.parse(rawData);
        }
        endData = JSON.parse(rawData);
      }
    }

    const result = computePeriodDelta(startData, endData, meId);

    return {
      period: {
        ...period,
        endAt: period.endAt || new Date().toISOString()
      },
      totals: {
        totalCost: result.totalCost,
        userCount: result.users.filter(u => u.cost > 0).length
      },
      ranking: result.users
    };
  }

  async getUserDetail(periodIndex: number, meId: string): Promise<UserDetail> {
    const summary = await this.getPeriodSummary(periodIndex, meId);
    const me = summary.ranking.find(u => u.id === meId);
    
    if (!me) {
      throw new Error('User not found in this period (possibly deleted)');
    }

    return {
      id: me.id,
      name: me.name,
      startCost: Number(me.rawStart?.usage?.total?.cost ?? 0),
      endCost: Number(me.rawEnd?.usage?.total?.cost ?? 0),
      deltaCost: me.cost,
      raw: {
        start: me.rawStart,
        end: me.rawEnd
      }
    };
  }
}

export const billingCalculator = new BillingCalculator();