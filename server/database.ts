import { Database } from "bun:sqlite";

export interface BillingSnapshot {
  id: number;
  created_at: string;
  timezone: string;
  raw_json: string;
}

export class DatabaseManager {
  private db: Database;

  constructor(dbPath: string = "./app.db") {
    this.db = new Database(dbPath);
    this.initDatabase();
  }

  private initDatabase() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS billing_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT NOT NULL,
        timezone TEXT NOT NULL DEFAULT 'Asia/Shanghai',
        raw_json TEXT NOT NULL
      )
    `);
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_billing_snapshots_created_at ON billing_snapshots(created_at)
    `);
  }

  insertSnapshot(rawJson: string, timezone: string = 'Asia/Shanghai'): number {
    const stmt = this.db.prepare(`
      INSERT INTO billing_snapshots (created_at, timezone, raw_json)
      VALUES (?, ?, ?)
    `);
    
    const result = stmt.run(
      new Date().toISOString(),
      timezone,
      rawJson
    );
    
    return result.lastInsertRowid as number;
  }

  getSnapshots(): BillingSnapshot[] {
    const stmt = this.db.prepare(`
      SELECT id, created_at, timezone, raw_json 
      FROM billing_snapshots 
      ORDER BY datetime(created_at) ASC
    `);
    
    return stmt.all() as BillingSnapshot[];
  }

  getSnapshotById(id: number): BillingSnapshot | null {
    const stmt = this.db.prepare(`
      SELECT id, created_at, timezone, raw_json 
      FROM billing_snapshots 
      WHERE id = ?
    `);
    
    return stmt.get(id) as BillingSnapshot | null;
  }

  getLatestSnapshot(): BillingSnapshot | null {
    const stmt = this.db.prepare(`
      SELECT id, created_at, timezone, raw_json 
      FROM billing_snapshots 
      ORDER BY datetime(created_at) DESC 
      LIMIT 1
    `);
    
    return stmt.get() as BillingSnapshot | null;
  }

  close() {
    this.db.close();
  }
}

export const db = new DatabaseManager(process.env.DATABASE_URL || "./app.db");