import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import api from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

// ── Status helpers ────────────────────────────────────────────────────────────

function fireExtStatus(fe) {
  if (!fe) return { pass: null, reason: null };
  if (!fe.present) return { pass: false, reason: fe.notPresentReason || 'Not present' };
  if (fe.gaugeGreen === false) return { pass: false, reason: fe.gaugeReason ? `Gauge — ${fe.gaugeReason}` : 'Gauge not green' };
  if (fe.pinIntact === false) return { pass: false, reason: fe.pinReason ? `Pin — ${fe.pinReason}` : 'Pin not intact' };
  return { pass: true, reason: null };
}

function detectorStatus(d) {
  if (!d) return { pass: null, reason: null };
  if (!d.present) return { pass: false, reason: d.notPresentReason || 'Not present' };
  if (d.needsInspection) return { pass: false, reason: 'Did not beep — needs physical inspection' };
  return { pass: true, reason: null };
}

function getItemStatuses(r) {
  if (!r) return null;
  return {
    fe: fireExtStatus(r.fireExtinguisher),
    sd: detectorStatus(r.smokeDetector),
    sv: detectorStatus(r.stoveSensor),
  };
}

function overallCategory(r) {
  if (!r) return 'pending';
  const s = getItemStatuses(r);
  if (s.fe.pass === false || s.sd.pass === false || s.sv.pass === false) return 'issues';
  if (s.fe.pass === true && s.sd.pass === true && s.sv.pass === true) return 'passed';
  return 'pending';
}

// ── Item pill — shows pass/fail/pending for one item ─────────────────────────

function ItemPill({ label, status }) {
  if (status.pass === null) {
    return (
      <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
        {label} <span>—</span>
      </span>
    );
  }
  if (status.pass) {
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg font-medium">
        {label} ✅
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-red-700 bg-red-50 px-2 py-1 rounded-lg font-medium">
      {label} ❌
    </span>
  );
}

