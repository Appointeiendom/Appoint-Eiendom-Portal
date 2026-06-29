import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import api from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

// ── Status logic ──────────────────────────────────────────────────────────────

function itemStatus(data, type) {
  if (!data) return 'pending';
  if (type === 'fireExt') {
    if (!data.present) return 'fail';
    if (data.gaugeGreen === false || data.pinIntact === false) return 'fail';
    return 'ok';
  }
  if (!data.present) return 'fail';
  if (data.needsInspection) return 'fail';
  return 'ok';
}

function overallStatus(r) {
  if (!r) return 'pending';
  const s = [
    itemStatus(r.fireExtinguisher, 'fireExt'),
    itemStatus(r.smokeDetector, 'det'),
    itemStatus(r.stoveSensor, 'det'),
  ];
  if (s.every(x => x === 'ok')) return 'passed';
  if (s.includes('fail')) return 'issues';
  return 'pending';
}

function getIssues(r) {
  const issues = [];
  const fe = r?.fireExtinguisher;
  const sd = r?.smokeDetector;
  const sv = r?.stoveSensor;
  if (fe) {
    if (!fe.present) issues.push(`🧯 Fire ext not present${fe.notPresentReason ? ` — ${fe.notPresentReason}` : ''}`);
    else if (fe.gaugeGreen === false) issues.push(`🧯 Gauge not green${fe.gaugeReason ? ` — ${fe.gaugeReason}` : ''}`);
    else if (fe.pinIntact === false) issues.push(`🧯 Pin not intact${fe.pinReason ? ` — ${fe.pinReason}` : ''}`);
  }
  if (sd) {
    if (!sd.present) issues.push(`🔔 Smoke detector not present${sd.notPresentReason ? ` — ${sd.notPresentReason}` : ''}`);
    else if (sd.needsInspection) issues.push('🔔 Smoke detector needs physical inspection');
  }
  if (sv) {
    if (!sv.present) issues.push(`🍳 Stove sensor not present${sv.notPresentReason ? ` — ${sv.notPresentReason}` : ''}`);
    else if (sv.needsInspection) issues.push('🍳 Stove sensor needs physical inspection');
  }
  return issues;
}

// ── Export ────────────────────────────────────────────────────────────────────

