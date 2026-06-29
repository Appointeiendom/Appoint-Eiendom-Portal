import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import api from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

function itemStatus(data, type) {
  if (!data) return 'pending';
  if (type === 'fireExt') {
    if (!data.present) return 'absent';
    if (data.gaugeGreen === false || data.pinIntact === false) return 'issue';
    return 'ok';
  }
  if (!data.present) return 'absent';
  if (data.needsInspection) return 'needs';
  return 'ok';
}

function overallStatus(r) {
  if (!r) return 'pending';
  const statuses = [itemStatus(r.fireExtinguisher, 'fireExt'), itemStatus(r.smokeDetector, 'det'), itemStatus(r.stoveSensor, 'det')];
  if (statuses.includes('needs')) return 'needs';
  if (statuses.includes('issue')) return 'issue';
  if (statuses.includes('absent')) return 'absent';
  if (statuses.every(s => s === 'ok')) return 'ok';
  return 'pending';
}

const STATUS_CONFIG = {
  ok:      { label: 'OK',               pill: 'bg-emerald-100 text-emerald-700', icon: '✅' },
  absent:  { label: 'Absent',           pill: 'bg-amber-100 text-amber-700',     icon: '⚠️' },
  issue:   { label: 'Issue',            pill: 'bg-amber-100 text-amber-700',     icon: '⚠️' },
  needs:   { label: 'Needs Inspection', pill: 'bg-red-100 text-red-700',         icon: '🔴' },
  pending: { label: 'Pending',          pill: 'bg-gray-100 text-gray-500',       icon: '—'  },
};

