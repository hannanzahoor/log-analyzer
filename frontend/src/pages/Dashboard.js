import React, { useState, useEffect, useCallback } from 'react';
import { dashboardAPI, logsAPI, alertsAPI } from '../utils/api';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Tooltip, Legend, Filler);

const CHART_OPTS = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#18181b', borderColor: '#3f3f46', borderWidth: 1,
      titleColor: '#f4f4f5', bodyColor: '#a1a1aa',
      titleFont: { family: 'Inter', weight: '600', size: 12 },
      bodyFont: { family: 'JetBrains Mono', size: 11 },
      padding: 10, cornerRadius: 6,
    },
  },
  scales: {
    x: { ticks: { color: '#52525b', font: { size: 10, family: 'JetBrains Mono' } }, grid: { color: 'rgba(255,255,255,0.04)' }, border: { color: '#27272a' } },
    y: { ticks: { color: '#52525b', font: { size: 10, family: 'JetBrains Mono' } }, grid: { color: 'rgba(255,255,255,0.04)' }, border: { color: '#27272a' } },
  },
};

const THREAT_COLORS = {
  BRUTE_FORCE:          '#f97316',
  PORT_SCAN:            '#fbbf24',
  DDOS:                 '#f43f5e',
  UNAUTHORIZED_ACCESS:  '#a78bfa',
  DATA_EXFILTRATION:    '#f472b6',
  ANOMALY:              '#38bdf8',
  NORMAL:               '#10b981',
};

const THREAT_ICONS = {
  BRUTE_FORCE: '🔐', PORT_SCAN: '🔍', DDOS: '💥',
  UNAUTHORIZED_ACCESS: '🚫', DATA_EXFILTRATION: '📤', ANOMALY: '⚡',
};

