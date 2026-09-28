import React from 'react';
import { ShieldCheck, Activity, Key, Terminal, Users, Database, FileText, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  health: {
    status?: string;
    activeSessions?: number;
    credentials?: { edabu: boolean; sipp: boolean };
    timestamp?: string;
  } | null;
  onRefreshHealth: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  health,
  onRefreshHealth,
  isRefreshing
}) => {
  const tabs = [
    { id: 'runner', label: 'Agent Runner & Console', icon: Terminal },
    { id: 'employees', label: 'Master Data & Deltas', icon: Users },
    { id: 'vault', label: 'Credential Vault', icon: Key },
    { id: 'sessions', label: 'Session Monitor', icon: Activity },
    { id: 'audit', label: 'Compliance & Audit Log', icon: FileText },
    { id: 'api', label: 'API Explorer', icon: Database },
  ];

  const isHealthy = health?.status === 'HEALTHY';

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-400/30">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">BPJS Autonomous Agent</h1>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">
                  v1.0 Production
                </span>
                <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                  EDABU + SIPP
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Autonomous Sync & Credential Vault for BPJS Kesehatan &amp; Ketenagakerjaan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-4 flex-wrap">
            {/* Health pill */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${
              isHealthy
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50'
                : 'bg-amber-950/40 text-amber-300 border-amber-800/50'
            }`}>
              {isHealthy ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              )}
              <span>System: {health?.status || 'CHECKING'}</span>
              <span className="text-slate-500">|</span>
              <span>{health?.activeSessions ?? 0} active session(s)</span>
            </div>

            {/* Portal Credential badges */}
            <div className="hidden lg:flex items-center gap-1.5 text-[11px]">
              <span className={`px-2 py-1 rounded border ${
                health?.credentials?.edabu
                  ? 'bg-teal-950/60 text-teal-300 border-teal-800/50'
                  : 'bg-rose-950/60 text-rose-300 border-rose-800/50'
              }`}>
                EDABU {health?.credentials?.edabu ? '● Ready' : '○ Missing'}
              </span>
              <span className={`px-2 py-1 rounded border ${
                health?.credentials?.sipp
                  ? 'bg-blue-950/60 text-blue-300 border-blue-800/50'
                  : 'bg-rose-950/60 text-rose-300 border-rose-800/50'
              }`}>
                SIPP {health?.credentials?.sipp ? '● Ready' : '○ Missing'}
              </span>
            </div>

            <button
              onClick={onRefreshHealth}
              disabled={isRefreshing}
              title="Refresh health and status"
              className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-lg border border-slate-700/60 transition"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-800/60">
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