function exportExcel(rows, label) {
  const data = rows.map(row => {
    const r = row.response;
    const fe = r?.fireExtinguisher;
    const sd = r?.smokeDetector;
    const sv = r?.stoveSensor;
    return {
      'Tenant': row.tenant.name,
      'Email': row.tenant.email,
      'Building': row.tenant.unit || '',
      'Unit': row.tenant.building || '',
      'Status': overallStatus(r) === 'passed' ? 'Passed' : overallStatus(r) === 'issues' ? 'Has Issues' : 'Pending',
      'Submitted': r?.completedAt ? new Date(r.completedAt).toLocaleDateString('en-GB') : '—',
      'Fire Ext Present': fe ? (fe.present ? 'Yes' : 'No') : '—',
      'Fire Ext Gauge': fe?.present ? (fe.gaugeGreen ? 'Yes' : 'No') : '—',
      'Fire Ext Pin': fe?.present ? (fe.pinIntact ? 'Yes' : 'No') : '—',
      'Smoke Det Present': sd ? (sd.present ? 'Yes' : 'No') : '—',
      'Smoke Det Beeped': sd?.present ? (sd.beeped ? 'Yes' : 'No') : '—',
      'Smoke Det Needs Visit': sd?.present ? (sd.needsInspection ? 'YES' : 'No') : '—',
      'Stove Sensor Present': sv ? (sv.present ? 'Yes' : 'No') : '—',
      'Stove Sensor Beeped': sv?.present ? (sv.beeped ? 'Yes' : 'No') : '—',
      'Stove Sensor Needs Visit': sv?.present ? (sv.needsInspection ? 'YES' : 'No') : '—',
    };
  });
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = Object.keys(data[0] || {}).map(k => ({ wch: Math.max(k.length, ...data.map(r => String(r[k] || '').length)) + 2 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Results');
  XLSX.writeFile(wb, `inspection-${label.replace(/\s/g, '-')}.xlsx`);
  toast.success('Excel downloaded');
}

function exportWord(rows, label) {
  const headers = ['Tenant', 'Building', 'Unit', 'Status', 'Issues'];
  const tableRows = [
    `<tr>${headers.map(h => `<th style="background:#f3f4f6;padding:6px 10px;font-size:11px;border:1px solid #e5e7eb">${h}</th>`).join('')}</tr>`,
    ...rows.map(row => {
      const status = overallStatus(row.response);
      const issues = getIssues(row.response).join('; ');
      return `<tr>
        <td style="padding:5px 10px;font-size:11px;border:1px solid #e5e7eb">${row.tenant.name}</td>
        <td style="padding:5px 10px;font-size:11px;border:1px solid #e5e7eb">${row.tenant.unit || ''}</td>
        <td style="padding:5px 10px;font-size:11px;border:1px solid #e5e7eb">${row.tenant.building || ''}</td>
        <td style="padding:5px 10px;font-size:11px;border:1px solid #e5e7eb">${status === 'passed' ? 'Passed' : status === 'issues' ? 'Has Issues' : 'Pending'}</td>
        <td style="padding:5px 10px;font-size:11px;border:1px solid #e5e7eb">${issues || '—'}</td>
      </tr>`;
    }),
  ].join('');
  const html = `<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head><body>
    <h2 style="font-family:Arial">Safety Inspection — ${label}</h2>
    <table style="border-collapse:collapse;font-family:Arial;width:100%">${tableRows}</table>
  </body></html>`;
  const blob = new Blob([html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `inspection-${label.replace(/\s/g, '-')}.doc`; a.click();
  URL.revokeObjectURL(url);
  toast.success('Word downloaded');
}

function ExportMenu({ rows, label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  if (!rows.length) return null;
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-sm transition-colors">
        ⬇ Export ▾
      </button>
      {open && (
        <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 w-40 py-1">
          <button onClick={() => { exportExcel(rows, label); setOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex gap-2">📊 Excel (.xlsx)</button>
          <button onClick={() => { exportWord(rows, label); setOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex gap-2">📄 Word (.doc)</button>
        </div>
      )}
    </div>
  );
}

// ── Issue detail expandable ───────────────────────────────────────────────────

function IssueDetail({ response }) {
  const fe = response?.fireExtinguisher;
  const sd = response?.smokeDetector;
  const sv = response?.stoveSensor;
  return (
    <div className="mt-2 pt-2 border-t border-red-100 grid grid-cols-3 gap-3 text-xs">
      {[
        { label: '🧯 Fire Ext', data: fe, type: 'fireExt' },
        { label: '🔔 Smoke Det', data: sd, type: 'det' },
        { label: '🍳 Stove Sensor', data: sv, type: 'det' },
      ].map(({ label, data, type }) => (
        <div key={label}>
          <p className="font-semibold text-gray-600 mb-1">{label}</p>
          {!data ? <p className="text-gray-400">No data</p> : (
            <div className="space-y-0.5 text-gray-600">
              <p>Present: {data.present ? '✅' : '❌'}{!data.present && data.notPresentReason ? ` ${data.notPresentReason}` : ''}</p>
              {type === 'fireExt' && data.present && <>
                <p>Gauge: {data.gaugeGreen ? '✅' : '❌'}{!data.gaugeGreen && data.gaugeReason ? ` ${data.gaugeReason}` : ''}</p>
                <p>Pin: {data.pinIntact ? '✅' : '❌'}{!data.pinIntact && data.pinReason ? ` ${data.pinReason}` : ''}</p>
              </>}
              {type === 'det' && data.present && <>
                <p>Beeped: {data.beeped ? '✅' : '❌'}</p>
                {data.beeped === false && <p>After battery: {data.beepedAfterBattery ? '✅' : '❌'}</p>}
                {data.needsInspection && <p className="text-red-600 font-semibold">Needs visit</p>}
              </>}
              {data.photo && <img src={data.photo} alt="" className="mt-1 h-16 rounded object-cover cursor-pointer" onClick={() => window.open(data.photo)} />}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AdminInspections() {
  const [inspections, setInspections] = useState([]);
  const [selected, setSelected] = useState(null);
  const [rows, setRows] = useState([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [creating, setCreating] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [closing, setClosing] = useState(false);
  const [expandedIssue, setExpandedIssue] = useState(null);

  useEffect(() => {
    api.get('/inspections').then(r => {
      setInspections(r.data);
      if (r.data.length > 0) setSelected(r.data[0]);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoadingRows(true);
    setExpandedIssue(null);
    api.get(`/inspections/${selected._id}/responses`)
      .then(r => setRows(r.data.tenants))
      .catch(console.error)
      .finally(() => setLoadingRows(false));
  }, [selected]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!dueDate) return;
    setCreating(true);
    try {
      const res = await api.post('/inspections', { dueDate });
      setInspections(prev => [res.data, ...prev.map(i => ({ ...i, status: 'closed' }))]);
      setSelected(res.data);
      setDueDate('');
      toast.success('Inspection started');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = async () => {
    if (!selected || !confirm("Close this inspection?")) return;
    setClosing(true);
    try {
      const res = await api.put(`/inspections/${selected._id}/close`);
      setInspections(prev => prev.map(i => i._id === selected._id ? res.data : i));
      setSelected(res.data);
      toast.success('Inspection closed');
    } catch { toast.error('Failed'); } finally { setClosing(false); }
  };

  const handleDeleteInspection = async (ins) => {
    if (!confirm(`Delete this inspection and all responses?`)) return;
    try {
      await api.delete(`/inspections/${ins._id}`);
      const updated = inspections.filter(i => i._id !== ins._id);
      setInspections(updated);
      setSelected(updated[0] || null);
      setRows([]);
      toast.success('Deleted');
    } catch { toast.error('Failed'); }
  };

  const handleDeleteResponse = async (tenantId) => {
    if (!confirm("Reset this tenant's response?")) return;
    try {
      await api.delete(`/inspections/${selected._id}/responses/${tenantId}`);
      setRows(prev => prev.map(r => r.tenant._id === tenantId ? { ...r, response: null } : r));
      toast.success('Response reset');
    } catch { toast.error('Failed'); }
  };

  const passed = rows.filter(r => overallStatus(r.response) === 'passed');
  const issues = rows.filter(r => overallStatus(r.response) === 'issues');
  const pending = rows.filter(r => overallStatus(r.response) === 'pending');

  // Group issues by building
  const issuesByBuilding = issues.reduce((acc, row) => {
    const key = row.tenant.unit || 'Unknown Building';
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const inspLabel = selected ? new Date(selected.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  return (
    <Layout>
      <div className="max-w-4xl">

        {/* Header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">🔥 Safety Inspections</h1>
            <p className="text-gray-500 text-sm mt-1">Fire extinguisher · Smoke detector · Stove heat detector</p>
          </div>
          <form onSubmit={handleCreate} className="flex items-center gap-2">
            <input type="date" value={dueDate} min={minDate.toISOString().split('T')[0]}
              onChange={e => setDueDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
            <button type="submit" disabled={creating || !dueDate}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
              {creating ? '…' : '+ New'}
            </button>
          </form>
        </div>

        {/* Inspection picker */}
        {inspections.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-6">
            {inspections.map(ins => (
              <div key={ins._id}
                className={`flex items-center rounded-lg border text-sm font-medium transition-colors ${selected?._id === ins._id ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200'}`}>
                <button onClick={() => setSelected(ins)} className="px-3 py-1.5">
                  {new Date(ins.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  <span className={`ml-1.5 text-xs ${ins.status === 'active' ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {ins.status === 'active' ? '● Active' : '○ Closed'}
                  </span>
                </button>
                <button onClick={() => handleDeleteInspection(ins)}
                  className={`pr-2.5 text-sm hover:text-red-400 transition-colors ${selected?._id === ins._id ? 'text-gray-500' : 'text-gray-300'}`}>🗑</button>
              </div>
            ))}
          </div>
        )}

        {selected && (
          <>
            {/* Progress bar */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500">
                    <span className="font-bold text-gray-800 text-lg">{passed.length + issues.length}</span>
                    <span className="text-gray-400">/{rows.length}</span>
                    <span className="ml-1">responded</span>
                  </span>
                  <span className="text-emerald-600 font-medium">✅ {passed.length} passed</span>
                  <span className="text-red-500 font-medium">🔴 {issues.length} issues</span>
                  <span className="text-gray-400">⏳ {pending.length} pending</span>
                </div>
                <div className="flex items-center gap-2">
                  <ExportMenu rows={rows} label={inspLabel} />
                  {selected.status === 'active' && (
                    <button onClick={handleClose} disabled={closing}
                      className="text-xs text-red-400 hover:text-red-600 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                      {closing ? '…' : 'Close inspection'}
                    </button>
                  )}
                </div>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${rows.length ? (passed.length / rows.length) * 100 : 0}%` }} />
                <div className="h-full bg-red-400 transition-all" style={{ width: `${rows.length ? (issues.length / rows.length) * 100 : 0}%` }} />
              </div>
              <div className="flex gap-4 mt-1.5 text-xs text-gray-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block"/>Passed</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-400 inline-block"/>Issues</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-gray-200 inline-block"/>Pending</span>
              </div>
            </div>

            {loadingRows ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-xl border border-gray-200 animate-pulse" />)}</div>
            ) : (
              <div className="space-y-4">

                {/* ── Issues ── */}
                {issues.length > 0 && (
                  <div className="bg-white border border-red-200 rounded-xl overflow-hidden">
                    <div className="px-5 py-3 bg-red-50 border-b border-red-100 flex items-center justify-between">
                      <p className="font-semibold text-red-700">🔴 Needs Attention — {issues.length} {issues.length === 1 ? 'tenant' : 'tenants'}</p>
                      <p className="text-xs text-red-400">These buildings need a physical visit</p>
                    </div>
                    {Object.keys(issuesByBuilding).sort().map(building => (
                      <div key={building} className="border-b border-red-50 last:border-0">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 pt-3 pb-1">🏢 {building}</p>
                        {issuesByBuilding[building].map(row => {
                          const issueList = getIssues(row.response);
                          const isOpen = expandedIssue === row.tenant._id;
                          return (
                            <div key={row.tenant._id} className="px-5 pb-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <button onClick={() => setExpandedIssue(isOpen ? null : row.tenant._id)}
                                    className="text-sm font-medium text-gray-800 hover:text-red-600 text-left">
                                    {row.tenant.name}
                                    {row.tenant.building && <span className="text-gray-400 font-normal ml-1">· Unit {row.tenant.building}</span>}
                                    <span className="text-gray-400 text-xs ml-2">{isOpen ? '▲' : '▼'}</span>
                                  </button>
                                  <ul className="mt-1 space-y-0.5">
                                    {issueList.map((issue, i) => (
                                      <li key={i} className="text-xs text-red-600">{issue}</li>
                                    ))}
                                  </ul>
                                  {isOpen && <IssueDetail response={row.response} />}
                                </div>
                                <button onClick={() => handleDeleteResponse(row.tenant._id)}
                                  className="text-gray-300 hover:text-red-400 text-xs mt-0.5 shrink-0" title="Reset response">🗑</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Pending ── */}
                {pending.length > 0 && (
                  <div className="bg-white border border-amber-200 rounded-xl overflow-hidden">
                    <div className="px-5 py-3 bg-amber-50 border-b border-amber-100">
                      <p className="font-semibold text-amber-700">⏳ Waiting for Response — {pending.length} {pending.length === 1 ? 'tenant' : 'tenants'}</p>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {pending.map(row => (
                        <div key={row.tenant._id} className="px-5 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-700">{row.tenant.name}</p>
                            <p className="text-xs text-gray-400">{row.tenant.unit}{row.tenant.building ? ` · Unit ${row.tenant.building}` : ''}</p>
                          </div>
                          <span className="text-xs text-amber-500 font-medium">Not submitted</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Passed ── */}
                {passed.length > 0 && (
                  <div className="bg-white border border-emerald-200 rounded-xl overflow-hidden">
                    <div className="px-5 py-3 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
                      <p className="font-semibold text-emerald-700">✅ Passed — {passed.length} {passed.length === 1 ? 'tenant' : 'tenants'}</p>
                      <p className="text-xs text-emerald-500">Everything checked out</p>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {passed.map(row => (
                        <div key={row.tenant._id} className="px-5 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-700">{row.tenant.name}</p>
                            <p className="text-xs text-gray-400">{row.tenant.unit}{row.tenant.building ? ` · Unit ${row.tenant.building}` : ''}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            {row.response?.completedAt && (
                              <span className="text-xs text-gray-400">{new Date(row.response.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                            )}
                            <button onClick={() => handleDeleteResponse(row.tenant._id)}
                              className="text-gray-300 hover:text-red-400 text-xs transition-colors" title="Reset response">🗑</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {rows.length === 0 && (
                  <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
                    <p className="text-gray-400">No tenants found for this inspection.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {inspections.length === 0 && (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center">
            <p className="text-4xl mb-3">🔥</p>
            <p className="text-gray-600 font-medium">No inspections yet</p>
            <p className="text-gray-400 text-sm mt-1">Set a due date above to start the first inspection.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
