import React, { useState } from 'react';
import { Database, Play, Copy, Check, Terminal, ExternalLink, Code } from 'lucide-react';

interface EndpointSpec {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  category: 'Credentials' | 'Sessions' | 'Sync Engine' | 'Audit' | 'System';
  description: string;
  defaultBody?: any;
  defaultParams?: Record<string, string>;
}

const ENDPOINTS: EndpointSpec[] = [
  {
    id: 'health',
    name: 'Agent System Health Check',
    method: 'GET',
    path: '/api/agent/health',
    category: 'System',
    description: 'Verify status of agent workers, vault master key, and portal readiness.'
  },
  {
    id: 'diagnostics',
    name: 'System Diagnostics & Telemetry',
    method: 'GET',
    path: '/api/agent/diagnostics',
    category: 'System',
    description: 'Retrieve detailed system telemetry, memory usage, and runtime environment.'
  },
  {
    id: 'cred-status',
    name: 'Get Credential Metadata Status',
    method: 'GET',
    path: '/api/agent/credentials/status',
    category: 'Credentials',
    description: 'Check whether EDABU and SIPP credentials exist and are active in the vault.'
  },
  {
    id: 'cred-store',
    name: 'Store Encrypted Credentials',
    method: 'POST',
    path: '/api/agent/credentials/store',
    category: 'Credentials',
    description: 'Encrypt credentials using AES-256-GCM and PBKDF2 (100,000 rounds).',
    defaultBody: {
      portalName: 'EDABU',
      username: 'bpjs_demo_corp',
      password: 'Kesehatan@Secure2026',
      operator: 'HR_ADMIN'
    }
  },
  {
    id: 'login-test',
    name: 'Test Portal Handshake',
    method: 'POST',
    path: '/api/agent/login-test/EDABU',
    category: 'Sync Engine',
    description: 'Autonomous login test without syncing employee records.'
  },
  {
    id: 'sync-run',
    name: 'Trigger Autonomous Sync',
    method: 'POST',
    path: '/api/agent/sync?period=2026-09&force=true',
    category: 'Sync Engine',
    description: 'Full autonomous synchronization across EDABU and SIPP Online.',
    defaultBody: {
      operator: 'API_EXPLORER'
    }
  },
  {
    id: 'sessions-status',
    name: 'Get Active Sessions Summary',
    method: 'GET',
    path: '/api/agent/sessions/status',
    category: 'Sessions',
    description: 'Inspect active tokens, expiry countdowns, and concurrent sessions.'
  },
  {
    id: 'sessions-flush',
    name: 'Flush All Portal Sessions',
    method: 'POST',
    path: '/api/agent/sessions/logout-portal/EDABU',
    category: 'Sessions',
    description: 'Invalidates all active sessions for the specified portal.'
  },
  {
    id: 'employees-list',
    name: 'List Master Employees',
    method: 'GET',
    path: '/api/agent/employees',
    category: 'Sync Engine',
    description: 'Retrieve current master dataset for participant synchronization.'
  },
  {
    id: 'validate-rules',
    name: 'Validate Against BPJS Constraints',
    method: 'GET',
    path: '/api/agent/validate?period=2026-09',
    category: 'Sync Engine',
    description: 'Pre-flight validation check on 16-digit NIKs, participant numbers, and wages.'
  },
  {
    id: 'audit-logs',
    name: 'Query Audit Trail Records',
    method: 'GET',
    path: '/api/agent/audit/logs?limit=10',
    category: 'Audit',
    description: 'Retrieve immutable transaction records with WIB timestamps.'
  },
  {
    id: 'audit-summary',
    name: 'Get Audit Transaction Summary',
    method: 'GET',
    path: '/api/agent/audit/summary',
    category: 'Audit',
    description: 'Aggregated transaction counts grouped by status (SUCCESS, FAILED, ACTIVE).'
  }
];

