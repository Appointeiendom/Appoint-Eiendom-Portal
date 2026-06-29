import { useState, useEffect } from 'react';
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
  ok:      { label: '✅ OK',               pill: 'bg-emerald-100 text-emerald-700', icon: '✅' },
  absent:  { label: '⚠️ Absent',           pill: 'bg-amber-100 text-amber-700',     icon: '⚠️' },
  issue:   { label: '⚠️ Issue',            pill: 'bg-amber-100 text-amber-700',     icon: '⚠️' },
  needs:   { label: '🔴 Needs Inspection', pill: 'bg-red-100 text-red-700',         icon: '🔴' },
  pending: { label: '— Pending',           pill: 'bg-gray-100 text-gray-500',       icon: '—'  },
};

function StatusBadge({ status }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${c.pill}`}>{c.label}</span>;
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
  const t = row.tenant;
  if (!r) return <p className="text-sm text-gray-400 py-4 text-center">No response submitted yet.</p>;

  const fe = r.fireExtinguisher;
  const sd = r.smokeDetector;
  const sv = r.stoveSensor;

  return (
    <div className="grid md:grid-cols-3 gap-4 py-4 px-2 border-t border-gray-100">
      {/* Fire Extinguisher */}
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

      {/* Smoke Detector */}
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

      {/* Stove Sensor */}
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

function getIssuesList(response) {
  if (!response) return [{ icon: '⏳', text: 'No response submitted yet' }];
  const issues = [];
  const fe = response.fireExtinguisher;
  const sd = response.smokeDetector;
  const sv = response.stoveSensor;
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
  return issues.length ? issues : [];
}

function NeedsAttentionTab({ rows }) {
  const problemRows = rows.filter(r => overallStatus(r.response) !== 'ok');
  if (problemRows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center">
        <p className="text-3xl mb-2">✅</p>
        <p className="text-gray-600 font-medium">All clear — no issues to report</p>
        <p className="text-gray-400 text-sm mt-1">Every tenant who responded has passed all checks.</p>
      </div>
    );
  }

  // Group by building (tenant.unit)
  const groups = {};
  for (const row of problemRows) {
    const key = row.tenant.unit || 'Unknown Building';
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  }

  const sortedBuildings = Object.keys(groups).sort();

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">{problemRows.length} {problemRows.length === 1 ? 'tenant needs' : 'tenants need'} attention across {sortedBuildings.length} building{sortedBuildings.length !== 1 ? 's' : ''}.</p>

      {sortedBuildings.map(building => {
        const buildingRows = groups[building];
        const hasNeedsInspection = buildingRows.some(r => overallStatus(r.response) === 'needs');
        const hasPending = buildingRows.some(r => !r.response);
        return (
          <div key={building} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏢</span>
                <span className="font-semibold text-gray-800">{building}</span>
                {hasNeedsInspection && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Physical visit needed</span>}
                {hasPending && !hasNeedsInspection && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Awaiting responses</span>}
              </div>
              <span className="text-xs text-gray-400">{buildingRows.length} {buildingRows.length === 1 ? 'tenant' : 'tenants'}</span>
            </div>
            <div className="divide-y divide-gray-100">
              {buildingRows.map(row => {
                const issues = getIssuesList(row.response);
                const status = overallStatus(row.response);
                return (
                  <div key={row.tenant._id} className="px-5 py-3.5">
                    <div className="flex items-start justify-between gap-3">
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
                      <StatusBadge status={status} />
                    </div>
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

export default function AdminInspections() {
  const [inspections, setInspections] = useState([]);
  const [selected, setSelected] = useState(null); // inspection object
  const [rows, setRows] = useState([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [creating, setCreating] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [expanded, setExpanded] = useState(null); // tenantId
  const [closing, setClosing] = useState(false);
  const [filter, setFilter] = useState('all'); // all | pending | issues
  const [tab, setTab] = useState('overview'); // overview | attention

  useEffect(() => {
    api.get('/inspections').then(r => {
      setInspections(r.data);
      if (r.data.length > 0) setSelected(r.data[0]);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoadingRows(true);
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
    if (!selected || !confirm('Close this inspection? Tenants who haven\'t completed it will no longer be blocked.')) return;
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
  const pending = rows.filter(r => !r.response).length;
  const issues = rows.filter(r => ['needs', 'issue', 'absent'].includes(overallStatus(r.response))).length;

  const filteredRows = rows.filter(r => {
    if (filter === 'pending') return !r.response;
    if (filter === 'issues') return ['needs', 'issue', 'absent'].includes(overallStatus(r.response));
    return true;
  });

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);

  return (
    <Layout>
      <div className="max-w-5xl">
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">🔥 Safety Inspections</h1>
            <p className="text-gray-500 text-sm mt-1">Fire extinguisher · Smoke detector · Stove heat detector</p>
          </div>

          {/* Create form */}
          <form onSubmit={handleCreate} className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={dueDate}
              min={minDate.toISOString().split('T')[0]}
              onChange={e => setDueDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
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
                { label: 'Total Tenants', value: rows.length, color: 'text-gray-800' },
                { label: 'Completed', value: completed, color: 'text-emerald-600' },
                { label: 'Pending', value: pending, color: 'text-amber-600' },
                { label: 'Has Issues', value: issues, color: 'text-red-600' },
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

            {/* Tab switcher */}
            <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
              <button onClick={() => setTab('overview')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'overview' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                Overview
              </button>
              <button onClick={() => setTab('attention')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${tab === 'attention' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                Needs Attention
                {rows.filter(r => overallStatus(r.response) !== 'ok').length > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
                    {rows.filter(r => overallStatus(r.response) !== 'ok').length}
                  </span>
                )}
              </button>
            </div>

            {loadingRows ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="bg-white rounded-xl border border-gray-200 h-14 animate-pulse" />)}</div>
            ) : tab === 'attention' ? (
              <NeedsAttentionTab rows={rows} />
            ) : (
              <>
                {/* Filter buttons */}
                <div className="flex gap-2 mb-3">
                  {['all', 'pending', 'issues'].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors capitalize ${filter === f ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-200 text-gray-500 hover:border-gray-400'}`}>
                      {f}
                    </button>
                  ))}
                </div>

                {/* Compliance table */}
                {filteredRows.length === 0 ? (
                  <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
                    <p className="text-gray-400">{filter === 'pending' ? 'All tenants have responded.' : filter === 'issues' ? 'No issues found.' : 'No tenants yet.'}</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      <span>Tenant</span>
                      <span className="text-center w-10">🧯</span>
                      <span className="text-center w-10">🔔</span>
                      <span className="text-center w-10">🍳</span>
                      <span>Status</span>
                    </div>

                    {filteredRows.map(row => {
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
                              <p className="text-xs text-gray-400">{row.tenant.unit}{row.tenant.building ? ` · ${row.tenant.building}` : ''}</p>
                            </div>
                            <div className="w-10 text-center"><StatusIcon status={feStatus} /></div>
                            <div className="w-10 text-center"><StatusIcon status={sdStatus} /></div>
                            <div className="w-10 text-center"><StatusIcon status={svStatus} /></div>
                            <div>
                              <StatusBadge status={overall} />
                              {r?.completedAt && <p className="text-xs text-gray-400 mt-0.5">{new Date(r.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="px-4 pb-4">
                              <TenantDetail row={row} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
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
