import React, { useState, useEffect, useCallback } from 'react';
import { logsAPI } from '../utils/api';

const THREAT_COLORS = { BRUTE_FORCE:'#f97316', PORT_SCAN:'#fbbf24', DDOS:'#f43f5e', UNAUTHORIZED_ACCESS:'#a78bfa', DATA_EXFILTRATION:'#f472b6', ANOMALY:'#38bdf8', NORMAL:'#10b981' };
const SEV_BADGE = { CRITICAL:'bg-rose-500/10 text-rose-400 border-rose-500/20', HIGH:'bg-orange-500/10 text-orange-400 border-orange-500/20', MEDIUM:'bg-amber-500/10 text-amber-400 border-amber-500/20', LOW:'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', NORMAL:'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [threatsOnly, setThreatsOnly] = useState(false);
  const [selected, setSelected] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await logsAPI.getLogs({ page, limit: 50, threats_only: threatsOnly });
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, threatsOnly]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { logsAPI.getStats().then(r => setStats(r.data)).catch(() => {}); }, []);

  const pages = Math.ceil(total / 50);

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <div className="text-[10px] font-mono font-bold text-emerald-500 uppercase tracking-widest mb-1">System Logs</div>
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Log Viewer</h1>
          <p className="text-sm text-zinc-500 mt-1">{total.toLocaleString()} entries · {stats.total_threats || 0} threats</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div className="relative">
              <input type="checkbox" className="sr-only peer" checked={threatsOnly} onChange={e => { setThreatsOnly(e.target.checked); setPage(1); }} />
              <div className="w-9 h-5 bg-zinc-700 rounded-full peer-checked:bg-emerald-500 transition-colors" />
              <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
            </div>
            <span className="text-sm font-medium text-zinc-400">Threats only</span>
          </label>
          <button onClick={fetchLogs}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 text-sm font-medium hover:bg-zinc-800 transition-all">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full data-table text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {['Timestamp', 'Host', 'Category', 'Threat', 'Severity', 'Conf.', 'Message'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-widest bg-zinc-900/80 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                <tr><td colSpan={7} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="spinner w-6 h-6" />
                    <div className="font-mono text-xs text-zinc-600">loading logs...</div>
                  </div>
                </td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center">
                  <div className="text-3xl mb-2 opacity-30">📭</div>
                  <div className="text-sm font-semibold text-zinc-500">No logs found</div>
                  <div className="text-xs font-mono text-zinc-600 mt-1">use log ingestion or simulate logs from the dashboard</div>
                </td></tr>
              ) : logs.map((log, i) => {
                const c = log.classification || {};
                const tt = c.threat_type || 'NORMAL';
                const clr = THREAT_COLORS[tt] || '#52525b';
                const isSelected = selected?._id === log._id;
                return (
                  <tr key={i} className={isSelected ? 'row-selected' : ''} onClick={() => setSelected(isSelected ? null : log)}>
                    <td className="px-4 py-3 font-mono text-[11px] text-zinc-600 whitespace-nowrap">{log.analyzed_at?.slice(0,19).replace('T',' ')}</td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-400">{log.hostname || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-mono font-bold text-zinc-500 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded">{log.category || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border" style={{ color: clr, background: clr+'18', borderColor: clr+'33' }}>{tt}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${SEV_BADGE[c.severity] || 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>{c.severity || 'LOW'}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-sky-400">{c.confidence ? `${(c.confidence*100).toFixed(0)}%` : '—'}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-zinc-500 max-w-xs truncate" title={log.message}>{log.message}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
            <span className="font-mono text-[11px] text-zinc-600">page {page} of {pages} · {total.toLocaleString()} records</span>
            <div className="flex items-center gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 transition-all">← Prev</button>
              {[...Array(Math.min(pages, 5))].map((_, idx) => (
                <button key={idx} onClick={() => setPage(idx + 1)}
                  className={`w-8 h-8 text-xs font-bold rounded-lg border transition-all ${page === idx+1 ? 'grad-btn border-transparent' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'}`}>
                  {idx + 1}
                </button>
              ))}
              {pages > 5 && <span className="text-zinc-600 text-xs px-1">...</span>}
              <button disabled={page === pages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 transition-all">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="bg-zinc-900 border border-emerald-500/30 rounded-xl p-5 shadow-glow-emerald">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-1 h-4 grad-bar rounded-full block" />
              <span className="text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-wider">Log Detail</span>
            </div>
            <button onClick={() => setSelected(null)}
              className="text-zinc-500 hover:text-zinc-300 text-xs font-mono font-bold px-2 py-1 rounded bg-zinc-800 border border-zinc-700 transition-colors">✕ Close</button>
          </div>
          <pre className="result-panel">{JSON.stringify(selected, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