export const ApiExplorerView: React.FC = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointSpec>(ENDPOINTS[0]);
  const [requestPath, setRequestPath] = useState<string>(ENDPOINTS[0].path);
  const [requestBody, setRequestBody] = useState<string>(
    ENDPOINTS[0].defaultBody ? JSON.stringify(ENDPOINTS[0].defaultBody, null, 2) : ''
  );
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseData, setResponseData] = useState<any>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const handleSelect = (ep: EndpointSpec) => {
    setSelectedEndpoint(ep);
    setRequestPath(ep.path);
    setRequestBody(ep.defaultBody ? JSON.stringify(ep.defaultBody, null, 2) : '');
    setResponseStatus(null);
    setResponseData(null);
    setResponseTime(null);
  };

  const handleSend = async () => {
    setLoading(true);
    const start = performance.now();
    try {
      const options: RequestInit = {
        method: selectedEndpoint.method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (selectedEndpoint.method !== 'GET' && requestBody.trim()) {
        options.body = requestBody;
      }

      const res = await fetch(requestPath, options);
      const duration = Math.round(performance.now() - start);
      setResponseTime(duration);
      setResponseStatus(res.status);

      const data = await res.json();
      setResponseData(data);
    } catch (err: any) {
      setResponseStatus(500);
      setResponseData({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const getCurlCommand = () => {
    const origin = window.location.origin;
    if (selectedEndpoint.method === 'GET') {
      return `curl -X GET "${origin}${requestPath}"`;
    }
    return `curl -X ${selectedEndpoint.method} "${origin}${requestPath}" \\\n  -H "Content-Type: application/json"${
      requestBody.trim() ? ` \\\n  -d '${requestBody.replace(/\n/g, '')}'` : ''
    }`;
  };

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(getCurlCommand());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Database className="h-5 w-5 text-emerald-400" />
          <span>Interactive REST API Explorer</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Direct testing playground and documentation for all 15+ autonomous agent endpoints specified in <code className="text-emerald-400 font-mono">02_AGENT_API_ENDPOINTS.md</code>.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Endpoint Selector List */}
        <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-3 sm:p-4 space-y-2 h-[680px] overflow-y-auto">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 block">
            API Endpoints Catalogue
          </span>

          <div className="space-y-1.5">
            {ENDPOINTS.map((ep) => {
              const isSelected = selectedEndpoint.id === ep.id;
              const methodColor =
                ep.method === 'GET'
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  : ep.method === 'POST'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20';

              return (
                <button
                  key={ep.id}
                  onClick={() => handleSelect(ep)}
                  className={`w-full text-left p-2.5 rounded-xl border transition ${
                    isSelected
                      ? 'bg-slate-800 border-emerald-500/40 shadow-sm'
                      : 'bg-slate-950/40 border-slate-800/60 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${methodColor}`}>
                      {ep.method}
                    </span>
                    <span className="text-xs font-semibold text-white truncate">{ep.name}</span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-400 truncate">
                    {ep.path}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Playground Execution Panel */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <h3 className="text-base font-bold text-white">{selectedEndpoint.name}</h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  {selectedEndpoint.category}
                </span>
              </div>
              <p className="text-xs text-slate-400">{selectedEndpoint.description}</p>
            </div>

            {/* Path and Send button */}
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono font-bold px-2.5 py-2 rounded-lg border ${
                selectedEndpoint.method === 'GET'
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                {selectedEndpoint.method}
              </span>
              <input
                type="text"
                value={requestPath}
                onChange={(e) => setRequestPath(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleSend}
                disabled={loading}
                className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-lg text-xs sm:text-sm shadow-md transition"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>{loading ? 'Sending...' : 'Send'}</span>
              </button>
            </div>

            {/* Request Body (for POST/PUT) */}
            {selectedEndpoint.method !== 'GET' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  JSON Request Body
                </label>
                <textarea
                  rows={4}
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-emerald-300 focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            {/* cURL Snippet */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5 text-slate-400" />
                  cURL Equivalent
                </span>
                <button
                  onClick={handleCopyCurl}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap">
                {getCurlCommand()}
              </pre>
            </div>

            {/* Response Viewer */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-300">HTTP Response</span>
                {responseStatus && (
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className={`px-2 py-0.5 rounded font-bold ${
                      responseStatus >= 200 && responseStatus < 300
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}>
                      STATUS {responseStatus}
                    </span>
                    {responseTime && <span className="text-slate-500">{responseTime}ms</span>}
                  </div>
                )}
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 font-mono text-xs overflow-x-auto max-h-72">
                {responseData ? (
                  <pre className="text-slate-200">
                    {JSON.stringify(responseData, null, 2)}
                  </pre>
                ) : (
                  <span className="text-slate-600 italic">Click "Send" above to execute API test and observe the response payload.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