// Three pills in a row for one tenant
function ItemRow({ statuses }) {
  if (!statuses) return null;
  return (
    <div className="flex gap-1.5 mt-1.5 flex-wrap">
      <ItemPill label="🧯 Fire Ext" status={statuses.fe} />
      <ItemPill label="🔔 Smoke Det" status={statuses.sd} />
      <ItemPill label="🍳 Stove" status={statuses.sv} />
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

function exportExcel(rows, label) {
  const data = rows.map(row => {
    const r = row.response;
    const s = getItemStatuses(r);
    return {
      'Tenant': row.tenant.name,
      'Email': row.tenant.email,
      'Building': row.tenant.unit || '',
      'Unit': row.tenant.building || '',
      'Overall': overallCategory(r) === 'passed' ? 'Passed' : overallCategory(r) === 'issues' ? 'Has Issues' : 'Pending',
      'Submitted': r?.completedAt ? new Date(r.completedAt).toLocaleDateString('en-GB') : '—',
      '🧯 Fire Ext': s ? (s.fe.pass === true ? 'Pass' : s.fe.pass === false ? `Fail — ${s.fe.reason}` : '—') : '—',
      '🔔 Smoke Det': s ? (s.sd.pass === true ? 'Pass' : s.sd.pass === false ? `Fail — ${s.sd.reason}` : '—') : '—',
      '🍳 Stove Sensor': s ? (s.sv.pass === true ? 'Pass' : s.sv.pass === false ? `Fail — ${s.sv.reason}` : '—') : '—',
    };
  });
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = Object.keys(data[0] || {}).map(k => ({ wch: Math.max(k.length, ...data.map(r => String(r[k] || '').length)) + 2 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Results');
  XLSX.writeFile(wb, `inspection-${label.replace(/[\s/]/g, '-')}.xlsx`);
  toast.success('Excel downloaded');
}

function exportWord(rows, label) {
  const tableRows = [
    `<tr>${['Tenant','Building','Unit','Fire Ext','Smoke Det','Stove','Overall'].map(h => `<th style="background:#f3f4f6;padding:6px 10px;font-size:11px;border:1px solid #e5e7eb">${h}</th>`).join('')}</tr>`,
    ...rows.map(row => {
      const s = getItemStatuses(row.response);
      const cell = (st) => st ? (st.pass === true ? '✅ Pass' : st.pass === false ? `❌ ${st.reason}` : '—') : '—';
      return `<tr>
        <td style="padding:5px 10px;font-size:11px;border:1px solid #e5e7eb">${row.tenant.name}</td>
        <td style="padding:5px 10px;font-size:11px;border:1px solid #e5e7eb">${row.tenant.unit || ''}</td>
        <td style="padding:5px 10px;font-size:11px;border:1px solid #e5e7eb">${row.tenant.building || ''}</td>
        <td style="padding:5px 10px;font-size:11px;border:1px solid #e5e7eb">${s ? cell(s.fe) : '—'}</td>
        <td style="padding:5px 10px;font-size:11px;border:1px solid #e5e7eb">${s ? cell(s.sd) : '—'}</td>
        <td style="padding:5px 10px;font-size:11px;border:1px solid #e5e7eb">${s ? cell(s.sv) : '—'}</td>
        <td style="padding:5px 10px;font-size:11px;border:1px solid #e5e7eb">${overallCategory(row.response) === 'passed' ? '✅ Passed' : overallCategory(row.response) === 'issues' ? '❌ Issues' : '⏳ Pending'}</td>
      </tr>`;
    }),
  ].join('');
  const html = `<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head><body>
    <h2 style="font-family:Arial">Safety Inspection — ${label}</h2>
    <table style="border-collapse:collapse;font-family:Arial;width:100%">${tableRows}</table>
  </body></html>`;
  const blob = new Blob([html], { type: 'application/msword' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `inspection-${label.replace(/[\s/]/g, '-')}.doc` });
  a.click(); URL.revokeObjectURL(a.href);
  toast.success('Word downloaded');
}

// ── Request Redo Modal ────────────────────────────────────────────────────────

function RequestRedoModal({ tenant, inspectionId, onDone, onClose }) {
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);

  const handle = async () => {
    setSending(true);
    try {
      await api.post(`/inspections/${inspectionId}/responses/${tenant._id}/redo`, { reason });
      toast.success(`Redo requested — ${tenant.name} has been notified by email`);
      onDone(tenant._id);
    } catch { toast.error('Failed to send redo request'); } finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-1">↺ Request Redo</h2>
        <p className="text-sm text-gray-500 mb-4">
          This will reset <strong>{tenant.name}</strong>'s response and send them an email asking them to redo the inspection.
        </p>
        <label className="block text-sm font-medium text-gray-700 mb-1">Reason <span className="text-gray-400 font-normal">(optional — shown to tenant)</span></label>
        <textarea
          rows={3}
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="e.g. Photo was too blurry, could not see the gauge clearly."
          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none mb-4"
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 py-2.5 rounded-xl text-sm transition-colors">
            Cancel
          </button>
          <button onClick={handle} disabled={sending}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60">
            {sending ? 'Sending…' : '↺ Send Redo Request'}
          </button>
        </div>
      </div>
    </div>
  );
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
        className="flex items-center gap-1 border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-sm transition-colors">
        ⬇ Export ▾
      </button>
      {open && (
        <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 w-40 py-1">
          <button onClick={() => { exportExcel(rows, label); setOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">📊 Excel (.xlsx)</button>
          <button onClick={() => { exportWord(rows, label); setOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">📄 Word (.doc)</button>
        </div>
      )}
    </div>
  );
}

// ── Overview table ────────────────────────────────────────────────────────────

function OverviewTab({ rows, onDeleteResponse, onRequestRedo }) {
  const [expandedTenant, setExpandedTenant] = useState(null);

  if (!rows.length) return <Empty text="No tenants yet." />;

  // Sort: by address → unit (A-1, A-2, B-1…) → vacant last
  const sorted = [...rows].sort((a, b) => {
    if (a.tenant?.isVacant && !b.tenant?.isVacant) return 1;
    if (!a.tenant?.isVacant && b.tenant?.isVacant) return -1;
    const addrCmp = (a.tenant?.unit || '').localeCompare(b.tenant?.unit || '');
    if (addrCmp !== 0) return addrCmp;
    return (a.tenant?.building || '').localeCompare(b.tenant?.building || '', undefined, { sensitivity: 'base' });
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            <th className="text-left px-4 py-3">Address</th>
            <th className="text-left px-4 py-3">Unit</th>
            <th className="text-left px-4 py-3">Name</th>
            <th className="text-center px-4 py-3">🧯 Fire</th>
            <th className="text-center px-4 py-3">🔔 Smoke</th>
            <th className="text-center px-4 py-3">🍳 Stove</th>
            <th className="px-2 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.map(row => {
            const s = getItemStatuses(row.response);
            const isVacant = row.tenant.isVacant;
            const tenantOpen = expandedTenant === row.tenant._id;

            return (
              <>
                <tr
                  key={row.tenant._id}
                  className={`cursor-pointer transition-colors ${isVacant ? 'bg-gray-50/60' : 'hover:bg-gray-50'}`}
                  onClick={() => !isVacant && setExpandedTenant(tenantOpen ? null : row.tenant._id)}
                >
                  <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{row.tenant.unit || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-700 font-medium whitespace-nowrap">{row.tenant.building || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={isVacant ? 'text-gray-400 italic' : 'text-gray-800'}>
                      {isVacant ? '— Vacant —' : row.tenant.name}
                    </span>
                    {row.response?.completedAt && (
                      <span className="ml-2 text-xs text-gray-400">
                        {new Date(row.response.completedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center"><OverviewCell status={s?.fe} /></td>
                  <td className="px-4 py-2.5 text-center"><OverviewCell status={s?.sd} /></td>
                  <td className="px-4 py-2.5 text-center"><OverviewCell status={s?.sv} /></td>
                  <td className="px-2 py-2.5">
                    {row.response && !isVacant && (
                      <div className="flex items-center gap-1">
                        {onRequestRedo && (
                          <button onClick={e => { e.stopPropagation(); onRequestRedo(row.tenant); }}
                            className="text-xs text-amber-500 hover:text-amber-700 border border-amber-200 hover:border-amber-400 px-1.5 py-1 rounded-lg transition-colors" title="Request redo">↺</button>
                        )}
                        {onDeleteResponse && (
                          <button onClick={e => { e.stopPropagation(); onDeleteResponse(row.tenant._id); }}
                            className="text-gray-300 hover:text-red-400 text-sm px-1" title="Reset">🗑</button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
                {tenantOpen && row.response && (
                  <tr key={`${row.tenant._id}-detail`}>
                    <td colSpan={7} className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                      <FullDetail response={row.response} />
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function OverviewCell({ status }) {
  if (!status || status.pass === null) return <div className="text-center text-gray-400 text-xs">—</div>;
  if (status.pass) return <div className="text-center text-sm">✅</div>;
  return (
    <div className="text-center">
      <div className="text-sm">❌</div>
      {status.reason && <p className="text-xs text-red-500 leading-tight mt-0.5">{status.reason}</p>}
    </div>
  );
}

// ── Needs Inspection tab ──────────────────────────────────────────────────────

function NeedsInspectionTab({ rows, onDeleteResponse, onRequestRedo }) {
  const problemRows = rows.filter(r => overallCategory(r.response) === 'issues');
  if (!problemRows.length) return (
    <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center">
      <p className="text-3xl mb-2">✅</p>
      <p className="text-gray-600 font-medium">No issues — all submitted responses passed</p>
    </div>
  );

  const groups = problemRows.reduce((acc, row) => {
    const key = row.tenant.unit || 'Unknown Building';
    (acc[key] = acc[key] || []).push(row);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        {problemRows.length} {problemRows.length === 1 ? 'tenant has' : 'tenants have'} one or more items that failed.
      </p>
      {Object.keys(groups).sort().map(building => (
        <div key={building} className="bg-white rounded-xl border border-red-100 overflow-hidden">
          <div className="px-5 py-3 bg-red-50 border-b border-red-100 flex items-center gap-2">
            <span>🏢</span>
            <span className="font-semibold text-gray-800">{building}</span>
            <span className="text-xs text-red-400 ml-auto">{groups[building].length} {groups[building].length === 1 ? 'tenant' : 'tenants'}</span>
          </div>
          <div className="divide-y divide-gray-100">
            {groups[building].map(row => {
              const s = getItemStatuses(row.response);
              return (
                <div key={row.tenant._id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">
                        {row.tenant.name}
                        {row.tenant.building && <span className="text-gray-400 font-normal ml-1.5">Unit {row.tenant.building}</span>}
                      </p>
                      {/* All 3 items shown clearly — pass or fail with reason */}
                      <div className="mt-2.5 space-y-1.5">
                        <IssueItemRow label="🧯 Fire Extinguisher" status={s.fe} />
                        <IssueItemRow label="🔔 Smoke Detector" status={s.sd} />
                        <IssueItemRow label="🍳 Stove Heat Sensor" status={s.sv} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      {onRequestRedo && (
                        <button onClick={() => onRequestRedo(row.tenant)}
                          className="text-xs text-amber-500 hover:text-amber-700 border border-amber-200 hover:border-amber-400 px-2 py-0.5 rounded-lg transition-colors">↺ Redo</button>
                      )}
                      {onDeleteResponse && (
                        <button onClick={() => onDeleteResponse(row.tenant._id)}
                          className="text-gray-300 hover:text-red-400 text-xs" title="Reset silently">🗑</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function IssueItemRow({ label, status }) {
  if (status.pass === null || status.pass === true) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-red-500 mt-0.5">❌</span>
      <div>
        <span className="text-gray-800 font-medium">{label}</span>
        {status.reason && <p className="text-xs text-red-500 mt-0.5">{status.reason}</p>}
      </div>
    </div>
  );
}

// ── Passed tab ────────────────────────────────────────────────────────────────

function PassedTab({ rows, onDeleteResponse, onRequestRedo }) {
  // Show any tenant who has at least one passing item
  const passedRows = rows.filter(r => {
    const s = getItemStatuses(r.response);
    return s && (s.fe.pass === true || s.sd.pass === true || s.sv.pass === true);
  });
  if (!passedRows.length) return <Empty text="No passed responses yet." />;

  const ITEMS = [
    { key: 'fe', label: '🧯 Fire Ext' },
    { key: 'sd', label: '🔔 Smoke Det' },
    { key: 'sv', label: '🍳 Stove' },
  ];

  return (
    <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden">
      <div className="divide-y divide-gray-100">
        {passedRows.map(row => {
          const s = getItemStatuses(row.response);
          return (
          <div key={row.tenant._id} className="px-5 py-3.5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">{row.tenant.name}</p>
              <p className="text-xs text-gray-400">{row.tenant.unit}{row.tenant.building ? ` · Unit ${row.tenant.building}` : ''}</p>
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {ITEMS.filter(i => s[i.key].pass === true).map(i => (
                  <span key={i.key} className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">{i.label} ✅</span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {row.response?.completedAt && (
                <span className="text-xs text-gray-400">
                  {new Date(row.response.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
              )}
              {onRequestRedo && (
                <button onClick={() => onRequestRedo(row.tenant)}
                  className="text-xs text-amber-500 hover:text-amber-700 border border-amber-200 hover:border-amber-400 px-2 py-0.5 rounded-lg transition-colors">↺ Redo</button>
              )}
              {onDeleteResponse && (
                <button onClick={() => onDeleteResponse(row.tenant._id)}
                  className="text-gray-300 hover:text-red-400 text-xs" title="Reset silently">🗑</button>
              )}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Pending tab ───────────────────────────────────────────────────────────────

function PendingTab({ rows, inspectionId, onRemind }) {
  const [sending, setSending] = useState(false);
  const pendingRows = rows.filter(r => overallCategory(r.response) === 'pending');
  if (!pendingRows.length) return (
    <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center">
      <p className="text-3xl mb-2">🎉</p>
      <p className="text-gray-600 font-medium">All tenants have responded</p>
    </div>
  );

  const handleRemindAll = async () => {
    if (!confirm(`Send reminder emails to all ${pendingRows.length} pending tenants?`)) return;
    setSending(true);
    try {
      const res = await api.post(`/inspections/${inspectionId}/remind`);
      toast.success(`Reminder sent to ${res.data.sent} tenant${res.data.sent !== 1 ? 's' : ''}`);
      if (onRemind) onRemind();
    } catch { toast.error('Failed to send reminders'); } finally { setSending(false); }
  };

  const handleRemindOne = async (tenantId, name) => {
    setSending(true);
    try {
      const res = await api.post(`/inspections/${inspectionId}/remind`, { tenantIds: [tenantId] });
      toast.success(res.data.sent ? `Reminder sent to ${name}` : 'Already responded');
    } catch { toast.error('Failed'); } finally { setSending(false); }
  };

  const groups = pendingRows.reduce((acc, row) => {
    const key = row.tenant.unit || 'Unknown Building';
    (acc[key] = acc[key] || []).push(row);
    return acc;
  }, {});
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{pendingRows.length} {pendingRows.length === 1 ? 'tenant has' : 'tenants have'} not responded yet.</p>
        <button onClick={handleRemindAll} disabled={sending}
          className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60">
          {sending ? '…' : '📧 Remind All'}
        </button>
      </div>
      {Object.keys(groups).sort().map(building => (
        <div key={building} className="bg-white rounded-xl border border-amber-100 overflow-hidden">
          <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
            <span>🏢</span>
            <span className="font-semibold text-gray-800">{building}</span>
            <span className="text-xs text-amber-500 ml-auto">{groups[building].length} pending</span>
          </div>
          <div className="divide-y divide-gray-100">
            {groups[building].map(row => (
              <div key={row.tenant._id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-700">{row.tenant.name}</p>
                  <p className="text-xs text-gray-400">{row.tenant.email}</p>
                </div>
                <button onClick={() => handleRemindOne(row.tenant._id, row.tenant.name)} disabled={sending}
                  className="text-xs text-amber-600 hover:text-amber-800 border border-amber-200 hover:border-amber-400 px-3 py-1 rounded-lg transition-colors disabled:opacity-50">
                  📧 Remind
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Full detail (expandable in overview) ─────────────────────────────────────

function FullDetail({ response }) {
  const fe = response.fireExtinguisher;
  const sd = response.smokeDetector;
  const sv = response.stoveSensor;
  return (
    <div className="grid md:grid-cols-3 gap-4 pt-3">
      {[
        { label: '🧯 Fire Extinguisher', data: fe, type: 'fe' },
        { label: '🔔 Smoke Detector', data: sd, type: 'det' },
        { label: '🍳 Stove Heat Sensor', data: sv, type: 'det' },
      ].map(({ label, data, type }) => (
        <div key={label} className="bg-gray-50 rounded-lg p-3 space-y-1">
          <p className="text-xs font-semibold text-gray-700 mb-2">{label}</p>
          {!data ? <p className="text-xs text-gray-400">No data</p> : (
            <>
              <DetailLine label="Present" val={data.present} reason={!data.present ? data.notPresentReason : null} />
              {type === 'fe' && data.present && <>
                <DetailLine label="Gauge green" val={data.gaugeGreen} reason={!data.gaugeGreen ? data.gaugeReason : null} />
                <DetailLine label="Pin intact" val={data.pinIntact} reason={!data.pinIntact ? data.pinReason : null} />
              </>}
              {type === 'det' && data.present && <>
                <DetailLine label="Beeped" val={data.beeped} />
                {data.beeped === false && <DetailLine label="After battery" val={data.beepedAfterBattery} />}
              </>}
              {data.photo && (
                <img src={data.photo} alt="" onClick={() => window.open(data.photo)}
                  className="mt-2 h-20 w-full object-cover rounded cursor-pointer hover:opacity-90" />
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function DetailLine({ label, val, reason }) {
  return (
    <div className="flex items-start justify-between text-xs gap-2">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className={`text-right ${val ? 'text-emerald-600' : 'text-red-500'}`}>
        {val ? '✅ Yes' : '❌ No'}{reason ? ` — ${reason}` : ''}
      </span>
    </div>
  );
}

// ── Shared ────────────────────────────────────────────────────────────────────

function OverallBadge({ cat }) {
  if (cat === 'passed') return <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full whitespace-nowrap">✅ Passed</span>;
  if (cat === 'issues') return <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full whitespace-nowrap">❌ Issues</span>;
  return <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap">⏳ Pending</span>;
}

function Empty({ text }) {
  return (
    <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
      <p className="text-gray-400">{text}</p>
    </div>
  );
}

// ── Archive tab ───────────────────────────────────────────────────────────────

function ArchiveTab({ inspections, onDelete }) {
  const [expandedId, setExpandedId] = useState(null);
  const [archiveData, setArchiveData] = useState({});
  const [loading, setLoading] = useState({});

  const closed = inspections.filter(i => i.status === 'closed');
  if (!closed.length) return <Empty text="No archived inspections yet." />;

  const toggle = async (ins) => {
    if (expandedId === ins._id) { setExpandedId(null); return; }
    setExpandedId(ins._id);
    if (archiveData[ins._id]) return;
    setLoading(l => ({ ...l, [ins._id]: true }));
    try {
      const res = await api.get(`/inspections/${ins._id}/archive`);
      setArchiveData(d => ({ ...d, [ins._id]: res.data.rows }));
    } catch { toast.error('Failed to load archive'); }
    finally { setLoading(l => ({ ...l, [ins._id]: false })); }
  };

  return (
    <div className="space-y-3">
      {closed.map(ins => {
        const isOpen = expandedId === ins._id;
        const rows = archiveData[ins._id] || [];
        const passed = rows.filter(r => overallCategory(r.response) === 'passed').length;
        const issues = rows.filter(r => overallCategory(r.response) === 'issues').length;
        const pending = rows.filter(r => overallCategory(r.response) === 'pending').length;
        const dueLabel = new Date(ins.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const createdLabel = new Date(ins.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

        return (
          <div key={ins._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5">
              <button className="flex items-center gap-3 flex-1 text-left" onClick={() => toggle(ins)}>
                <span className="text-lg">📋</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Due: {dueLabel}</p>
                  <p className="text-xs text-gray-400">Created {createdLabel}</p>
                </div>
                <div className="flex items-center gap-2 ml-4 flex-wrap">
                  {passed > 0 && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{passed} passed</span>}
                  {issues > 0 && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{issues} issues</span>}
                  {pending > 0 && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{pending} pending</span>}
                </div>
                <span className="text-gray-400 text-sm ml-auto mr-3">{isOpen ? '▾' : '▸'}</span>
              </button>
              <button onClick={() => onDelete(ins)}
                className="text-gray-300 hover:text-red-400 text-sm p-1.5 transition-colors" title="Delete inspection">🗑</button>
            </div>

            {isOpen && (
              <div className="border-t border-gray-100">
                {loading[ins._id] ? (
                  <div className="p-6 text-center text-gray-400 text-sm">Loading…</div>
                ) : rows.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-sm">No responses recorded.</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    <div className="grid grid-cols-[1fr_auto_120px] gap-2 px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      <span>Tenant</span>
                      <span>Result</span>
                      <span>Completed at</span>
                    </div>
                    {rows.sort((a, b) => {
                      const ua = (a.tenant?.unit || '').localeCompare(b.tenant?.unit || '');
                      if (ua !== 0) return ua;
                      return (a.tenant?.building || '').localeCompare(b.tenant?.building || '', undefined, { numeric: true });
                    }).map(row => {
                      const cat = overallCategory(row.response);
                      const completedAt = row.response?.completedAt
                        ? new Date(row.response.completedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : '—';
                      return (
                        <div key={row.tenant._id} className="grid grid-cols-[1fr_auto_120px] gap-2 items-center px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-800">{row.tenant.name}</p>
                            <p className="text-xs text-gray-400">{row.tenant.unit}{row.tenant.building ? ` · Unit ${row.tenant.building}` : ''}</p>
                          </div>
                          <OverallBadge cat={cat} />
                          <p className="text-xs text-gray-500">{completedAt}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const TABS = ['Overview', 'Needs Inspection', 'Passed', 'Pending', 'Archive'];

export default function AdminInspections() {
  const [inspections, setInspections] = useState([]);
  const [selected, setSelected] = useState(null);
  const [rows, setRows] = useState([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [creating, setCreating] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [closing, setClosing] = useState(false);
  const [tab, setTab] = useState('Overview');
  const [seenCounts, setSeenCounts] = useState({});
  const [redoTarget, setRedoTarget] = useState(null); // { _id, name } of tenant

  useEffect(() => {
    api.get('/inspections').then(r => {
      setInspections(r.data);
      if (r.data.length > 0) setSelected(r.data[0]);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoadingRows(true);
    setSeenCounts({});
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
      toast.success('Inspection started — tenants are now blocked until they respond.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setCreating(false); }
  };

  const handleClose = async () => {
    if (!selected || !confirm("Close this inspection?")) return;
    setClosing(true);
    try {
      const res = await api.put(`/inspections/${selected._id}/close`);
      setInspections(prev => prev.map(i => i._id === selected._id ? res.data : i));
      setSelected(res.data);
      toast.success('Closed');
    } catch { toast.error('Failed'); } finally { setClosing(false); }
  };

  const handleDeleteInspection = async (ins) => {
    if (!confirm('Delete this inspection and all its responses?')) return;
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

  const passed = rows.filter(r => overallCategory(r.response) === 'passed').length;
  const issues = rows.filter(r => overallCategory(r.response) === 'issues').length;
  const pending = rows.filter(r => overallCategory(r.response) === 'pending').length;

  const tabCounts = { 'Overview': rows.length, 'Needs Inspection': issues, 'Passed': passed, 'Pending': pending };
  const tabColors = { 'Needs Inspection': 'bg-red-500 text-white', 'Pending': 'bg-amber-400 text-white' };

  // Badge shows only if count is higher than when the tab was last visited
  const showBadge = (t) => tab !== t && tabCounts[t] > 0 && tabCounts[t] > (seenCounts[t] ?? 0);

  const switchTab = (t) => {
    setTab(t);
    setSeenCounts(prev => ({ ...prev, [t]: tabCounts[t] }));
  };

  const minDate = new Date(); minDate.setDate(minDate.getDate() + 1);
  const inspLabel = selected ? new Date(selected.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  return (
    <Layout>
      <div className="max-w-5xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">🔥 Safety Inspections</h1>
            <p className="text-gray-500 text-sm mt-1">Fire extinguisher · Smoke detector · Stove heat sensor</p>
          </div>
          <form onSubmit={handleCreate} className="flex items-center gap-2">
            <input type="date" value={dueDate} min={minDate.toISOString().split('T')[0]}
              onChange={e => setDueDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
            <button type="submit" disabled={creating || !dueDate}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
              {creating ? '…' : '+ New Inspection'}
            </button>
          </form>
        </div>

        {/* Inspection selector */}
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
                  className={`pr-2.5 hover:text-red-400 text-sm transition-colors ${selected?._id === ins._id ? 'text-gray-500' : 'text-gray-300'}`}>🗑</button>
              </div>
            ))}
          </div>
        )}

        {selected && (
          <>
            {/* Stats + progress */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
              <div className="grid grid-cols-4 gap-4 mb-4">
                {[
                  { label: 'Total', val: rows.length, color: 'text-gray-800' },
                  { label: '✅ Passed', val: passed, color: 'text-emerald-600' },
                  { label: '❌ Issues', val: issues, color: 'text-red-600' },
                  { label: '⏳ Pending', val: pending, color: 'text-amber-500' },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <p className={`text-3xl font-bold ${s.color}`}>{s.val}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${rows.length ? (passed / rows.length) * 100 : 0}%` }} />
                <div className="h-full bg-red-400 transition-all" style={{ width: `${rows.length ? (issues / rows.length) * 100 : 0}%` }} />
                <div className="h-full bg-amber-300 transition-all" style={{ width: `${rows.length ? (pending / rows.length) * 100 : 0}%` }} />
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block"/>Passed</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-400 inline-block"/>Issues</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-300 inline-block"/>Pending</span>
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
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-5">
              {TABS.map(t => (
                <button key={t} onClick={() => switchTab(t)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${tab === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {t}
                  {showBadge(t) && (
                    <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${tabColors[t] || 'bg-gray-200 text-gray-500'}`}>
                      {tabCounts[t]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {loadingRows ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-xl border border-gray-200 animate-pulse" />)}</div>
            ) : tab === 'Overview' ? (
              <OverviewTab rows={rows} onDeleteResponse={handleDeleteResponse} onRequestRedo={setRedoTarget} />
            ) : tab === 'Needs Inspection' ? (
              <NeedsInspectionTab rows={rows} onDeleteResponse={handleDeleteResponse} onRequestRedo={setRedoTarget} />
            ) : tab === 'Passed' ? (
              <PassedTab rows={rows} onDeleteResponse={handleDeleteResponse} onRequestRedo={setRedoTarget} />
            ) : tab === 'Archive' ? (
              <ArchiveTab inspections={inspections} onDelete={handleDeleteInspection} />
            ) : (
              <PendingTab rows={rows} inspectionId={selected._id} />
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

      {redoTarget && (
        <RequestRedoModal
          tenant={redoTarget}
          inspectionId={selected._id}
          onClose={() => setRedoTarget(null)}
          onDone={(tenantId) => {
            setRows(prev => prev.map(r => r.tenant._id === tenantId ? { ...r, response: null } : r));
            setRedoTarget(null);
          }}
        />
      )}
    </Layout>
  );
}
