import React, { useState, useEffect } from 'react';
import { Activity, Clock, ShieldX, RefreshCw, LogOut, Settings, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';

export const SessionView: React.FC = () => {
  const [sessionData, setSessionData] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingConfig, setSavingConfig] = useState<boolean>(false);
  const [configForm, setConfigForm] = useState({
    sessionDurationMinutes: 60,
    inactivityTimeoutMinutes: 30,
    tokenRefreshThresholdMinutes: 10,
    maxConcurrentSessions: 3
  });

  const fetchSessionStatus = async () => {
    try {
      const res = await fetch('/api/agent/sessions/status');
      const data = await res.json();
      if (data.success) {
        setSessionData(data.sessions);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/agent/sessions/config');
      const data = await res.json();
      if (data.success && data.config) {
        setConfig(data.config);
        setConfigForm(data.config);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSessionStatus(), fetchConfig()]).finally(() => setLoading(false));
    const interval = setInterval(fetchSessionStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleInvalidate = async (sessionId: string) => {
    if (!confirm(`Terminate session ${sessionId}?`)) return;
    try {
      const res = await fetch(`/api/agent/sessions/logout/${sessionId}`, { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      fetchSessionStatus();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleFlushPortal = async (portal: 'EDABU' | 'SIPP') => {
    if (!confirm(`Force logout ALL active sessions for ${portal}?`)) return;
    try {
      const res = await fetch(`/api/agent/sessions/logout-portal/${portal}`, { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      fetchSessionStatus();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await fetch('/api/agent/sessions/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configForm)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      alert('Session policy updated');
      fetchConfig();
    } catch (err: any) {
      alert(`Error saving configuration: ${err.message}`);
    } finally {
      setSavingConfig(false);
    }
  };

  const sessions = sessionData?.sessions || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-400" />
            <span>Active Session Monitor &amp; Lifecycle Management</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Monitors concurrent authenticated sessions, token expiration clocks, and inactivity sweepers across EDABU and SIPP Online.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleFlushPortal('EDABU')}
            className="px-3 py-1.5 bg-teal-950/40 hover:bg-teal-900/60 text-teal-300 border border-teal-800/60 rounded-xl text-xs font-medium transition"
          >
            Flush EDABU Sessions
          </button>
          <button
            onClick={() => handleFlushPortal('SIPP')}
            className="px-3 py-1.5 bg-blue-950/40 hover:bg-blue-900/60 text-blue-300 border border-blue-800/60 rounded-xl text-xs font-medium transition"
          >
            Flush SIPP Sessions
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block font-medium">Total Active Sessions</span>
            <span className="text-2xl font-bold text-white">{sessionData?.totalActiveSessions || 0}</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Activity className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-teal-400 block font-medium">EDABU Live Sessions</span>
            <span className="text-2xl font-bold text-teal-300">{sessionData?.edabuSessions || 0}</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
            <Layers className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-blue-400 block font-medium">SIPP Live Sessions</span>
            <span className="text-2xl font-bold text-blue-300">{sessionData?.sippSessions || 0}</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <Layers className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Active Sessions Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-5 py-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Active Portal Authentication Tokens
          </h3>
          <button
            onClick={fetchSessionStatus}
            className="p-1 text-slate-400 hover:text-white rounded"
            title="Refresh sessions"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-950/40 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              <tr>
                <th className="px-5 py-3">Session ID</th>
                <th className="px-5 py-3">Portal</th>
                <th className="px-5 py-3">Authenticated User</th>
                <th className="px-5 py-3">Login Time</th>
                <th className="px-5 py-3">Expiry Countdown</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                    Loading session status...
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-500 italic">
                    No active sessions currently open. Sessions are generated during autonomous synchronization or portal test logins.
                  </td>
                </tr>
              ) : (
                sessions.map((sess: any) => {
                  const isEdabu = sess.portalName === 'EDABU';
                  return (
                    <tr key={sess.sessionId} className="hover:bg-slate-800/40 transition">
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-200">
                        {sess.sessionId}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${
                          isEdabu
                            ? 'bg-teal-500/10 text-teal-300 border-teal-500/30'
                            : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                        }`}>
                          {sess.portalName}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-300">
                        {sess.username}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400">
                        {sess.loginTime}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-emerald-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-500" />
                          <span>{sess.timeUntilExpiry}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>ACTIVE</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleInvalidate(sess.sessionId)}
                          className="px-2.5 py-1 text-xs text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 rounded-lg transition"
                        >
                          Invalidate
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

      {/* Session Configuration Policy */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="max-w-2xl space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-bold text-white">Session Security Policy Configuration</h3>
              <p className="text-xs text-slate-400">
                Adjust timeouts, concurrency limits, and automatic token refresh thresholds.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4 text-xs sm:text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Session Max Duration (Minutes)</label>
                <input
                  type="number"
                  min={10}
                  max={480}
                  value={configForm.sessionDurationMinutes}
                  onChange={(e) => setConfigForm({ ...configForm, sessionDurationMinutes: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                />
                <span className="text-[10px] text-slate-500">Max lifetime before forced re-authentication</span>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Inactivity Timeout (Minutes)</label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={configForm.inactivityTimeoutMinutes}
                  onChange={(e) => setConfigForm({ ...configForm, inactivityTimeoutMinutes: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                />
                <span className="text-[10px] text-slate-500">Auto-logout if no agent requests received</span>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Token Refresh Threshold (Minutes)</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={configForm.tokenRefreshThresholdMinutes}
                  onChange={(e) => setConfigForm({ ...configForm, tokenRefreshThresholdMinutes: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                />
                <span className="text-[10px] text-slate-500">Proactively renew tokens before expiration</span>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Max Concurrent Sessions per Portal</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={configForm.maxConcurrentSessions}
                  onChange={(e) => setConfigForm({ ...configForm, maxConcurrentSessions: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                />
                <span className="text-[10px] text-slate-500">Evicts oldest session if limit is exceeded</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={savingConfig}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-md transition disabled:opacity-50"
            >
              {savingConfig ? 'Saving...' : 'Update Policy Settings'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
