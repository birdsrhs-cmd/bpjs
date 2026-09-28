import React, { useState, useEffect } from 'react';
import { FileText, Download, Trash2, Search, Filter, RefreshCw, CheckCircle2, AlertTriangle, Info, Clock, ExternalLink } from 'lucide-react';

interface AuditLogEntry {
  id?: string;
  timestamp: string;
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

export const AuditView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  // Clear modal
  const [isClearModalOpen, setIsClearModalOpen] = useState<boolean>(false);
  const [confirmToken, setConfirmToken] = useState<string>('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (sourceFilter) params.append('source', sourceFilter);
      params.append('limit', '200');

      const res = await fetch(`/api/agent/audit/logs?${params.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setLogs(data.logs.slice().reverse()); // show latest first
      }

      const summaryRes = await fetch('/api/agent/audit/summary');
      const summaryData = await summaryRes.json();
      if (summaryData.success) {
        setSummary(summaryData.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [statusFilter, sourceFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const handleExport = () => {
    window.location.href = '/api/agent/audit/export';
  };

  const handleClear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmToken !== 'CONFIRM_CLEAR_ALL') {
      alert('Confirmation token must be exactly "CONFIRM_CLEAR_ALL"');
      return;
    }

    try {
      const res = await fetch('/api/agent/audit/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: confirmToken })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setIsClearModalOpen(false);
      setConfirmToken('');
      fetchLogs();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-400" />
            <span>Compliance Audit Trail &amp; Transaction Ledger</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Immutable regulatory audit log for all portal logins, delta uploads, credential mutations, and error states timestamped in Asia/Jakarta (WIB).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition"
          >
            <Download className="h-4 w-4" />
            <span>Export JSON Audit</span>
          </button>
          <button
            onClick={() => setIsClearModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 rounded-xl text-xs font-medium transition"
            title="Clear logs"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear Logs</span>
          </button>
        </div>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
          <span className="text-[11px] text-slate-400 block font-medium">Total Entries</span>
          <span className="text-xl font-bold text-white">
            {Object.values(summary).reduce((a, b) => a + b, 0)}
          </span>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
          <span className="text-[11px] text-emerald-400 block font-medium">SUCCESS Transactions</span>
          <span className="text-xl font-bold text-emerald-300">{summary['SUCCESS'] || 0}</span>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
          <span className="text-[11px] text-rose-400 block font-medium">FAILED / Blocked</span>
          <span className="text-xl font-bold text-rose-300">{summary['FAILED'] || 0}</span>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
          <span className="text-[11px] text-teal-400 block font-medium">ACTIVE Sessions</span>
          <span className="text-xl font-bold text-teal-300">{summary['ACTIVE'] || 0}</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="h-4 w-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search action, NIK, or payload details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Statuses</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILED">FAILED</option>
            <option value="ACTIVE">ACTIVE</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Subsystems</option>
            <option value="BPJS_AGENT">BPJS_AGENT</option>
            <option value="CREDENTIAL_VAULT">CREDENTIAL_VAULT</option>
            <option value="SESSION_MANAGER">SESSION_MANAGER</option>
            <option value="SYNC_ENGINE">SYNC_ENGINE</option>
          </select>

          <button
            onClick={fetchLogs}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
            title="Refresh logs"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              <tr>
                <th className="px-4 py-3.5">Timestamp (WIB)</th>
                <th className="px-4 py-3.5">Action Event</th>
                <th className="px-4 py-3.5">Subsystem</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Actor / Operator</th>
                <th className="px-4 py-3.5">Details</th>
                <th className="px-4 py-3.5 text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-emerald-500" />
                    Querying audit snapshot ledger...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500 italic">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const statusBadge =
                    log.status === 'SUCCESS'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : log.status === 'ACTIVE'
                      ? 'bg-teal-500/10 text-teal-400 border-teal-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30';

                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-slate-800/40 transition cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-400 whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="px-4 py-3 font-semibold text-white">
                        {log.action}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">
                        {log.source}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${statusBadge}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300 font-mono text-xs">
                        {log.user_or_system}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-300 max-w-xs truncate">
                        {log.error_message ? (
                          <span className="text-rose-400">{log.error_message}</span>
                        ) : (
                          log.new_value || '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="p-1 text-slate-400 hover:text-white rounded"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">{selectedLog.action}</h3>
                <p className="text-xs text-slate-400 font-mono">{selectedLog.id} • {selectedLog.timestamp}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Subsystem Source:</span>
                  <span className="font-mono text-slate-200">{selectedLog.source}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="font-bold text-emerald-400">{selectedLog.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Actor / Trigger:</span>
                  <span className="font-mono text-slate-200">{selectedLog.user_or_system}</span>
                </div>
                {selectedLog.nik !== 'SYSTEM' && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Target NIK:</span>
                    <span className="font-mono text-slate-200">{selectedLog.nik}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Previous State</label>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-400">
                  {selectedLog.old_value || '-'}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Committed State / Payload</label>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-200 break-words">
                  {selectedLog.new_value || '-'}
                </div>
              </div>

              {selectedLog.error_message && (
                <div>
                  <label className="block text-rose-400 mb-1 font-medium">Error Diagnostics</label>
                  <div className="bg-rose-950/40 p-2.5 rounded-lg border border-rose-900/60 font-mono text-[11px] text-rose-300">
                    {selectedLog.error_message}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Logs Modal */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="text-base font-bold text-white">Confirm Clearing Audit Trail</h3>
            </div>
            <p className="text-xs text-slate-300">
              This action will purge all transaction history from disk. To prevent accidental data loss, please enter <strong className="text-white font-mono">CONFIRM_CLEAR_ALL</strong> below:
            </p>

            <form onSubmit={handleClear} className="space-y-4 text-xs sm:text-sm">
              <input
                type="text"
                required
                value={confirmToken}
                onChange={(e) => setConfirmToken(e.target.value)}
                placeholder="CONFIRM_CLEAR_ALL"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-center"
              />

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsClearModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={confirmToken !== 'CONFIRM_CLEAR_ALL'}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold rounded-lg shadow-md"
                >
                  Purge Audit Records
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
