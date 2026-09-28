import React, { useState, useEffect } from 'react';
import { Key, ShieldCheck, Lock, RefreshCw, AlertTriangle, Eye, EyeOff, Download, Check, ShieldAlert } from 'lucide-react';

export const VaultView: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [storePortal, setStorePortal] = useState<'EDABU' | 'SIPP'>('EDABU');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [operator, setOperator] = useState<string>('HR_SECURITY_ADMIN');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Rotation modal
  const [rotatePortal, setRotatePortal] = useState<'EDABU' | 'SIPP' | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/agent/credentials/status');
      const data = await res.json();
      if (data.success) {
        setStatus(data.credentials);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);

    if (!username || !password) {
      setActionMessage({ type: 'error', text: 'Username and password cannot be empty' });
      return;
    }

    try {
      const res = await fetch('/api/agent/credentials/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portalName: storePortal,
          username,
          password,
          operator
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setActionMessage({ type: 'success', text: `Credentials encrypted & stored for ${storePortal}` });
      setUsername('');
      setPassword('');
      fetchStatus();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleRotate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rotatePortal || !newPassword) return;

    try {
      const res = await fetch(`/api/agent/credentials/rotate/${rotatePortal}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword,
          operator
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      alert(`Credentials rotated successfully for ${rotatePortal}`);
      setRotatePortal(null);
      setNewPassword('');
      fetchStatus();
    } catch (err: any) {
      alert(`Rotation failed: ${err.message}`);
    }
  };

  const handleDisable = async (portal: 'EDABU' | 'SIPP') => {
    if (!confirm(`Are you sure you want to disable credentials for ${portal}? This will immediately block sync operations until updated.`)) return;

    try {
      const res = await fetch(`/api/agent/credentials/disable/${portal}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Emergency security operator suspension',
          operator
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      fetchStatus();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExportBackup = async () => {
    try {
      const res = await fetch('/api/agent/credentials/export-backup');
      const data = await res.json();
      if (data.success && data.backupPayload) {
        const blob = new Blob([data.backupPayload], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bpjs-vault-backup-${Date.now()}.enc`;
        a.click();
      }
    } catch (err) {
      alert('Failed to export vault backup');
    }
  };

  const renderPortalCard = (portalName: 'EDABU' | 'SIPP', label: string, color: string) => {
    const cred = status ? status[portalName.toLowerCase()] : null;
    const isConfigured = !!cred;
    const isActive = cred?.status === 'ACTIVE';

    return (
      <div className={`p-5 rounded-2xl border transition bg-slate-900/80 ${
        isActive
          ? 'border-emerald-500/30 shadow-lg shadow-emerald-950/20'
          : isConfigured
          ? 'border-amber-500/30'
          : 'border-slate-800'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${
              portalName === 'EDABU' ? 'bg-teal-500/10 text-teal-400' : 'bg-blue-500/10 text-blue-400'
            }`}>
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{label}</h3>
              <p className="text-[11px] text-slate-400">
                {portalName === 'EDABU' ? 'BPJS Kesehatan Portal' : 'BPJS Ketenagakerjaan Portal'}
              </p>
            </div>
          </div>

          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
            isActive
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : isConfigured
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}>
            {isActive ? '● ACTIVE' : isConfigured ? `● ${cred.status}` : '○ NOT CONFIGURED'}
          </span>
        </div>

        {isConfigured ? (
          <div className="space-y-3 text-xs">
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Username</span>
                <span className="font-mono text-white font-semibold">{cred.username}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Password Storage</span>
                <span className="font-mono text-emerald-400 font-semibold">AES-256-GCM (Encrypted)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Key Derivation</span>
                <span className="font-mono text-purple-300">PBKDF2 (100k rounds)</span>
              </div>
            </div>

            <div className="space-y-1 text-[11px] text-slate-400 px-1">
              <div className="flex justify-between">
                <span>Stored At:</span>
                <span className="font-mono text-slate-300">{cred.createdAt}</span>
              </div>
              <div className="flex justify-between">
                <span>Last Accessed:</span>
                <span className="font-mono text-slate-300">{cred.lastAccessedAt || 'Just now'}</span>
              </div>
              <div className="flex justify-between">
                <span>Last Rotated:</span>
                <span className="font-mono text-slate-300">{cred.lastRotatedAt || cred.createdAt}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => setRotatePortal(portalName)}
                className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition"
              >
                Rotate Password
              </button>
              {isActive && (
                <button
                  onClick={() => handleDisable(portalName)}
                  className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 rounded-lg text-xs font-medium transition"
                  title="Suspend credential"
                >
                  Disable
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 space-y-2 bg-slate-950/40 rounded-xl border border-slate-800/40">
            <Key className="h-6 w-6 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">No credentials stored yet.</p>
            <button
              onClick={() => {
                setStorePortal(portalName);
                document.getElementById('vault-form')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-xs text-emerald-400 hover:underline"
            >
              Configure {portalName} now &rarr;
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Overview header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Key className="h-5 w-5 text-emerald-400" />
            <span>Secure Credential Vault (AES-256-GCM)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Hardware-grade cryptographic credential manager for BPJS government portals. Passwords are encrypted at rest with PBKDF2 (100,000 iterations) and never exposed or logged.
          </p>
        </div>

        <button
          onClick={handleExportBackup}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition self-start sm:self-auto"
        >
          <Download className="h-4 w-4" />
          <span>Export Encrypted Backup</span>
        </button>
      </div>

      {/* Portal Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {renderPortalCard('EDABU', 'EDABU (BPJS Kesehatan)', 'teal')}
        {renderPortalCard('SIPP', 'SIPP Online (BPJS Ketenagakerjaan)', 'blue')}
      </div>

      {/* Security Guarantees Callout */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-white">Zero Plaintext Logging</h4>
            <p className="text-[11px] text-slate-400">Credentials are sanitized across all audit logs, terminal output, and debug trails.</p>
          </div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-start gap-3">
          <Lock className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-white">PBKDF2 Key Derivation</h4>
            <p className="text-[11px] text-slate-400">100,000 SHA-256 iterations with cryptographically random salt per credential.</p>
          </div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-start gap-3">
          <RefreshCw className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-white">On-Demand Rotation</h4>
            <p className="text-[11px] text-slate-400">Rotate passwords with audit tracking without disrupting pending queue tasks.</p>
          </div>
        </div>
      </div>

      {/* Store Credential Form */}
      <div id="vault-form" className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="max-w-2xl space-y-4">
          <div>
            <h3 className="text-base font-bold text-white">Store or Update Portal Credentials</h3>
            <p className="text-xs text-slate-400">
              Provide government portal credentials to be encrypted and committed to the secure vault.
            </p>
          </div>

          {actionMessage && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
              actionMessage.type === 'success'
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                : 'bg-rose-950/60 text-rose-300 border-rose-800'
            }`}>
              {actionMessage.type === 'success' ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              <span>{actionMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleStore} className="space-y-4 text-xs sm:text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Target Portal *</label>
                <select
                  value={storePortal}
                  onChange={(e) => setStorePortal(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="EDABU">EDABU (BPJS Kesehatan)</option>
                  <option value="SIPP">SIPP Online (BPJS Ketenagakerjaan)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Operator Identifier</label>
                <input
                  type="text"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  placeholder="e.g. HR_ADMIN"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Portal Username / Badan Usaha ID *</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. company_edabu_user"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Portal Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-3 pr-10 py-2 text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md transition"
            >
              Encrypt &amp; Store Credentials
            </button>
          </form>
        </div>
      </div>

      {/* Rotation Modal */}
      {rotatePortal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Rotate Credentials for {rotatePortal}</h3>
            <p className="text-xs text-slate-400">
              Provide the new updated portal password. The vault will derive a new salt and IV, encrypt with AES-256-GCM, and record an audit log.
            </p>

            <form onSubmit={handleRotate} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-400 font-medium mb-1">New Password (Min 8 chars) *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  placeholder="••••••••••••"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRotatePortal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-md"
                >
                  Rotate &amp; Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
