import React, { useState, useEffect } from 'react';
import { analysisAPI } from '../utils/api';

const MODELS = [
  { key: 'random_forest', label: 'Random Forest', desc: '200 estimators · balanced classes · n_jobs=-1' },
  { key: 'svm',          label: 'SVM Classifier', desc: 'RBF kernel · C=10 · probability enabled' },
  { key: 'dbscan',       label: 'DBSCAN Anomaly', desc: 'eps=0.5 · min_samples=3 · euclidean' },
  { key: 'tfidf',        label: 'TF-IDF Embedder', desc: '128-dim SVD · ngram(1,2) · 5k features' },
];

const QUICK = [
  { label: 'Brute Force', val: 'Failed password for root from 192.168.1.100 port 22 ssh2' },
  { label: 'SYN Flood',   val: 'Possible SYN flooding on port 80. Sending cookies.' },
  { label: 'Priv Esc',    val: 'sudo: bob : TTY=pts/0 ; USER=root ; COMMAND=/bin/bash' },
  { label: 'Port Scan',   val: 'nmap scan detected from 10.10.10.10 multiple ports' },
];

const THREAT_COLORS = { BRUTE_FORCE:'#f97316', PORT_SCAN:'#fbbf24', DDOS:'#f43f5e', UNAUTHORIZED_ACCESS:'#a78bfa', DATA_EXFILTRATION:'#f472b6', ANOMALY:'#38bdf8', NORMAL:'#10b981', UNKNOWN:'#71717a' };

