import React, { useState, useEffect, useRef } from 'react';
import { Play, RefreshCw, Terminal, CheckCircle2, XCircle, AlertCircle, ShieldAlert, Cpu, ArrowRight, Zap, Check, Clock } from 'lucide-react';

interface RunnerViewProps {
  onSyncComplete?: () => void;
}

interface LogEntry {
  id: string;
  timestamp: string;
  portal?: 'EDABU' | 'SIPP' | 'VAULT' | 'SYSTEM' | 'ENGINE';
  level: 'info' | 'warn' | 'error' | 'success' | 'step';
  message: string;
  details?: any;
}

export const RunnerView: React.FC<RunnerViewProps> = ({ onSyncComplete }) => {
  const [period, setPeriod] = useState<string>('2026-09');
  const [force, setForce] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [testingPortal, setTestingPortal] = useState<'EDABU' | 'SIPP' | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);

  // Poll live logs
  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/agent/live-logs?limit=100');
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to fetch live logs:', err);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleClearTerminal = async () => {
    try {
      await fetch('/api/agent/live-logs/clear', { method: 'POST' });
      setLogs([]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunSync = async () => {
    setIsRunning(true);
    setSyncResult(null);
    setSyncError(null);
    setActiveStep(1);

    try {
      // Step visual progression
      setTimeout(() => setActiveStep(2), 600);
      setTimeout(() => setActiveStep(3), 1400);

      const res = await fetch(`/api/agent/sync?period=${encodeURIComponent(period)}&force=${force}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operator: 'WEB_DASHBOARD_AGENT' })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Data sync operation failed');
      }

      setActiveStep(6);
      setSyncResult(data);
      if (onSyncComplete) onSyncComplete();
    } catch (err: any) {
      setSyncError(err.message);
    } finally {
      setIsRunning(false);
      fetchLogs();
    }
  };

  const handleTestLogin = async (portal: 'EDABU' | 'SIPP') => {
    setTestingPortal(portal);
    try {
      const res = await fetch(`/api/agent/login-test/${portal}`, { method: 'POST' });
      const data = await res.json();
      if (!data.success) {
        alert(`${portal} Login Test Failed: ${data.message}`);
      }
      fetchLogs();
    } catch (err: any) {
      alert(`Error testing ${portal}: ${err.message}`);
    } finally {
      setTestingPortal(null);
    }
  };

  const workflowSteps = [
    { num: 1, title: 'Master Data Validation', desc: 'Validates 16-digit NIK, BPJS numbers, and salary' },
    { num: 2, title: 'Vault Credential Retrieval', desc: 'Decrypts AES-256 EDABU & SIPP credentials' },
    { num: 3, title: 'Portal Authentication', desc: 'Headless handshake & session establishment' },
    { num: 4, title: 'Delta Enrollment', desc: 'Auto-enrolls NEW employees in both portals' },
    { num: 5, title: 'Member Deactivation', desc: 'Deactivates RESIGNED / TERMINATED staff' },
    { num: 6, title: 'Session Flush & Audit', desc: 'Invalidates cookies & commits compliance logs' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
              <Zap className="h-3.5 w-3.5" />
              <span>Fully Automated Orchestration</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Autonomous BPJS Data Synchronization Engine
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Dispatches headless agent workers to synchronously log in to <strong>EDABU (BPJS Kesehatan)</strong> and <strong>SIPP Online (BPJS Ketenagakerjaan)</strong>, register new hires, deactivate resigned employees, and create immutable compliance snapshots.
            </p>
          </div>

          {/* Quick Handshake Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={() => handleTestLogin('EDABU')}
              disabled={testingPortal !== null || isRunning}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700/80 text-teal-300 border border-teal-500/30 rounded-xl text-xs font-medium transition shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${testingPortal === 'EDABU' ? 'animate-spin' : ''}`} />
              <span>{testingPortal === 'EDABU' ? 'Handshaking...' : 'Test EDABU Login'}</span>
            </button>
            <button
              onClick={() => handleTestLogin('SIPP')}
              disabled={testingPortal !== null || isRunning}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700/80 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-medium transition shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${testingPortal === 'SIPP' ? 'animate-spin' : ''}`} />
              <span>{testingPortal === 'SIPP' ? 'Handshaking...' : 'Test SIPP Login'}</span>
            </button>
          </div>
        </div>

        {/* Execution Control Panel */}
        <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Target Period
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                disabled={isRunning}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="2026-09">September 2026 (Current)</option>
                <option value="2026-10">October 2026</option>
                <option value="2026-08">August 2026</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-4 sm:pt-0">
              <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={force}
                  onChange={(e) => setForce(e.target.checked)}
                  disabled={isRunning}
                  className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500 h-4 w-4 bg-slate-950"
                />
                <span>Force Mode (Bypass validation blockers)</span>
              </label>
            </div>
          </div>

          <button
            onClick={handleRunSync}
            disabled={isRunning}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-950/60 transition disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Agent Executing...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                <span>Run Autonomous Sync</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sync Failure Notification */}
      {syncError && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-200 text-sm flex items-start gap-3 shadow-lg">
          <XCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-semibold text-rose-100">Sync Execution Interrupted</h4>
            <p>{syncError}</p>
            <p className="text-xs text-rose-300/80">Check the Master Data tab to correct invalid records or enable Force Mode if overriding is authorized.</p>
          </div>
        </div>
      )}

      {/* Sync Success Metric Card */}
      {syncResult && (
        <div className="bg-emerald-950/30 border border-emerald-800/60 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">Autonomous Sync Finished Successfully</h3>
                <p className="text-xs text-emerald-300">Period: {syncResult.period} • {syncResult.timestamp}</p>
              </div>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-900/60 px-2.5 py-1 rounded-md border border-emerald-700/50">
              All Portals Synchronized
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
              <span className="text-[11px] text-slate-400 block font-medium">Validated Records</span>
              <span className="text-lg font-bold text-white">{syncResult.summary.validated}</span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
              <span className="text-[11px] text-emerald-400 block font-medium">Enrolled (EDABU)</span>
              <span className="text-lg font-bold text-emerald-300">+{syncResult.summary.registeredEdabu}</span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
              <span className="text-[11px] text-blue-400 block font-medium">Enrolled (SIPP)</span>
              <span className="text-lg font-bold text-blue-300">+{syncResult.summary.registeredSipp}</span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
              <span className="text-[11px] text-rose-400 block font-medium">Deactivated (EDABU)</span>
              <span className="text-lg font-bold text-rose-300">-{syncResult.summary.deactivatedEdabu}</span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
              <span className="text-[11px] text-rose-400 block font-medium">Deactivated (SIPP)</span>
              <span className="text-lg font-bold text-rose-300">-{syncResult.summary.deactivatedSipp}</span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
              <span className="text-[11px] text-amber-400 block font-medium">Pending Review</span>
              <span className="text-lg font-bold text-amber-300">{syncResult.summary.pendingManualUpload}</span>
            </div>
          </div>
        </div>
      )}

      {/* Autonomous Pipeline Step Indicators */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
          <Cpu className="h-4 w-4 text-emerald-400" />
          <span>Autonomous Execution Pipeline</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 sm:gap-3">
          {workflowSteps.map((step) => {
            const isDone = activeStep > step.num || (syncResult && !isRunning);
            const isCurrent = isRunning && activeStep === step.num;
            return (
              <div
                key={step.num}
                className={`p-3 rounded-xl border transition ${
                  isCurrent
                    ? 'bg-emerald-950/40 border-emerald-500/60 shadow-sm'
                    : isDone
                    ? 'bg-slate-900/90 border-slate-800 text-slate-300'
                    : 'bg-slate-950/40 border-slate-800/40 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                    STEP {step.num}
                  </span>
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : isCurrent ? (
                    <RefreshCw className="h-4 w-4 text-emerald-400 animate-spin" />
                  ) : (
                    <Clock className="h-4 w-4 text-slate-600" />
                  )}
                </div>
                <h4 className={`text-xs font-semibold mb-0.5 ${isCurrent || isDone ? 'text-white' : 'text-slate-400'}`}>
                  {step.title}
                </h4>
                <p className="text-[10px] text-slate-400 leading-tight">
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Real-time Agent Terminal Console */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-slate-900/90 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-semibold text-slate-200">Autonomous Agent Console Stream</span>
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[11px] text-slate-400 flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-emerald-500 h-3.5 w-3.5"
              />
              <span>Auto-scroll</span>
            </label>
            <button
              onClick={handleClearTerminal}
              className="text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Clear
            </button>
            <button
              onClick={fetchLogs}
              title="Refresh log stream"
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div
          ref={terminalRef}
          className="p-4 h-80 sm:h-96 overflow-y-auto font-mono text-xs space-y-1.5 bg-slate-950/90"
        >
          {logs.length === 0 ? (
            <div className="text-slate-600 italic">No execution logs yet. Dispatch sync or test login to trigger the agent.</div>
          ) : (
            logs.map((log) => {
              const levelColor =
                log.level === 'error'
                  ? 'text-rose-400 font-bold'
                  : log.level === 'warn'
                  ? 'text-amber-400'
                  : log.level === 'success'
                  ? 'text-emerald-400 font-semibold'
                  : log.level === 'step'
                  ? 'text-cyan-300 font-semibold'
                  : 'text-slate-300';

              const portalBadge =
                log.portal === 'EDABU'
                  ? 'bg-teal-950 text-teal-300 border border-teal-800/60'
                  : log.portal === 'SIPP'
                  ? 'bg-blue-950 text-blue-300 border border-blue-800/60'
                  : log.portal === 'VAULT'
                  ? 'bg-purple-950 text-purple-300 border border-purple-800/60'
                  : log.portal === 'ENGINE'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                  : 'bg-slate-900 text-slate-400 border border-slate-800';

              return (
                <div key={log.id} className="flex items-start gap-2 leading-relaxed hover:bg-slate-900/40 p-0.5 rounded">
                  <span className="text-slate-500 shrink-0 select-none text-[11px]">
                    [{log.timestamp.split(' ')[1] || log.timestamp}]
                  </span>
                  {log.portal && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold shrink-0 select-none ${portalBadge}`}>
                      {log.portal}
                    </span>
                  )}
                  <span className={`break-words ${levelColor}`}>{log.message}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
