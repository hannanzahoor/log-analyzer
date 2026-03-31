import React, { useState, useEffect, useCallback } from 'react';
import { alertsAPI } from '../utils/api';

const THREAT_ICONS = { BRUTE_FORCE:'🔐', PORT_SCAN:'🔍', DDOS:'💥', UNAUTHORIZED_ACCESS:'🚫', DATA_EXFILTRATION:'📤', ANOMALY:'⚡' };
const THREAT_COLORS = { BRUTE_FORCE:'#f97316', PORT_SCAN:'#fbbf24', DDOS:'#f43f5e', UNAUTHORIZED_ACCESS:'#a78bfa', DATA_EXFILTRATION:'#f472b6', ANOMALY:'#38bdf8' };
const SEV_BADGE = { CRITICAL:'bg-rose-500/10 text-rose-400 border-rose-500/20', HIGH:'bg-orange-500/10 text-orange-400 border-orange-500/20', MEDIUM:'bg-amber-500/10 text-amber-400 border-amber-500/20', LOW:'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
const SEV_BORDER = { CRITICAL:'border-l-rose-500', HIGH:'border-l-orange-500', MEDIUM:'border-l-amber-500', LOW:'border-l-emerald-500' };

function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  const styles = { success:'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', error:'bg-rose-500/10 text-rose-400 border-rose-500/30' };
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border text-sm font-semibold font-mono shadow-xl ${styles[type]||styles.success}`}>
      {msg}
    </div>
  );
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (msg, type='success') => setToast({ msg, type });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [a, s] = await Promise.allSettled([
        alertsAPI.getAlerts({ limit: 100, severity: filter || undefined }),
        alertsAPI.getStats(),
      ]);
      if (a.status === 'fulfilled') setAlerts(a.value.data.alerts || []);
      if (s.status === 'fulfilled') setStats(s.value.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const ack = async (id) => { try { await alertsAPI.acknowledge(id); showToast('Alert acknowledged'); fetchData(); } catch { showToast('Failed', 'error'); } };
  const resolve = async (id) => { try { await alertsAPI.resolve(id); showToast('Alert resolved ✓'); fetchData(); } catch { showToast('Failed', 'error'); } };

  const statCards = [
    { l: 'Total', v: stats.total, color: 'text-zinc-300' },
    { l: 'Unresolved', v: stats.unresolved, color: 'text-orange-400' },
    { l: 'Critical', v: stats.critical, color: 'text-rose-400' },
    { l: 'High', v: stats.high, color: 'text-amber-400' },
  ];

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <div className="text-[10px] font-mono font-bold text-emerald-500 uppercase tracking-widest mb-1">Security Operations</div>
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Security Alerts</h1>
          <p className="text-sm text-zinc-500 mt-1">{stats.total || 0} total · {stats.unresolved || 0} unresolved</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 text-sm font-medium outline-none focus:border-emerald-500/50 transition-colors">
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          <button onClick={fetchData}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 text-sm font-medium hover:bg-zinc-800 transition-all">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {statCards.map(s => (
          <div key={s.l} className="stat-shimmer relative bg-zinc-900 border border-zinc-800 rounded-xl p-4 overflow-hidden">
            <div className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-2">{s.l}</div>
            <div className={`text-2xl font-bold tracking-tight ${s.color}`}>{s.v ?? 0}</div>
          </div>
        ))}
      </div>

      {/* Alert list */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="spinner w-7 h-7" />
            <div className="font-mono text-xs text-zinc-600">loading alerts...</div>
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-zinc-600">
            <div className="text-4xl opacity-30 mb-1">✅</div>
            <div className="text-sm font-semibold text-zinc-500">No alerts found</div>
            <div className="text-xs font-mono">simulate logs from the dashboard to generate alerts</div>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {alerts.map((a, i) => {
              const clr = THREAT_COLORS[a.threat_type] || '#52525b';
              const sev = a.severity?.toLowerCase() || 'low';
              return (
                <div key={i} className={`flex items-start gap-4 px-5 py-4 border-l-2 transition-colors hover:bg-zinc-800/40 ${SEV_BORDER[a.severity] || 'border-l-zinc-700'} ${a.resolved ? 'opacity-40' : ''}`}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 mt-0.5" style={{ background: clr + '18', color: clr }}>
                    {THREAT_ICONS[a.threat_type] || '⚠️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-bold" style={{ color: clr }}>{a.threat_type?.replace(/_/g, ' ')}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${SEV_BADGE[a.severity] || 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>{a.severity}</span>
                      {a.acknowledged && <span className="text-[10px] font-mono font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full">ACK'd</span>}
                      {a.resolved && <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Resolved</span>}
                    </div>
                    <div className="text-xs font-mono text-zinc-400 truncate mb-1">{a.message}</div>
                    <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-600">
                      <span>{a.timestamp?.slice(0,19).replace('T',' ')}</span>
                      {a.source_ips?.length > 0 && <span>⬡ {a.source_ips.join(', ')}</span>}
                      {a.confidence > 0 && <span>{(a.confidence*100).toFixed(0)}% conf</span>}
                    </div>
                    {a.description && <div className="text-[10px] font-mono text-zinc-700 mt-1">{a.description}</div>}
                  </div>
                  {!a.resolved && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!a.acknowledged && (
                        <button onClick={() => ack(a.alert_id)}
                          className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-bold hover:bg-zinc-700 hover:text-zinc-200 transition-all">
                          ACK
                        </button>
                      )}
                      <button onClick={() => resolve(a.alert_id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-all">
                        ✓ Resolve
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
