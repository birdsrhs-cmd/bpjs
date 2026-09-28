import React, { useState, useEffect } from 'react';
import { Users, Plus, RefreshCw, AlertCircle, CheckCircle, Search, Filter, Trash2, Edit3, ShieldAlert, RotateCcw } from 'lucide-react';
import { EmployeeRecord } from '../employeeStore.ts';

export const EmployeeDeltaView: React.FC = () => {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingNik, setEditingNik] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<EmployeeRecord>>({
    nik: '',
    name: '',
    nomorPeserta: '',
    kpj: '',
    status: 'NEW',
    position: '',
    department: '',
    salary: 10000000,
    email: '',
    phone: '',
    birthDate: '1995-01-01',
    gender: 'L',
    faskesCode: '0112B001',
    notes: ''
  });

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/agent/employees');
      const data = await res.json();
      if (data.success && Array.isArray(data.employees)) {
        setEmployees(data.employees);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const runValidation = async () => {
    setIsValidating(true);
    try {
      const res = await fetch('/api/agent/validate');
      const data = await res.json();
      if (data.success) {
        setValidationResult(data.validation);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    runValidation();
  }, []);

  const handleOpenAdd = () => {
    setEditingNik(null);
    setForm({
      nik: '',
      name: '',
      nomorPeserta: '',
      kpj: '',
      status: 'NEW',
      position: '',
      department: '',
      salary: 10000000,
      email: '',
      phone: '',
      birthDate: '1995-01-01',
      gender: 'L',
      faskesCode: '0112B001',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp: EmployeeRecord) => {
    setEditingNik(emp.nik);
    setForm({ ...emp });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nik || !form.name) {
      alert('NIK and Nama are required');
      return;
    }

    try {
      if (editingNik) {
        // Update
        const res = await fetch(`/api/agent/employees/${editingNik}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
      } else {
        // Add
        const res = await fetch('/api/agent/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
      }

      setIsModalOpen(false);
      fetchEmployees();
      runValidation();
    } catch (err: any) {
      alert(`Error saving employee: ${err.message}`);
    }
  };

  const handleDelete = async (nik: string, name: string) => {
    if (!confirm(`Are you sure you want to delete employee "${name}" (${nik})?`)) return;
    try {
      const res = await fetch(`/api/agent/employees/${nik}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      fetchEmployees();
      runValidation();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset employees to initial demo dataset?')) return;
    try {
      await fetch('/api/agent/employees/reset', { method: 'POST' });
      fetchEmployees();
      runValidation();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.nik.includes(searchTerm) ||
      (emp.department && emp.department.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || emp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getRecordErrors = (nik: string): string[] => {
    if (!validationResult || !Array.isArray(validationResult.records)) return [];
    const rec = validationResult.records.find((r: any) => r.nik === nik);
    return rec ? rec.errors : [];
  };

  const formatCurrency = (val?: number) => {
    if (typeof val !== 'number') return 'Rp -';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Header and Summary Cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-400" />
            <span>Master Data &amp; BPJS Delta Engine</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Source of truth for employee participant rosters, delta computation (New, Changed, Resigned), and validation against BPJS regulatory constraints.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={runValidation}
            disabled={isValidating}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isValidating ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Validate BPJS Rules</span>
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-medium transition"
            title="Reset to default seed data"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Demo Data</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* Validation Banner */}
      {validationResult && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              BPJS Compliance Audit Summary • {validationResult.period}
            </span>
            <span className={`text-xs px-2.5 py-1 rounded-md font-medium border ${
              validationResult.summary.invalid === 0
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                : 'bg-rose-950/60 text-rose-300 border-rose-800'
            }`}>
              {validationResult.summary.invalid === 0 ? '✓ Ready for Autonomous Sync' : `⚠ ${validationResult.summary.invalid} Blocking Issue(s)`}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block">Total Records</span>
              <span className="text-lg font-bold text-white">{validationResult.summary.total}</span>
            </div>
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
              <span className="text-[11px] text-emerald-400 block">Valid Format</span>
              <span className="text-lg font-bold text-emerald-400">{validationResult.summary.valid}</span>
            </div>
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
              <span className="text-[11px] text-rose-400 block">Invalid Errors</span>
              <span className="text-lg font-bold text-rose-400">{validationResult.summary.invalid}</span>
            </div>
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
              <span className="text-[11px] text-teal-400 block">New Hires (Auto)</span>
              <span className="text-lg font-bold text-teal-300">+{validationResult.summary.new}</span>
            </div>
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
              <span className="text-[11px] text-amber-400 block">Resigned (Deactivate)</span>
              <span className="text-lg font-bold text-amber-300">-{validationResult.summary.resigned}</span>
            </div>
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
              <span className="text-[11px] text-cyan-400 block">Changed (Wage/Data)</span>
              <span className="text-lg font-bold text-cyan-300">~{validationResult.summary.changed}</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Employee Name, NIK, or Department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto">
          {['ALL', 'NEW', 'ACTIVE', 'CHANGED', 'RESIGNED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              <tr>
                <th className="px-4 py-3.5">Employee &amp; NIK</th>
                <th className="px-4 py-3.5">Delta Status</th>
                <th className="px-4 py-3.5">BPJS Kesehatan (EDABU)</th>
                <th className="px-4 py-3.5">BPJS Ketenagakerjaan (KPJ)</th>
                <th className="px-4 py-3.5">Department / Position</th>
                <th className="px-4 py-3.5">Salary Basis</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-emerald-500" />
                    Loading employee roster...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No employee records match the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const errors = getRecordErrors(emp.nik);
                  const hasError = errors.length > 0;

                  const statusBadge =
                    emp.status === 'NEW'
                      ? 'bg-teal-500/10 text-teal-400 border-teal-500/30'
                      : emp.status === 'ACTIVE'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : emp.status === 'CHANGED'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30';

                  return (
                    <tr
                      key={emp.nik}
                      className={`hover:bg-slate-800/40 transition ${
                        hasError ? 'bg-rose-950/20' : ''
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          <span>{emp.name}</span>
                          {hasError && (
                            <span title={errors.join('; ')}>
                              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-xs text-slate-400 flex items-center gap-2">
                          <span>NIK: {emp.nik}</span>
                          {emp.gender && <span className="text-[10px] px-1 bg-slate-800 rounded">Gender: {emp.gender}</span>}
                        </div>
                        {hasError && (
                          <div className="text-[11px] text-rose-400 font-sans mt-0.5">
                            {errors[0]}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusBadge}`}>
                          {emp.status}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 font-mono text-xs">
                        {emp.nomorPeserta ? (
                          <span className="text-teal-300 bg-teal-950/40 px-2 py-0.5 rounded border border-teal-900/60">
                            {emp.nomorPeserta}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Auto-enroll on sync</span>
                        )}
                        {emp.faskesCode && (
                          <div className="text-[10px] text-slate-400 font-sans">
                            Faskes: {emp.faskesCode}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 font-mono text-xs">
                        {emp.kpj ? (
                          <span className="text-blue-300 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-900/60">
                            {emp.kpj}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Auto-enroll on sync</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="text-slate-200">{emp.position || '-'}</div>
                        <div className="text-[11px] text-slate-400">{emp.department || '-'}</div>
                      </td>

                      <td className="px-4 py-3.5 font-mono text-xs text-slate-300">
                        {formatCurrency(emp.salary)}
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(emp)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                            title="Edit Employee"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(emp.nik, emp.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                            title="Delete Employee"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">
                {editingNik ? 'Edit Employee Data' : 'Add New Employee'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">NIK (16 Digits) *</label>
                  <input
                    type="text"
                    required
                    maxLength={16}
                    value={form.nik || ''}
                    disabled={!!editingNik}
                    onChange={(e) => setForm({ ...form, nik: e.target.value })}
                    placeholder="e.g. 3201011508920001"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Full Name (Nama Lengkap) *</label>
                  <input
                    type="text"
                    required
                    value={form.name || ''}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Ahmad Fauzi"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Delta Status</label>
                  <select
                    value={form.status || 'NEW'}
                    onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="NEW">NEW (Requires Auto-Enrollment)</option>
                    <option value="ACTIVE">ACTIVE (Already Registered)</option>
                    <option value="CHANGED">CHANGED (Salary/Profile Updated)</option>
                    <option value="RESIGNED">RESIGNED (Requires Deactivation)</option>
                    <option value="TERMINATED">TERMINATED (Requires Deactivation)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Monthly Salary (IDR) *</label>
                  <input
                    type="number"
                    required
                    value={form.salary || ''}
                    onChange={(e) => setForm({ ...form, salary: Number(e.target.value) })}
                    placeholder="e.g. 12000000"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">BPJS Kesehatan # (13 Digits)</label>
                  <input
                    type="text"
                    maxLength={13}
                    value={form.nomorPeserta || ''}
                    onChange={(e) => setForm({ ...form, nomorPeserta: e.target.value })}
                    placeholder="Leave empty if NEW"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">KPJ BPJS Ketenagakerjaan # (11 Digits)</label>
                  <input
                    type="text"
                    maxLength={11}
                    value={form.kpj || ''}
                    onChange={(e) => setForm({ ...form, kpj: e.target.value })}
                    placeholder="Leave empty if NEW"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Department</label>
                  <input
                    type="text"
                    value={form.department || ''}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    placeholder="e.g. Human Capital"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Position / Role</label>
                  <input
                    type="text"
                    value={form.position || ''}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                    placeholder="e.g. Compensation Specialist"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">EDABU Faskes Clinic Code</label>
                  <input
                    type="text"
                    value={form.faskesCode || ''}
                    onChange={(e) => setForm({ ...form, faskesCode: e.target.value })}
                    placeholder="e.g. 0112B001"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Gender</label>
                  <select
                    value={form.gender || 'L'}
                    onChange={(e) => setForm({ ...form, gender: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="L">L (Laki-laki / Male)</option>
                    <option value="P">P (Perempuan / Female)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Audit Notes</label>
                <textarea
                  rows={2}
                  value={form.notes || ''}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="e.g. Resigned effective 15 September 2026 or special notes..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-md transition"
                >
                  {editingNik ? 'Update Employee' : 'Save Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
