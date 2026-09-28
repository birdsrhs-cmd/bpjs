import { employeeStore, EmployeeRecord } from './employeeStore.ts';
import { auditSnapshotStore, formatJakartaDate, getCurrentPeriodJakarta } from './auditSnapshot.ts';

export interface ValidationRecord {
  nik: string;
  name: string;
  deltaStatus: 'NEW' | 'ACTIVE' | 'CHANGED' | 'RESIGNED' | 'TERMINATED';
  isValid: boolean;
  errors: string[];
  currentData: EmployeeRecord;
}

export interface ValidationSummary {
  total: number;
  valid: number;
  invalid: number;
  new: number;
  resigned: number;
  changed: number;
  active: number;
}

export interface ValidationResult {
  period: string;
  timestamp: string;
  summary: ValidationSummary;
  records: ValidationRecord[];
}

class BPJSSyncEngine {
  /**
   * Run BPJS business rules validation on employee records for a given period
   */
  public runValidation(period?: string): ValidationResult {
    const targetPeriod = period || getCurrentPeriodJakarta();
    const allEmployees = employeeStore.getAll();
    const records: ValidationRecord[] = [];

    let validCount = 0;
    let invalidCount = 0;
    let newCount = 0;
    let resignedCount = 0;
    let changedCount = 0;
    let activeCount = 0;

    for (const emp of allEmployees) {
      const errors: string[] = [];

      // Rule 1: NIK must be exactly 16 digits
      if (!emp.nik || !/^\d{16}$/.test(emp.nik)) {
        errors.push(`NIK "${emp.nik || ''}" harus terdiri dari 16 digit angka`);
      }

      // Rule 2: Name must not be blank
      if (!emp.name || emp.name.trim().length < 3) {
        errors.push('Nama karyawan minimal 3 karakter');
      }

      // Rule 3: Salary must be positive
      if (typeof emp.salary !== 'number' || emp.salary <= 0) {
        errors.push('Gaji pokok harus bernilai lebih dari 0 untuk dasar iuran BPJS');
      }

      // Rule 4: For existing active participants, BPJS number check
      if (emp.status === 'ACTIVE') {
        if (emp.nomorPeserta && !/^\d{13}$/.test(emp.nomorPeserta)) {
          errors.push('Nomor Peserta BPJS Kesehatan harus 13 digit angka');
        }
        if (emp.kpj && !/^\d{11}$/.test(emp.kpj)) {
          errors.push('Nomor KPJ BPJS Ketenagakerjaan harus 11 digit angka');
        }
      }

      // Delta classification
      let deltaStatus: 'NEW' | 'ACTIVE' | 'CHANGED' | 'RESIGNED' | 'TERMINATED' = 'ACTIVE';
      if (emp.status === 'NEW') {
        deltaStatus = 'NEW';
        newCount++;
      } else if (emp.status === 'RESIGNED') {
        deltaStatus = 'RESIGNED';
        resignedCount++;
      } else if (emp.status === 'TERMINATED') {
        deltaStatus = 'TERMINATED';
        resignedCount++;
      } else if (emp.status === 'CHANGED') {
        deltaStatus = 'CHANGED';
        changedCount++;
      } else {
        activeCount++;
      }

      const isValid = errors.length === 0;
      if (isValid) {
        validCount++;
      } else {
        invalidCount++;
      }

      records.push({
        nik: emp.nik,
        name: emp.name,
        deltaStatus,
        isValid,
        errors,
        currentData: emp
      });
    }

    return {
      period: targetPeriod,
      timestamp: formatJakartaDate(),
      summary: {
        total: allEmployees.length,
        valid: validCount,
        invalid: invalidCount,
        new: newCount,
        resigned: resignedCount,
        changed: changedCount,
        active: activeCount
      },
      records
    };
  }

  /**
   * Log validation execution to audit log
   */
  public logValidationRun(result: ValidationResult, triggerBy: string = 'BPJS_AGENT') {
    auditSnapshotStore.addAuditLog({
      nik: 'SYSTEM',
      nama: 'BPJS Sync Engine',
      action: 'DATA_VALIDATION_COMPLETED',
      old_value: `Period: ${result.period}`,
      new_value: `Total: ${result.summary.total} (Valid: ${result.summary.valid}, Invalid: ${result.summary.invalid})`,
      status: result.summary.invalid === 0 ? 'SUCCESS' : 'FAILED',
      source: 'SYNC_ENGINE',
      user_or_system: triggerBy
    });
  }
}

export const bpjsSyncEngine = new BPJSSyncEngine();
