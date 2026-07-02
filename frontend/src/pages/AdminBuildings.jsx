import { useState, useEffect } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

function ApartmentGrid({ building, onRemove }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mt-3">
      {building.apartments.map(apt => (
        <div key={apt._id}
          className={`relative rounded-xl border p-3 text-center group ${apt.isOccupied ? 'bg-gray-50 border-gray-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <p className={`text-lg font-bold ${apt.isOccupied ? 'text-gray-600' : 'text-emerald-700'}`}>{apt.number}</p>
          {apt.floor && <p className="text-xs text-gray-400">{apt.floor}</p>}
          {apt.type && <p className="text-xs text-gray-400">{apt.type}</p>}
          <p className={`text-xs mt-1 font-medium truncate ${apt.isOccupied ? 'text-gray-500' : 'text-emerald-600'}`}>
            {apt.isOccupied ? apt.occupantName : 'Vacant'}
          </p>
          {!apt.isOccupied && (
            <button
              onClick={() => onRemove(building._id, apt._id)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs hidden group-hover:flex items-center justify-center leading-none"
            >
              ✕
            </button>
          )}
        </div>
      ))}
      {building.apartments.length === 0 && (
        <p className="col-span-full text-sm text-gray-400 py-3">No units yet. Add one below.</p>
      )}
    </div>
  );
}

function AddApartmentForm({ buildingId, onAdded }) {
  const [form, setForm] = useState({ number: '', floor: '', type: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.number.trim()) return;
    setSaving(true);
    try {
      const res = await api.post(`/buildings/${buildingId}/apartments`, form);
      onAdded(res.data);
      setForm({ number: '', floor: '', type: '' });
      toast.success('Unit added');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add unit');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
      <input
        required value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
        placeholder="Unit number *  e.g. 1A"
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 w-36"
      />
      <input
        value={form.floor} onChange={e => setForm(f => ({ ...f, floor: e.target.value }))}
        placeholder="Floor  e.g. 1st"
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 w-32"
      />
      <input
        value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
        placeholder="Type  e.g. 2-bed"
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 w-32"
      />
      <button type="submit" disabled={saving}
        className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
        {saving ? '…' : '+ Add'}
      </button>
    </form>
  );
}

export default function AdminBuildings() {
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newBuilding, setNewBuilding] = useState({ name: '', address: '' });
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [aptData, setAptData] = useState({}); // buildingId → apartments with occupancy
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', address: '' });

  useEffect(() => {
    api.get('/buildings').then(r => setBuildings(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const toggleExpand = async (id) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!aptData[id]) {
      try {
        const res = await api.get(`/buildings/${id}/apartments`);
        setAptData(d => ({ ...d, [id]: res.data }));
      } catch { /* ignore */ }
    }
  };

  const refreshApts = async (buildingId) => {
    const res = await api.get(`/buildings/${buildingId}/apartments`);
    setAptData(d => ({ ...d, [buildingId]: res.data }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newBuilding.name.trim()) return;
    setCreating(true);
    try {
      const res = await api.post('/buildings', newBuilding);
      setBuildings(prev => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewBuilding({ name: '', address: '' });
      setShowForm(false);
      toast.success('Building added');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this building? This cannot be undone.')) return;
    try {
      await api.delete(`/buildings/${id}`);
      setBuildings(prev => prev.filter(b => b._id !== id));
      toast.success('Building deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleRemoveApt = async (buildingId, aptId) => {
    if (!confirm('Remove this unit?')) return;
    try {
      const res = await api.delete(`/buildings/${buildingId}/apartments/${aptId}`);
      setBuildings(prev => prev.map(b => b._id === buildingId ? res.data : b));
      await refreshApts(buildingId);
      toast.success('Unit removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove');
    }
  };

  const handleSaveEdit = async (id) => {
    try {
      const res = await api.put(`/buildings/${id}`, editForm);
      setBuildings(prev => prev.map(b => b._id === id ? { ...b, name: res.data.name, address: res.data.address } : b));
      setEditId(null);
      toast.success('Saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    }
  };

  const occupiedCount = (id) => (aptData[id] || []).filter(a => a.isOccupied).length;
  const vacantCount = (id) => (aptData[id] || []).filter(a => !a.isOccupied).length;

  return (
    <Layout>
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">🏢 Properties</h1>
            <p className="text-gray-500 text-sm mt-1">Manage buildings and units before registering tenants</p>
          </div>
          <button onClick={() => setShowForm(s => !s)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
            {showForm ? 'Cancel' : '+ Add Building'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-white border border-emerald-200 rounded-xl p-5 mb-5 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Building Name / Address *</label>
              <input required value={newBuilding.name} onChange={e => setNewBuilding(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Storgata 12"
                className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 w-56" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Additional info</label>
              <input value={newBuilding.address} onChange={e => setNewBuilding(f => ({ ...f, address: e.target.value }))}
                placeholder="e.g. 3rd floor entrance"
                className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 w-56" />
            </div>
            <button type="submit" disabled={creating}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60">
              {creating ? 'Adding…' : 'Add Building'}
            </button>
          </form>
        )}

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="bg-white rounded-xl border border-gray-200 h-16 animate-pulse" />)}</div>
        ) : buildings.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center">
            <p className="text-4xl mb-3">🏢</p>
            <p className="text-gray-600 font-medium">No buildings yet</p>
            <p className="text-gray-400 text-sm mt-1">Add your first building above before registering tenants.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {buildings.map(b => {
              const apts = aptData[b._id];
              const isOpen = expanded === b._id;
              const isEditing = editId === b._id;
              return (
                <div key={b._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* Building header */}
                  <div className="flex items-center gap-3 px-5 py-4">
                    <button onClick={() => toggleExpand(b._id)} className="flex-1 flex items-center gap-3 text-left">
                      <span className="text-2xl">🏢</span>
                      <div>
                        {isEditing ? (
                          <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                            <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                              className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 w-40" />
                            <input value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
                              placeholder="Additional info"
                              className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 w-40" />
                            <button onClick={() => handleSaveEdit(b._id)} className="text-xs bg-emerald-500 text-white px-3 py-1 rounded-lg">Save</button>
                            <button onClick={() => setEditId(null)} className="text-xs text-gray-500 px-2 py-1 rounded-lg hover:bg-gray-100">Cancel</button>
                          </div>
                        ) : (
                          <>
                            <p className="font-semibold text-gray-800">{b.name}</p>
                            {b.address && <p className="text-xs text-gray-400">{b.address}</p>}
                          </>
                        )}
                      </div>
                    </button>

                    <div className="flex items-center gap-3 shrink-0">
                      {apts ? (
                        <div className="flex gap-2 text-xs">
                          <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{vacantCount(b._id)} vacant</span>
                          <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{occupiedCount(b._id)} occupied</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">{b.apartments.length} units</span>
                      )}
                      {!isEditing && (
                        <button onClick={() => { setEditId(b._id); setEditForm({ name: b.name, address: b.address || '' }); }}
                          className="text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-2 py-1 rounded transition-colors">
                          Edit
                        </button>
                      )}
                      <button onClick={() => handleDelete(b._id)}
                        className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors">
                        Delete
                      </button>
                      <span className="text-gray-400 text-sm">{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {/* Expanded apartment list */}
                  {isOpen && (
                    <div className="px-5 pb-5 border-t border-gray-100">
                      <ApartmentGrid
                        building={{ ...b, apartments: apts || [] }}
                        onRemove={handleRemoveApt}
                      />
                      <AddApartmentForm
                        buildingId={b._id}
                        onAdded={(updated) => {
                          setBuildings(prev => prev.map(bld => bld._id === b._id ? updated : bld));
                          refreshApts(b._id);
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
