import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';

const CATEGORIES = ['Electrical', 'Plumbing', 'HVAC', 'General', 'Appliances'];

export default function ReportIssue() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', category: '' });
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = t('issues.titleRequired');
    if (!form.description.trim()) e.description = t('issues.descriptionRequired');
    if (!form.category) e.category = t('issues.categoryRequired');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => data.append(k, v));
      images.forEach((file) => data.append('images', file));
      await api.post('/issues', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(t('issues.reportSuccess'));
      navigate('/tenant/issues');
    } catch (err) {
      toast.error(err.response?.data?.message || t('issues.reportFailed'));
    } finally {
      setLoading(false);
    }
  };

  const update = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    if (errors[field]) setErrors({ ...errors, [field]: '' });
  };

  return (
    <Layout>
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">{t('issues.reportIssue')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('issues.unit')}: {user?.unit}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('issues.title')} *</label>
            <input type="text" value={form.title} onChange={update('title')}
              placeholder={t('issues.titlePlaceholder')}
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 ${errors.title ? 'border-red-400' : 'border-gray-300'}`} />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('issues.description')} *</label>
            <textarea rows={4} value={form.description} onChange={update('description')}
              placeholder={t('issues.descriptionPlaceholder')}
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none ${errors.description ? 'border-red-400' : 'border-gray-300'}`} />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('issues.category')} *</label>
            <select value={form.category} onChange={update('category')}
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white ${errors.category ? 'border-red-400' : 'border-gray-300'}`}>
              <option value="">{t('issues.selectCategory')}</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{t(`categories.${c}`)}</option>)}
            </select>
            {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('issues.photosOptional')}</label>
            <input type="file" accept="image/*" multiple onChange={(e) => setImages(Array.from(e.target.files))}
              className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
            {images.length > 0 && <p className="text-xs text-gray-500 mt-1">{t('issues.filesSelected')(images.length)}</p>}
          </div>

          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-500">
            <span className="font-medium text-gray-700">{t('issues.autoFilled')}:</span> {user?.unit}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => navigate('/tenant/issues')}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60">
              {loading ? t('common.submitting') : t('issues.submitIssue')}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
