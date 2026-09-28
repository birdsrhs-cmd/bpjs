/**
 * BPJS Autonomous Agent - Type Definitions
 */

export interface Employee {
  nik: string;
  name: string;
  nomorPeserta?: string; // BPJS participant number (if already registered)
  status: 'NEW' | 'ACTIVE' | 'CHANGED' | 'RESIGNED' | 'TERMINATED' | 'UNKNOWN';
  joinedDate?: string;   // YYYY-MM-DD
  position?: string;
  department?: string;
}

export interface DeltaRecord {
  nik: string;
  name: string;
  status: 'NEW' | 'CHANGED' | 'RESIGNED' | 'TERMINATED';
  changes?: {
    field: string;
    oldValue?: string;
    newValue?: string;
  }[];
}

export interface DataSet {
  metadata: {
    source: string;
    generatedAt: string; // YYYY-MM-DD
    period: string;       // e.g. "2026-09"
    totalRecords: number;
  };
  employees: Employee[];
  deltas: DeltaRecord[];
}

export type PortalName = 'EDABU' | 'SIPP';

export interface SyncRequest {
  datasetId: string;
  period: string;
  employees: Employee[];
  deltas: DeltaRecord[];
}

export interface SyncResult {
  success: boolean;
  datasetId: string;
  period: string;
  edabu: {
    loggedIn: boolean;
    uploaded: number;
    failed: number;
    errors: string[];
  };
  sipp: {
    loggedIn: boolean;
    uploaded: number;
    failed: number;
    errors: string[];
  };
  summary: string;
  timestamp: string;
}