const SEV_STYLES = {
  CRITICAL: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
  HIGH:     'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  MEDIUM:   'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  LOW:      'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

function Badge({ severity }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${SEV_STYLES[severity] || 'bg-zinc-800 text-zinc-400'}`}>
      {severity}
    </span>
  );
}

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div className="stat-shimmer relative bg-zinc-900 border border-zinc-800 rounded-xl p-4 overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-700 hover:shadow-lg">
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">{label}</span>
        <span className="text-lg opacity-20">{icon}</span>
      </div>
      <div className="text-3xl font-bold tracking-tight" style={{ color }}>{value ?? '—'}</div>
      {sub && <div className="text-[11px] font-mono text-zinc-600 mt-1">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [dist, setDist] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchAll = useCallback(async () => {
    try {
      const [s, t, d, a] = await Promise.allSettled([
        dashboardAPI.getSummary(), dashboardAPI.getTimeline(),
        dashboardAPI.getThreatDistribution(), alertsAPI.getAlerts({ limit: 7 }),
      ]);
      if (s.status === 'fulfilled') setSummary(s.value.data);
      if (t.status === 'fulfilled') setTimeline(t.value.data.timeline || []);
      if (d.status === 'fulfilled') setDist(d.value.data.distribution || []);
      if (a.status === 'fulfilled') setAlerts(a.value.data.alerts || []);
      setLastRefresh(new Date());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); const id = setInterval(fetchAll, 15000); return () => clearInterval(id); }, [fetchAll]);

  const simulate = async () => {
    setSimulating(true);
    try { await logsAPI.simulate(25); await fetchAll(); }
    catch { alert('Cannot connect to backend. Make sure Flask is running on port 5000.'); }
    finally { setSimulating(false); }
  };

  const logs = summary?.logs || {};
  const alertStats = summary?.alerts || {};
  const threatTypes = logs.by_threat_type || [];

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="spinner w-8 h-8" />
      <div className="font-mono text-xs text-zinc-500">connecting to backend...</div>
      <div className="font-mono text-[11px] text-zinc-700">python app.py</div>
    </div>
  );

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold text-emerald-500 uppercase tracking-widest">Security Operations</span>
          </div>
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Threat Dashboard</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-zinc-500">Real-time · {lastRefresh.toLocaleTimeString()}</span>
            <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-emerald-500">
              <span className="pulse-dot" />LIVE
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={fetchAll}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 text-sm font-medium hover:bg-zinc-800 hover:border-zinc-600 transition-all">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Refresh
          </button>
          <button onClick={simulate} disabled={simulating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg grad-btn text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {simulating
              ? <><span className="spinner w-3.5 h-3.5 border-zinc-900 border-t-zinc-900" style={{borderTopColor:'#09090b', borderColor:'rgba(9,9,11,0.3)'}}/>Simulating...</>
              : <><span>⚡</span>Simulate Logs</>}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Logs" value={logs.total_logs ?? 0} sub="Analyzed" color="#38bdf8" icon="📋" />
        <StatCard label="Threats" value={logs.total_threats ?? 0} sub="Detected" color="#f43f5e" icon="⚠️" />
        <StatCard label="Active Alerts" value={alertStats.unresolved ?? 0} sub="Unresolved" color="#f97316" icon="🔔" />
        <StatCard label="Critical" value={alertStats.critical ?? 0} sub="Require action" color="#f43f5e" icon="🚨" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1 h-4 grad-bar rounded-full block" />
            <span className="text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-wider">Alert Timeline — 24h</span>
          </div>
          <div style={{ height: 200 }}>
            {timeline.some(t => t.count > 0)
              ? <Line data={{ labels: timeline.map(t => t.hour), datasets: [{ label: 'Alerts', data: timeline.map(t => t.count), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.06)', fill: true, tension: 0.4, pointRadius: 2, pointBackgroundColor: '#10b981', borderWidth: 2 }] }} options={CHART_OPTS} />
              : <Empty icon="📈" title="No alert data yet" sub='click "Simulate Logs" to generate' />}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1 h-4 grad-bar rounded-full block" />
            <span className="text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-wider">Threat Distribution</span>
          </div>
          <div style={{ height: 200 }}>
            {dist.length > 0
              ? <Doughnut
                  data={{ labels: dist.map(d => d.name), datasets: [{ data: dist.map(d => d.value), backgroundColor: dist.map(d => (THREAT_COLORS[d.name] || '#52525b') + '33'), borderColor: dist.map(d => THREAT_COLORS[d.name] || '#52525b'), borderWidth: 2, hoverOffset: 4 }] }}
                  options={{ responsive: true, maintainAspectRatio: false, cutout: '62%',
                    plugins: { legend: { position: 'bottom', labels: { color: '#a1a1aa', font: { size: 10, family: 'JetBrains Mono' }, padding: 10, boxWidth: 8, usePointStyle: true, pointStyle: 'circle' } }, tooltip: CHART_OPTS.plugins.tooltip }
                  }} />
              : <Empty icon="🥧" title="No threat data" sub="simulate logs to populate" />}
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1 h-4 grad-bar rounded-full block" />
            <span className="text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-wider">Attacks by Type</span>
          </div>
          <div style={{ height: 210 }}>
            {threatTypes.length > 0
              ? <Bar
                  data={{ labels: threatTypes.map(t => (t._id || 'UNKNOWN').replace(/_/g, ' ')), datasets: [{ data: threatTypes.map(t => t.count), backgroundColor: threatTypes.map(t => (THREAT_COLORS[t._id] || '#52525b') + '55'), borderColor: threatTypes.map(t => THREAT_COLORS[t._id] || '#52525b'), borderWidth: 1, borderRadius: 4, borderSkipped: false }] }}
                  options={CHART_OPTS} />
              : <Empty icon="📊" title="No attack data" sub="simulate logs to populate" />}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-1 h-4 grad-bar rounded-full block" />
              <span className="text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-wider">Recent Alerts</span>
            </div>
            {alertStats.unresolved > 0 && (
              <span className="text-[10px] font-mono font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full">
                {alertStats.unresolved} active
              </span>
            )}
          </div>
          <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 250 }}>
            {alerts.length === 0
              ? <Empty icon="✅" title="All clear" sub="no active alerts" />
              : alerts.slice(0, 7).map((a, i) => {
                const clr = THREAT_COLORS[a.threat_type] || '#52525b';
                return (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-800 alert-row-${a.severity?.toLowerCase()}`}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0" style={{ background: clr + '20', color: clr }}>
                      {THREAT_ICONS[a.threat_type] || '⚠️'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold" style={{ color: clr }}>{a.threat_type?.replace(/_/g, ' ')}</span>
                        <Badge severity={a.severity} />
                      </div>
                      <div className="text-[11px] font-mono text-zinc-500 truncate">{a.message}</div>
                      <div className="text-[10px] font-mono text-zinc-700 mt-0.5">{a.timestamp?.slice(0, 19).replace('T', ' ')}{a.source_ips?.[0] && ` · ${a.source_ips[0]}`}</div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Empty({ icon, title, sub }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-8 text-zinc-600">
      <div className="text-3xl mb-3 opacity-40">{icon}</div>
      <div className="text-sm font-semibold text-zinc-500 mb-1">{title}</div>
      <div className="text-[11px] font-mono text-zinc-600">{sub}</div>
    </div>
  );
}
