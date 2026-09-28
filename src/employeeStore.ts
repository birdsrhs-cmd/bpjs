import fs from 'fs';
import path from 'path';
import { Employee, DeltaRecord } from './types.ts';

export interface EmployeeRecord extends Employee {
  kpj?: string; // BPJS Ketenagakerjaan number (11 digits)
  salary: number; // Monthly base salary for BPJS contribution calculation
  email: string;
  phone: string;
  birthDate: string; // YYYY-MM-DD
  gender: 'L' | 'P';
  maritialStatus?: 'TK' | 'K0' | 'K1' | 'K2' | 'K3';
  faskesCode?: string; // First-level healthcare clinic code for EDABU
  notes?: string;
  updatedAt?: string;
}

const DEFAULT_EMPLOYEES: EmployeeRecord[] = [
  {
    nik: '3201011508920001',
    name: 'Budi Santoso',
    nomorPeserta: '0001234567891',
    kpj: '19082345671',
    status: 'ACTIVE',
    joinedDate: '2023-03-01',
    position: 'Senior Software Engineer',
    department: 'Engineering',
    salary: 18500000,
    email: 'budi.santoso@perusahaan.co.id',
    phone: '081234567801',
    birthDate: '1992-08-15',
    gender: 'L',
    maritialStatus: 'K1',
    faskesCode: '0112B001'
  },
  {
    nik: '3201024504950002',
    name: 'Siti Rahmawati',
    nomorPeserta: '0001234567892',
    kpj: '19082345672',
    status: 'ACTIVE',
    joinedDate: '2023-06-15',
    position: 'HR Compensation & Benefit Specialist',
    department: 'Human Capital',
    salary: 12000000,
    email: 'siti.rahmawati@perusahaan.co.id',
    phone: '081234567802',
    birthDate: '1995-04-25',
    gender: 'P',
    maritialStatus: 'TK',
    faskesCode: '0112B002'
  },
  {
    nik: '3171032010900003',
    name: 'Ahmad Fauzi',
    nomorPeserta: '0001234567893',
    kpj: '19082345673',
    status: 'ACTIVE',
    joinedDate: '2022-01-10',
    position: 'Finance Operations Lead',
    department: 'Finance',
    salary: 16000000,
    email: 'ahmad.fauzi@perusahaan.co.id',
    phone: '081234567803',
    birthDate: '1990-10-20',
    gender: 'L',
    maritialStatus: 'K2',
    faskesCode: '0112B001'
  },
  {
    nik: '3273056003980004',
    name: 'Dewi Lestari',
    nomorPeserta: '0001234567894',
    kpj: '19082345674',
    status: 'RESIGNED',
    joinedDate: '2023-09-01',
    position: 'UI/UX Designer',
    department: 'Product Design',
    salary: 11000000,
    email: 'dewi.lestari@perusahaan.co.id',
    phone: '081234567804',
    birthDate: '1998-03-20',
    gender: 'P',
    maritialStatus: 'TK',
    faskesCode: '0112B003',
    notes: 'Resigned effective 15 September 2026. Needs deactivation on EDABU & SIPP.'
  },
  {
    nik: '3174021107970005',
    name: 'Reza Pratama',
    nomorPeserta: '',
    kpj: '',
    status: 'NEW',
    joinedDate: '2026-09-01',
    position: 'DevOps Engineer',
    department: 'Infrastructure',
    salary: 17000000,
    email: 'reza.pratama@perusahaan.co.id',
    phone: '081234567805',
    birthDate: '1997-07-11',
    gender: 'L',
    maritialStatus: 'TK',
    faskesCode: '0112B001',
    notes: 'New hire batch September 2026. Auto-enrollment required.'
  },
  {
    nik: '3204126809960006',
    name: 'Putri Ayu Wandira',
    nomorPeserta: '',
    kpj: '',
    status: 'NEW',
    joinedDate: '2026-09-15',
    position: 'Quality Assurance Analyst',
    department: 'Engineering',
    salary: 9500000,
    email: 'putri.wandira@perusahaan.co.id',
    phone: '081234567806',
    birthDate: '1996-09-28',
    gender: 'P',
    maritialStatus: 'TK',
    faskesCode: '0112B004',
    notes: 'New hire batch September 2026. Auto-enrollment required.'
  },
  {
    nik: '3374011202880007',
    name: 'Hendra Gunawan',
    nomorPeserta: '0001234567897',
    kpj: '19082345677',
    status: 'CHANGED',
    joinedDate: '2021-08-01',
    position: 'VP of Technology',
    department: 'Engineering',
    salary: 32000000,
    email: 'hendra.gunawan@perusahaan.co.id',
    phone: '081234567807',
    birthDate: '1988-02-12',
    gender: 'L',
    maritialStatus: 'K3',
    faskesCode: '0112B001',
    notes: 'Salary adjustment from 28M to 32M effective this period (BPJS cap adjustment).'
  }
];

class EmployeeStore {
  private employees: EmployeeRecord[] = [];
  private dataDir = './logs/data';
  private filePath = path.join(this.dataDir, 'employees.json');

  constructor() {
    this.ensureDir();
    this.load();
  }

  private ensureDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.employees = parsed;
          return;
        }
      }
    } catch {
      // fallback
    }
    this.employees = [...DEFAULT_EMPLOYEES];
    this.save();
  }

  public save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.employees, null, 2), 'utf-8');
    } catch (err) {
      console.error('[EmployeeStore] Failed to save employees:', err);
    }
  }

  public getAll(): EmployeeRecord[] {
    return [...this.employees];
  }

  public getByNik(nik: string): EmployeeRecord | undefined {
    return this.employees.find(e => e.nik === nik);
  }

  public add(record: EmployeeRecord): { success: boolean; message: string } {
    if (this.employees.some(e => e.nik === record.nik)) {
      return { success: false, message: `Karyawan dengan NIK ${record.nik} sudah terdaftar` };
    }
    this.employees.push({
      ...record,
      updatedAt: new Date().toISOString()
    });
    this.save();
    return { success: true, message: `Karyawan ${record.name} berhasil ditambahkan` };
  }

  public update(nik: string, updates: Partial<EmployeeRecord>): { success: boolean; message: string } {
    const idx = this.employees.findIndex(e => e.nik === nik);
    if (idx === -1) {
      return { success: false, message: `Karyawan dengan NIK ${nik} tidak ditemukan` };
    }
    this.employees[idx] = {
      ...this.employees[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.save();
    return { success: true, message: `Data karyawan ${this.employees[idx].name} diperbarui` };
  }

  public delete(nik: string): boolean {
    const before = this.employees.length;
    this.employees = this.employees.filter(e => e.nik !== nik);
    if (this.employees.length !== before) {
      this.save();
      return true;
    }
    return false;
  }

  public resetToDefault() {
    this.employees = [...DEFAULT_EMPLOYEES];
    this.save();
  }
}

export const employeeStore = new EmployeeStore();
