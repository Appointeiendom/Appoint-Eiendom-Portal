import { useState, useEffect } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

export default function AdminDocuments() {
  const [docs, setDocs] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', tenantId: '', file: null });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api.get('/documents').then(r => setDocs(r.data)).catch(console.error);
    api.get('/users').then(r => setTenants(r.data)).catch(console.error);
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!form.title || !form.file) return toast.error('Title and file are required');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('file', form.file);
      if (form.tenantId) fd.append('tenantId', form.tenantId);
      const res = await api.post('/documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setDocs(prev => [res.data, ...prev]);
      setForm({ title: '', tenantId: '', file: null });
      setShowForm(false);
      toast.success('Document uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await api.delete(`/documents/${id}`);
      setDocs(prev => prev.filter(d => d._id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const fileIcon = (type) => {
    if (!type) return '📄';
    if (type.includes('pdf')) return '📕';
    if (type.includes('image')) return '🖼️';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('sheet') || type.includes('excel')) return '📊';
    return '📄';
  };

  return (
    <Layout>
      <div className="max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Documents</h1>
            <p className="text-gray-500 text-sm mt-1">Upload lease agreements, house rules, and other files for tenants</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
            {showForm ? 'Cancel' : '+ Upload Document'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleUpload} className="bg-white rounded-xl border border-emerald-200 p-6 mb-6 space-y-4">
            <h2 className="font-semibold text-gray-700">Upload Document</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input type="text" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Lease Agreement 2024"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Visible to</label>
              <select value={form.tenantId} onChange={e => setForm(f => ({ ...f, tenantId: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white">
                <option value="">All tenants</option>
                {tenants.map(t => <option key={t._id} value={t._id}>{t.name} — {t.unit}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">File *</label>
              <input type="file" required onChange={e => setForm(f => ({ ...f, file: e.target.files[0] }))}
                className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
            </div>
            <button type="submit" disabled={uploading}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60">
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </form>
        )}

        {docs.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-400">No documents uploaded yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map(doc => (
              <div key={doc._id} className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4">
                <span className="text-2xl shrink-0">{fileIcon(doc.fileType)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm">{doc.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {doc.tenantId ? `Only: ${doc.tenantId.name}` : 'All tenants'} · {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <a href={doc.fileUrl} target="_blank" rel="noreferrer"
                  className="text-xs text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors shrink-0">
                  View
                </a>
                <button onClick={() => handleDelete(doc._id)}
                  className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1.5 rounded transition-colors shrink-0">
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
