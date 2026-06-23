import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const LOCATIONS = ['Bin Room', 'Stairwell', 'Parking Area', 'Entrance / Lobby', 'Outdoor Area', 'Balcony / Common Terrace', 'Other'];
const statusStyles = { open: 'bg-blue-100 text-blue-700', investigating: 'bg-yellow-100 text-yellow-700', resolved: 'bg-emerald-100 text-emerald-700' };

export default function TenantWasteReport() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ location: '', description: '' });
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useState(() => {
    api.get('/waste')
      .then(r => setReports(r.data))
      .catch(console.error)
      .finally(() => setLoadingReports(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.location || !form.description.trim()) return toast.error('Please fill in all required fields');
    setSubmitting(true);
    try {
      let res;
      if (images.length > 0) {
        const data = new FormData();
        data.append('location', form.location);
        data.append('description', form.description);
        data.append('anonymous', form.anonymous);
        images.forEach(f => data.append('images', f));
        res = await api.post('/waste', data);
      } else {
        res = await api.post('/waste', form);
      }
      setReports(prev => [res.data, ...prev]);
      setForm({ location: '', description: '', anonymous: false });
      setImages([]);
      setShowForm(false);
      toast.success('Report submitted successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">♻️ Waste & Environment</h1>
            <p className="text-gray-500 text-sm mt-1">Report improper waste disposal or littering in communal areas</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
            {showForm ? 'Cancel' : '+ Report Problem'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-emerald-200 p-6 mb-6 space-y-4">
            <h2 className="font-semibold text-gray-700">New Waste / Littering Report</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
              <select required value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white">
                <option value="">Select location...</option>
                {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <textarea required rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe what you saw, when it happened, and any other relevant details..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Photos (optional, max 3)</label>
              <input type="file" accept="image/*" multiple onChange={e => setImages(Array.from(e.target.files).slice(0, 3))}
                className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
              {images.length > 0 && <p className="text-xs text-gray-400 mt-1">{images.length} photo(s) selected</p>}
            </div>

<button type="submit" disabled={submitting}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60">
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </form>
        )}

        {/* Past reports */}
        <h2 className="text-sm font-semibold text-gray-600 mb-3">Your Past Reports</h2>
        {loadingReports ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse h-20" />)}
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
            <p className="text-gray-400 text-sm">No reports submitted yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map(r => (
              <div key={r._id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded-full">{r.location}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusStyles[r.status]}`}>
                    {r.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{r.description}</p>
                {r.adminNote && (
                  <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
                    <span className="font-medium">Admin note:</span> {r.adminNote}
                  </div>
                )}
                {r.images?.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {r.images.map((img, i) => (
                      <img key={i} src={img} alt="report" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-2">{new Date(r.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