function StatusBadge({ status }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${c.pill}`}>{c.icon} {c.label}</span>;
}

function StatusIcon({ status }) {
  return <span className="text-base">{(STATUS_CONFIG[status] || STATUS_CONFIG.pending).icon}</span>;
}

function DetailRow({ label, value, color }) {
  return (
    <div className="flex justify-between text-xs py-0.5">
      <span className="text-gray-500">{label}</span>
      <span className={color || 'text-gray-700'}>{value || '—'}</span>
    </div>
  );
}

function TenantDetail({ row }) {
  const r = row.response;
  if (!r) return <p className="text-sm text-gray-400 py-4 text-center">No response submitted yet.</p>;
  const fe = r.fireExtinguisher;
  const sd = r.smokeDetector;
  const sv = r.stoveSensor;
  return (
    <div className="grid md:grid-cols-3 gap-4 py-4 px-2 border-t border-gray-100">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-700">🧯 Fire Extinguisher</p>
        {fe ? (
          <>
            <DetailRow label="Present" value={fe.present ? '✅ Yes' : `❌ No — ${fe.notPresentReason || ''}`} color={fe.present ? 'text-emerald-700' : 'text-amber-700'} />
            {fe.present && <>
              <DetailRow label="Gauge (green)" value={fe.gaugeGreen ? '✅ Yes' : `❌ No — ${fe.gaugeReason || ''}`} color={fe.gaugeGreen ? 'text-emerald-700' : 'text-red-700'} />
              <DetailRow label="Safety pin" value={fe.pinIntact ? '✅ Intact' : `❌ No — ${fe.pinReason || ''}`} color={fe.pinIntact ? 'text-emerald-700' : 'text-red-700'} />
            </>}
            {fe.photo && <img src={fe.photo} alt="fire ext" className="w-full h-32 object-cover rounded-lg mt-1 cursor-pointer" onClick={() => window.open(fe.photo)} />}
          </>
        ) : <p className="text-xs text-gray-400">No data</p>}
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-700">🔔 Smoke Detector</p>
        {sd ? (
          <>
            <DetailRow label="Present" value={sd.present ? '✅ Yes' : `❌ No — ${sd.notPresentReason || ''}`} color={sd.present ? 'text-emerald-700' : 'text-amber-700'} />
            {sd.present && <>
              <DetailRow label="Beeped (first)" value={sd.beeped ? '✅ Yes' : '❌ No'} color={sd.beeped ? 'text-emerald-700' : 'text-red-700'} />
              {sd.beeped === false && <DetailRow label="Beeped after battery" value={sd.beepedAfterBattery ? '✅ Yes' : '❌ No'} color={sd.beepedAfterBattery ? 'text-emerald-700' : 'text-red-700'} />}
              {sd.needsInspection && <p className="text-xs text-red-700 font-semibold">🚨 Needs physical inspection</p>}
            </>}
            {sd.photo && <img src={sd.photo} alt="smoke det" className="w-full h-32 object-cover rounded-lg mt-1 cursor-pointer" onClick={() => window.open(sd.photo)} />}
          </>
        ) : <p className="text-xs text-gray-400">No data</p>}
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-700">🍳 Stove Heat Detector</p>
        {sv ? (
          <>
            <DetailRow label="Present" value={sv.present ? '✅ Yes' : `❌ No — ${sv.notPresentReason || ''}`} color={sv.present ? 'text-emerald-700' : 'text-amber-700'} />
            {sv.present && <>
              <DetailRow label="Beeped (first)" value={sv.beeped ? '✅ Yes' : '❌ No'} color={sv.beeped ? 'text-emerald-700' : 'text-red-700'} />
              {sv.beeped === false && <DetailRow label="Beeped after battery" value={sv.beepedAfterBattery ? '✅ Yes' : '❌ No'} color={sv.beepedAfterBattery ? 'text-emerald-700' : 'text-red-700'} />}
              {sv.needsInspection && <p className="text-xs text-red-700 font-semibold">🚨 Needs physical inspection</p>}
            </>}
            {sv.photo && <img src={sv.photo} alt="stove sensor" className="w-full h-32 object-cover rounded-lg mt-1 cursor-pointer" onClick={() => window.open(sv.photo)} />}
          </>
        ) : <p className="text-xs text-gray-400">No data</p>}
      </div>
    </div>
  );
}

// Compliance table rows — used by Overview and Submitted tabs
function ComplianceTable({ rows, expanded, setExpanded, emptyMessage }) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
        <p className="text-gray-400">{emptyMessage}</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
        <span>Tenant</span>
        <span className="text-center w-10">🧯</span>
        <span className="text-center w-10">🔔</span>
        <span className="text-center w-10">🍳</span>
        <span>Status</span>
      </div>
      {rows.map(row => {
        const r = row.response;
        const feStatus = itemStatus(r?.fireExtinguisher, 'fireExt');
        const sdStatus = itemStatus(r?.smokeDetector, 'det');
        const svStatus = itemStatus(r?.stoveSensor, 'det');
        const overall = overallStatus(r);
        const isExpanded = expanded === row.tenant._id;
        return (
          <div key={row.tenant._id} className="border-b border-gray-100 last:border-0">
            <button
              onClick={() => setExpanded(isExpanded ? null : row.tenant._id)}
              className="w-full grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-4 py-3 hover:bg-gray-50 transition-colors text-left">
              <div>
                <p className="text-sm font-medium text-gray-800">{row.tenant.name}</p>
                <p className="text-xs text-gray-400">{row.tenant.unit}{row.tenant.building ? ` · Apt ${row.tenant.building}` : ''}</p>
              </div>
              <div className="w-10 text-center"><StatusIcon status={feStatus} /></div>
              <div className="w-10 text-center"><StatusIcon status={sdStatus} /></div>
              <div className="w-10 text-center"><StatusIcon status={svStatus} /></div>
              <div>
                <StatusBadge status={overall} />
                {r?.completedAt && <p className="text-xs text-gray-400 mt-0.5">{new Date(r.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>}
              </div>
            </button>
            {isExpanded && <div className="px-4 pb-4"><TenantDetail row={row} /></div>}
          </div>
        );
      })}
    </div>
  );
}

// Needs Inspection tab — grouped by building, shows only problem rows
function NeedsInspectionTab({ rows }) {
  const problemRows = rows.filter(r => {
    const s = overallStatus(r.response);
    return s !== 'ok' && s !== 'pending';
  });

  if (problemRows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center">
        <p className="text-3xl mb-2">✅</p>
        <p className="text-gray-600 font-medium">No issues found</p>
        <p className="text-gray-400 text-sm mt-1">All submitted responses passed every check.</p>
      </div>
    );
  }

  const groups = {};
  for (const row of problemRows) {
    const key = row.tenant.unit || 'Unknown Building';
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">{problemRows.length} {problemRows.length === 1 ? 'tenant has' : 'tenants have'} issues across {Object.keys(groups).length} building{Object.keys(groups).length !== 1 ? 's' : ''}.</p>
      {Object.keys(groups).sort().map(building => {
        const buildingRows = groups[building];
        const hasPhysical = buildingRows.some(r => overallStatus(r.response) === 'needs');
        return (
          <div key={building} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏢</span>
                <span className="font-semibold text-gray-800">{building}</span>
                {hasPhysical && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Physical visit needed</span>}
              </div>
              <span className="text-xs text-gray-400">{buildingRows.length} {buildingRows.length === 1 ? 'tenant' : 'tenants'}</span>
            </div>
            <div className="divide-y divide-gray-100">
              {buildingRows.map(row => {
                const r = row.response;
                const fe = r?.fireExtinguisher;
                const sd = r?.smokeDetector;
                const sv = r?.stoveSensor;
                const issues = [];
                if (fe) {
                  if (!fe.present) issues.push({ icon: '🧯', text: `Fire ext not present${fe.notPresentReason ? ` — ${fe.notPresentReason}` : ''}` });
                  else if (fe.gaugeGreen === false) issues.push({ icon: '🧯', text: `Gauge not green${fe.gaugeReason ? ` — ${fe.gaugeReason}` : ''}` });
                  else if (fe.pinIntact === false) issues.push({ icon: '🧯', text: `Pin not intact${fe.pinReason ? ` — ${fe.pinReason}` : ''}` });
                }
                if (sd) {
                  if (!sd.present) issues.push({ icon: '🔔', text: `Smoke detector not present${sd.notPresentReason ? ` — ${sd.notPresentReason}` : ''}` });
                  else if (sd.needsInspection) issues.push({ icon: '🔔', text: 'Smoke detector needs physical inspection' });
                }
                if (sv) {
                  if (!sv.present) issues.push({ icon: '🍳', text: `Stove sensor not present${sv.notPresentReason ? ` — ${sv.notPresentReason}` : ''}` });
                  else if (sv.needsInspection) issues.push({ icon: '🍳', text: 'Stove sensor needs physical inspection' });
                }
                return (
                  <div key={row.tenant._id} className="px-5 py-3.5 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {row.tenant.name}
                        {row.tenant.building && <span className="text-gray-400 font-normal"> · Apt {row.tenant.building}</span>}
                      </p>
                      <ul className="mt-1.5 space-y-0.5">
                        {issues.map((issue, i) => (
                          <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                            <span className="shrink-0">{issue.icon}</span>
                            <span>{issue.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <StatusBadge status={overallStatus(row.response)} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Pending tab — tenants who haven't responded
function PendingTab({ rows }) {
  const pendingRows = rows.filter(r => !r.response);
  if (pendingRows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center">
        <p className="text-3xl mb-2">🎉</p>
        <p className="text-gray-600 font-medium">All tenants have responded</p>
      </div>
    );
  }

  const groups = {};
  for (const row of pendingRows) {
    const key = row.tenant.unit || 'Unknown Building';
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">{pendingRows.length} {pendingRows.length === 1 ? 'tenant has' : 'tenants have'} not responded yet.</p>
      {Object.keys(groups).sort().map(building => (
        <div key={building} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-lg">🏢</span>
              <span className="font-semibold text-gray-800">{building}</span>
            </div>
            <span className="text-xs text-gray-400">{groups[building].length} pending</span>
          </div>
          <div className="divide-y divide-gray-100">
            {groups[building].map(row => (
              <div key={row.tenant._id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {row.tenant.name}
                    {row.tenant.building && <span className="text-gray-400 font-normal"> · Apt {row.tenant.building}</span>}
                  </p>
                  <p className="text-xs text-gray-400">{row.tenant.email}</p>
                </div>
                <StatusBadge status="pending" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Export helpers ────────────────────────────────────────────────────────────

function buildExportRows(rows, inspectionDate) {
  return rows.map(row => {
    const r = row.response;
    const fe = r?.fireExtinguisher;
    const sd = r?.smokeDetector;
    const sv = r?.stoveSensor;
    const statusLabel = (s) => STATUS_CONFIG[s]?.label || s;
    return {
      'Tenant Name': row.tenant.name,
      'Email': row.tenant.email,
      'Building': row.tenant.unit || '',
      'Apartment': row.tenant.building || '',
      'Overall Status': statusLabel(overallStatus(r)),
      'Submitted At': r?.completedAt ? new Date(r.completedAt).toLocaleDateString('en-GB') : 'Not submitted',
      // Fire ext
      'Fire Ext — Present': fe ? (fe.present ? 'Yes' : 'No') : '—',
      'Fire Ext — Reason': !fe?.present ? (fe?.notPresentReason || '') : '',
      'Fire Ext — Gauge Green': fe?.present ? (fe.gaugeGreen ? 'Yes' : 'No') : '—',
      'Fire Ext — Gauge Reason': fe?.present && !fe?.gaugeGreen ? (fe?.gaugeReason || '') : '',
      'Fire Ext — Pin Intact': fe?.present ? (fe.pinIntact ? 'Yes' : 'No') : '—',
      'Fire Ext — Pin Reason': fe?.present && !fe?.pinIntact ? (fe?.pinReason || '') : '',
      // Smoke det
      'Smoke Det — Present': sd ? (sd.present ? 'Yes' : 'No') : '—',
      'Smoke Det — Reason': !sd?.present ? (sd?.notPresentReason || '') : '',
      'Smoke Det — Beeped': sd?.present ? (sd.beeped ? 'Yes' : 'No') : '—',
      'Smoke Det — Beeped After Battery': sd?.present && sd?.beeped === false ? (sd.beepedAfterBattery ? 'Yes' : 'No') : '—',
      'Smoke Det — Needs Inspection': sd?.present ? (sd.needsInspection ? 'YES' : 'No') : '—',
      // Stove sensor
      'Stove Sensor — Present': sv ? (sv.present ? 'Yes' : 'No') : '—',
      'Stove Sensor — Reason': !sv?.present ? (sv?.notPresentReason || '') : '',
      'Stove Sensor — Beeped': sv?.present ? (sv.beeped ? 'Yes' : 'No') : '—',
      'Stove Sensor — Beeped After Battery': sv?.present && sv?.beeped === false ? (sv.beepedAfterBattery ? 'Yes' : 'No') : '—',
      'Stove Sensor — Needs Inspection': sv?.present ? (sv.needsInspection ? 'YES' : 'No') : '—',
    };
  });
}

function exportExcel(rows, inspectionDate) {
  const data = buildExportRows(rows, inspectionDate);
  const ws = XLSX.utils.json_to_sheet(data);
  // Auto-width columns
  const colWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.max(key.length, ...data.map(r => String(r[key] || '').length)) + 2
  }));
  ws['!cols'] = colWidths;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inspection Results');
  const filename = `inspection-${inspectionDate.replace(/\//g, '-')}.xlsx`;
  XLSX.writeFile(wb, filename);
  toast.success('Excel file downloaded');
}

function exportWord(rows, inspectionDate) {
  const data = buildExportRows(rows, inspectionDate);
  const headers = Object.keys(data[0] || {});

  const tableRows = [
    `<tr>${headers.map(h => `<th style="background:#f3f4f6;padding:6px 10px;font-size:11px;border:1px solid #e5e7eb;white-space:nowrap">${h}</th>`).join('')}</tr>`,
    ...data.map(row => `<tr>${headers.map(h => `<td style="padding:5px 10px;font-size:11px;border:1px solid #e5e7eb">${row[h] ?? ''}</td>`).join('')}</tr>`),
  ].join('');

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"><title>Safety Inspection ${inspectionDate}</title></head>
    <body>
      <h2 style="font-family:Arial;color:#111827">Safety Inspection Report</h2>
      <p style="font-family:Arial;font-size:12px;color:#6b7280">Due date: ${inspectionDate} &nbsp;·&nbsp; Exported: ${new Date().toLocaleDateString('en-GB')}</p>
      <table style="border-collapse:collapse;font-family:Arial;width:100%">${tableRows}</table>
    </body></html>`;

  const blob = new Blob([html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `inspection-${inspectionDate.replace(/\//g, '-')}.doc`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('Word file downloaded');
}

// Export dropdown button
function ExportButton({ rows, inspectionDate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (rows.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
        ⬇ Export
        <span className="text-gray-400 text-xs">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 w-40 py-1">
          <button onClick={() => { exportExcel(rows, inspectionDate); setOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
            <span>📊</span> Excel (.xlsx)
          </button>
          <button onClick={() => { exportWord(rows, inspectionDate); setOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
            <span>📄</span> Word (.doc)
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',   label: 'Overview' },
  { id: 'submitted',  label: 'Passed' },
  { id: 'needs',      label: 'Needs Inspection' },
  { id: 'pending',    label: 'Pending' },
];

export default function AdminInspections() {
  const [inspections, setInspections] = useState([]);
  const [selected, setSelected] = useState(null);
  const [rows, setRows] = useState([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [creating, setCreating] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [closing, setClosing] = useState(false);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    api.get('/inspections').then(r => {
      setInspections(r.data);
      if (r.data.length > 0) setSelected(r.data[0]);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoadingRows(true);
    setExpanded(null);
    api.get(`/inspections/${selected._id}/responses`).then(r => {
      setRows(r.data.tenants);
    }).catch(console.error).finally(() => setLoadingRows(false));
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
      toast.success('Inspection started — all tenants are now blocked until they complete it.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = async () => {
    if (!selected || !confirm("Close this inspection? Tenants who haven't completed it will no longer be blocked.")) return;
    setClosing(true);
    try {
      const res = await api.put(`/inspections/${selected._id}/close`);
      setInspections(prev => prev.map(i => i._id === selected._id ? res.data : i));
      setSelected(res.data);
      toast.success('Inspection closed.');
    } catch {
      toast.error('Failed to close');
    } finally {
      setClosing(false);
    }
  };

  const completed = rows.filter(r => r.response).length;
  const pendingCount = rows.filter(r => !r.response).length;
  const issueCount = rows.filter(r => ['needs', 'issue', 'absent'].includes(overallStatus(r.response))).length;
  const submittedRows = rows.filter(r => overallStatus(r.response) === 'ok');
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const inspectionDateLabel = selected ? new Date(selected.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  const compliantCount = rows.filter(r => overallStatus(r.response) === 'ok').length;
  const tabCounts = {
    overview: rows.length,
    submitted: compliantCount,
    needs: issueCount,
    pending: pendingCount,
  };

  return (
    <Layout>
      <div className="max-w-5xl">
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">🔥 Safety Inspections</h1>
            <p className="text-gray-500 text-sm mt-1">Fire extinguisher · Smoke detector · Stove heat detector</p>
          </div>
          <form onSubmit={handleCreate} className="flex items-center gap-2 flex-wrap">
            <input type="date" value={dueDate} min={minDate.toISOString().split('T')[0]}
              onChange={e => setDueDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
            <button type="submit" disabled={creating || !dueDate}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
              {creating ? 'Starting…' : '+ New Inspection'}
            </button>
          </form>
        </div>

        {/* Inspection selector */}
        {inspections.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-6">
            {inspections.map(ins => (
              <button key={ins._id} onClick={() => setSelected(ins)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${selected?._id === ins._id ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                {new Date(ins.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                {' '}
                <span className={`text-xs ${ins.status === 'active' ? 'text-emerald-400' : 'text-gray-400'}`}>
                  {ins.status === 'active' ? '● Active' : '○ Closed'}
                </span>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <>
            {/* Stats bar */}
            <div className="grid grid-cols-4 gap-3 mb-5">
              {[
                { label: 'Total', value: rows.length, color: 'text-gray-800' },
                { label: 'Passed', value: compliantCount, color: 'text-emerald-600' },
                { label: 'Pending', value: pendingCount, color: 'text-amber-600' },
                { label: 'Needs Inspection', value: issueCount, color: 'text-red-600' },
              ].map(s => (
                <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            {rows.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5">
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>Completion</span>
                  <span>{completed}/{rows.length}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${rows.length ? (completed / rows.length) * 100 : 0}%` }} />
                </div>
                {selected.status === 'active' && (
                  <div className="flex justify-end mt-3">
                    <button onClick={handleClose} disabled={closing}
                      className="text-xs text-red-500 hover:text-red-700 hover:underline disabled:opacity-60">
                      {closing ? 'Closing…' : 'Close inspection'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tab bar + export */}
            <div className="flex items-center justify-between mb-4 gap-3">
              <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
                {TABS.map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${tab === t.id ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    {t.label}
                    {tabCounts[t.id] > 0 && (
                      <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${
                        t.id === 'needs' && tabCounts[t.id] > 0 ? 'bg-red-500 text-white' :
                        t.id === 'pending' && tabCounts[t.id] > 0 ? 'bg-amber-400 text-white' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {tabCounts[t.id]}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <ExportButton rows={rows} inspectionDate={inspectionDateLabel} />
            </div>

            {loadingRows ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="bg-white rounded-xl border border-gray-200 h-14 animate-pulse" />)}</div>
            ) : tab === 'overview' ? (
              <ComplianceTable rows={rows} expanded={expanded} setExpanded={setExpanded} emptyMessage="No tenants yet." />
            ) : tab === 'submitted' ? (
              <ComplianceTable rows={submittedRows} expanded={expanded} setExpanded={setExpanded} emptyMessage="No compliant responses yet." />
            ) : tab === 'needs' ? (
              <NeedsInspectionTab rows={rows} />
            ) : (
              <PendingTab rows={rows} />
            )}
          </>
        )}

        {inspections.length === 0 && (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center">
            <p className="text-4xl mb-3">🔥</p>
            <p className="text-gray-600 font-medium">No inspections yet</p>
            <p className="text-gray-400 text-sm mt-1">Set a due date above to start the first inspection. All active tenants will be required to complete it.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
