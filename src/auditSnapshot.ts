/**
 * BPJS Autonomous Agent - Audit Snapshot Store
 * 
 * Centralized audit logging for all BPJS agent operations.
 * Stores logs in-memory with optional file persistence.
 */

import fs from 'fs';
import path from 'path';

export interface AuditLogEntry {
  id?: string;
  timestamp?: string;        // YYYY-MM-DD HH:MM:SS (Jakarta)
  nik: string;
  nama: string;
  action: string;
  old_value: string;
  new_value: string;
  status: 'SUCCESS' | 'FAILED' | 'ACTIVE' | 'PENDING' | 'IN_PROGRESS';
  source: string;
  user_or_system: string;
  error_message?: string;
  metadata?: Record<string, any>;
}

class AuditSnapshotStore {
  private logs: AuditLogEntry[] = [];
  private logFilePath: string;
  private readonly LOG_DIR = './logs';

  constructor() {
    this.ensureLogDirectory();
    this.logFilePath = path.join(this.LOG_DIR, 'audit.log');
    this.loadFromDisk();
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.LOG_DIR)) {
      fs.mkdirSync(this.LOG_DIR, { recursive: true });
    }
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.logFilePath)) {
        const content = fs.readFileSync(this.logFilePath, 'utf-8');
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          this.logs = parsed;
        }
      }
    } catch {
      // Start fresh if file is corrupted
      this.logs = [];
    }
  }

  private saveToDisk(): void {
    try {
      fs.writeFileSync(this.logFilePath, JSON.stringify(this.logs, null, 2), 'utf-8');
    } catch (error) {
      console.error('[AuditSnapshot] Failed to save audit log:', error);
    }
  }

  private generateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `AUDIT-${timestamp}-${random}`;
  }

  /**
   * Add an audit log entry
   */
  public addAuditLog(entry: AuditLogEntry): string {
    const logEntry: AuditLogEntry = {
      id: this.generateId(),
      timestamp: this.getJakartaTimestamp(),
      ...entry,
    };

    this.logs.push(logEntry);

    // Keep only last 10000 entries in memory
    if (this.logs.length > 10000) {
      this.logs = this.logs.slice(-5000);
    }

    this.saveToDisk();
    return logEntry.id!;
  }

  /**
   * Get audit logs with optional filtering
   */
  public getAuditLogs(options: {
    action?: string;
    status?: string;
    source?: string;
    nik?: string;
    limit?: number;
    offset?: number;
  } = {}): AuditLogEntry[] {
    let filtered = [...this.logs];

    if (options.action) {
      filtered = filtered.filter(e => e.action.includes(options.action!));
    }
    if (options.status) {
      filtered = filtered.filter(e => e.status === options.status);
    }
    if (options.source) {
      filtered = filtered.filter(e => e.source === options.source);
    }
    if (options.nik) {
      filtered = filtered.filter(e => e.nik === options.nik);
    }

    const offset = options.offset || 0;
    const limit = options.limit || 100;
    return filtered.slice(offset, offset + limit);
  }

  /**
   * Get latest N audit logs
   */
  public getLatestLogs(count: number = 10): AuditLogEntry[] {
    return this.logs.slice(-count).reverse();
  }

  /**
   * Search audit logs by keyword
   */
  public searchAuditLogs(keyword: string): AuditLogEntry[] {
    const lowerKeyword = keyword.toLowerCase();
    return this.logs.filter(e =>
      e.action.toLowerCase().includes(lowerKeyword) ||
      e.nama.toLowerCase().includes(lowerKeyword) ||
      e.new_value.toLowerCase().includes(lowerKeyword) ||
      e.error_message?.toLowerCase().includes(lowerKeyword)
    );
  }

  /**
   * Get audit log count by status
   */
  public getStatusSummary(): Record<string, number> {
    const summary: Record<string, number> = {};
    for (const log of this.logs) {
      summary[log.status] = (summary[log.status] || 0) + 1;
    }
    return summary;
  }

  /**
   * Export audit logs (for compliance/backup)
   */
  public exportLogs(): string {
    return JSON.stringify({
      exportedAt: this.getJakartaTimestamp(),
      totalEntries: this.logs.length,
      logs: this.logs,
    }, null, 2);
  }

  /**
   * Clear all logs (use with caution - requires confirmation)
   */
  public clearLogs(confirmToken: string = ''): boolean {
    if (confirmToken !== 'CONFIRM_CLEAR_ALL') {
      throw new Error('Invalid confirmation token. Use "CONFIRM_CLEAR_ALL" to clear all logs.');
    }
    this.logs = [];
    this.saveToDisk();
    return true;
  }

  /**
   * Get Jakarta timezone timestamp
   */
  public getJakartaTimestamp(): string {
    const now = new Date();
    return AuditSnapshotStore.formatJakartaDate(now);
  }

  /**
   * Format date in Jakarta timezone
   */
  public static formatJakartaDate(date?: Date): string {
    const d = date || new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    };
    return d.toLocaleString('id-ID', options);
  }

  /**
   * Get today's date in YYYY-MM-DD format (Jakarta)
   */
  public static getJakartaDateString(): string {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    };
    const parts = now.toLocaleString('id-ID', options).split('/');
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  /**
   * Format Jakarta date for audit logs
   */
  public static formatJakartaDateTime(): string {
    const d = new Date();
    const datePart = d.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).split('/');
    const timePart = d.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    return `${datePart[2]}-${datePart[1]}-${datePart[0]} ${timePart}`;
  }
}

export const auditSnapshotStore = new AuditSnapshotStore();

export function formatJakartaDate(date?: Date): string {
  return AuditSnapshotStore.formatJakartaDate(date);
}

export function getJakartaDateString(): string {
  return AuditSnapshotStore.getJakartaDateString();
}

export function getCurrentPeriodJakarta(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
  };
  const parts = now.toLocaleString('en-CA', options).slice(0, 7); // YYYY-MM
  return parts || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}