function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 4000); return () => clearTimeout(t); }, [onDone]);
  const s = { success:'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', error:'bg-rose-500/10 text-rose-400 border-rose-500/30' };
  return <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border text-sm font-semibold shadow-xl ${s[type]||s.success}`}>{msg}</div>;
}

export default function AnalysisPage() {
  const [status, setStatus] = useState(null);
  const [msg, setMsg] = useState('');
  const [classResult, setClassResult] = useState(null);
  const [trainResult, setTrainResult] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState({});
  const [toast, setToast] = useState(null);

  const setLoad = (k, v) => setLoading(p => ({ ...p, [k]: v }));
  const showToast = (m, t = 'success') => { setToast({ m, t }); };

  const refreshStatus = () => analysisAPI.getModelStatus().then(r => setStatus(r.data)).catch(() => {});

  useEffect(() => {
    refreshStatus();
    analysisAPI.getTemplates().then(r => setTemplates(r.data.templates || [])).catch(() => {});
  }, []);

  const classify = async () => {
    if (!msg.trim()) return;
    setLoad('cls', true); setClassResult(null);
    try { const r = await analysisAPI.classify(msg); setClassResult(r.data); }
    catch { showToast('Classification failed', 'error'); }
    finally { setLoad('cls', false); }
  };

  const train = async (type) => {
    setLoad('train_' + type, true); setTrainResult(null);
    try {
      const r = await analysisAPI.train(type, 1000);
      setTrainResult(r.data); showToast(`${type.replace('_',' ')} trained successfully!`);
      refreshStatus();
    } catch (e) { showToast('Training failed: ' + (e.response?.data?.error || e.message), 'error'); }
    finally { setLoad('train_' + type, false); }
  };

  const clr = classResult?.classification ? (THREAT_COLORS[classResult.classification.threat_type] || '#71717a') : '#71717a';

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="mb-6">
        <div className="text-[10px] font-mono font-bold text-emerald-500 uppercase tracking-widest mb-1">Machine Learning</div>
        <h1 className="text-xl font-bold text-zinc-100 tracking-tight">ML Analysis</h1>
        <p className="text-sm text-zinc-500 mt-1">Train models, test classification, and inspect Drain log templates</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Model Status */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1 h-4 grad-bar rounded-full block" />
            <span className="text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-wider">Model Status</span>
          </div>
          {status ? (
            <div className="space-y-2">
              {MODELS.map(m => (
                <div key={m.key} className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 hover:border-zinc-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${status[m.key] ? 'grad-dot' : 'bg-zinc-700'}`} style={status[m.key] ? {boxShadow:'0 0 6px rgba(16,185,129,0.6)'} : {}} />
                    <div>
                      <div className="text-sm font-semibold text-zinc-200">{m.label}</div>
                      <div className="text-[10px] font-mono text-zinc-600 mt-0.5">{m.desc}</div>
                    </div>
                  </div>
                  <span className={`text-[11px] font-mono font-bold ${status[m.key] ? 'text-emerald-500' : 'text-zinc-700'}`}>
                    {status[m.key] ? '✓ Ready' : '✗ Not trained'}
                  </span>
                </div>
              ))}
              <button onClick={refreshStatus}
                className="mt-1 px-3 py-1.5 text-xs font-mono font-bold rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-500 hover:text-zinc-300 transition-all">
                Refresh Status
              </button>
            </div>
          ) : (
            <div className="flex justify-center py-10"><div className="spinner w-6 h-6" /></div>
          )}
        </div>

        {/* Train Models */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1 h-4 grad-bar rounded-full block" />
            <span className="text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-wider">Train Models</span>
          </div>
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 mb-4 font-mono text-[11px] text-zinc-600 leading-relaxed">
            <span className="text-emerald-600">// 1000 synthetic samples · 7 attack classes</span><br/>
            <span className="text-emerald-600">// TF-IDF + SVD · no PyTorch required</span><br/>
            or run: <span className="text-zinc-400">python train_models.py</span>
          </div>
          <div className="space-y-2">
            <button onClick={() => train('random_forest')} disabled={loading['train_random_forest']}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg grad-btn text-sm font-bold disabled:opacity-40 transition-all">
              {loading['train_random_forest'] ? <><span className="spinner w-3.5 h-3.5" style={{borderColor:'rgba(9,9,11,0.2)',borderTopColor:'#09090b'}}/>Training Random Forest...</> : '🌳 Train Random Forest'}
            </button>
            <button onClick={() => train('svm')} disabled={loading['train_svm']}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm font-bold hover:bg-zinc-700 disabled:opacity-40 transition-all">
              {loading['train_svm'] ? <><span className="spinner w-3.5 h-3.5" />Training SVM...</> : '🔷 Train SVM  (slower)'}
            </button>
          </div>
          {trainResult && (
            <div className="mt-3 px-4 py-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
              <div className="text-sm font-bold text-emerald-400 mb-1">✓ Training Complete</div>
              <div className="text-[11px] font-mono text-zinc-500">{trainResult.model_type} · {trainResult.samples} samples · {trainResult.classes?.length} classes</div>
              <div className="text-[11px] font-mono text-zinc-600">{trainResult.message}</div>
            </div>
          )}
        </div>
      </div>

      {/* Classifier */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-1 h-4 grad-bar rounded-full block" />
          <span className="text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-wider">Test Classification</span>
        </div>
        <textarea
          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-700 px-4 py-3 font-mono text-xs leading-relaxed resize-none outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
          rows={3}
          placeholder="Enter a log message to classify..."
          value={msg} onChange={e => setMsg(e.target.value)}
        />
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <button onClick={classify} disabled={loading['cls'] || !msg.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg grad-btn text-sm font-bold disabled:opacity-40 transition-all">
            {loading['cls'] ? <><span className="spinner w-3 h-3" style={{borderColor:'rgba(9,9,11,0.2)',borderTopColor:'#09090b'}}/>Classifying...</> : '→ Classify'}
          </button>
          <span className="text-[11px] font-mono text-zinc-700">quick tests:</span>
          {QUICK.map(q => (
            <button key={q.label} onClick={() => setMsg(q.val)}
              className="px-2.5 py-1.5 text-[11px] font-mono font-bold rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-all">
              {q.label}
            </button>
          ))}
        </div>

        {classResult && (
          <div className="mt-5 pt-5 border-t border-zinc-800">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span className="text-xl font-bold tracking-tight" style={{ color: clr }}>
                {classResult.classification?.threat_type || 'UNKNOWN'}
              </span>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full border" style={{ color: clr, background: clr+'18', borderColor: clr+'33' }}>
                {classResult.classification?.severity}
              </span>
              <span className="text-xs font-mono text-zinc-600">
                confidence: {classResult.classification?.confidence ? (classResult.classification.confidence * 100).toFixed(0) + '%' : '—'}
              </span>
            </div>
            <pre className="result-panel">{JSON.stringify(classResult, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* Templates */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-1 h-4 grad-bar rounded-full block" />
            <span className="text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-wider">Drain Log Templates</span>
            <span className="text-[11px] font-mono font-bold text-emerald-500">{templates.length}</span>
          </div>
          <button onClick={() => analysisAPI.getTemplates().then(r => setTemplates(r.data.templates || [])).catch(() => {})}
            className="px-3 py-1.5 text-[11px] font-mono font-bold rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-500 hover:text-zinc-300 transition-all">
            Refresh
          </button>
        </div>

        {templates.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-2 text-zinc-600">
            <div className="text-3xl opacity-30 mb-1">🔧</div>
            <div className="text-sm font-semibold text-zinc-500">No templates yet</div>
            <div className="text-xs font-mono">auto-mined as logs are ingested</div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-sm data-table">
              <thead>
                <tr className="border-b border-zinc-800">
                  {['ID', 'Template Pattern', 'Matches'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-widest bg-zinc-950">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {templates.map(t => (
                  <tr key={t.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-[11px] text-zinc-600 w-12">{t.id}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-zinc-400">{t.template}</td>
                    <td className="px-4 py-2.5 font-mono text-xs font-bold text-emerald-500 w-20">{t.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && <Toast msg={toast.m} type={toast.t} onDone={() => setToast(null)} />}
    </div>
  );
}
