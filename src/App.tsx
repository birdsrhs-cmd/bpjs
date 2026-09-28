import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { RunnerView } from './components/RunnerView.tsx';
import { EmployeeDeltaView } from './components/EmployeeDeltaView.tsx';
import { VaultView } from './components/VaultView.tsx';
import { SessionView } from './components/SessionView.tsx';
import { AuditView } from './components/AuditView.tsx';
import { ApiExplorerView } from './components/ApiExplorerView.tsx';
import { ShieldCheck, BookOpen, Clock, HeartHandshake } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('runner');
  const [health, setHealth] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [jakartaTime, setJakartaTime] = useState<string>('');

  const fetchHealth = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/agent/health');
      const data = await res.json();
      if (data.success) {
        setHealth(data.health);
      }
    } catch (err) {
      console.error('Error fetching health:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  // Update WIB clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setJakartaTime(
        now.toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }) + ' WIB'
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top App Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        health={health}
        onRefreshHealth={fetchHealth}
        isRefreshing={isRefreshing}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'runner' && <RunnerView onSyncComplete={fetchHealth} />}
        {activeTab === 'employees' && <EmployeeDeltaView />}
        {activeTab === 'vault' && <VaultView />}
        {activeTab === 'sessions' && <SessionView />}
        {activeTab === 'audit' && <AuditView />}
        {activeTab === 'api' && <ApiExplorerView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/50 mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>BPJS Autonomous Agent</span>
            </div>
            <span>•</span>
            <span className="flex items-center gap-1 font-mono text-slate-400">
              <Clock className="h-3 w-3 text-slate-500" />
              <span>{jakartaTime || 'Asia/Jakarta'}</span>
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-slate-400">
              EDABU: <span className="text-teal-400 font-mono">BPJS Kesehatan</span>
            </span>
            <span>•</span>
            <span className="text-slate-400">
              SIPP: <span className="text-blue-400 font-mono">BPJS Ketenagakerjaan</span>
            </span>
            <span>•</span>
            <span className="text-emerald-400 font-mono">AES-256-GCM Vault</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
