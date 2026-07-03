import { useState } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';

const CATEGORIES = ['general', 'bug', 'feature', 'design', 'other'];

export default function TenantFeedback() {
  const { t } = useLanguage();
  const [form, setForm] = useState({ rating: 0, message: '', category: 'general' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.rating) return toast.error('Please select a rating');
    if (!form.message.trim()) return toast.error('Please enter your feedback');
    setSubmitting(true);
    try {
      await api.post('/feedback', form);
      setSubmitted(true);
      toast.success('Thank you for your feedback!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto text-center py-16">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Thank you!</h2>
          <p className="text-gray-500 mb-6">Your feedback has been sent to the management team.</p>
          <button onClick={() => { setForm({ rating: 0, message: '', category: 'general' }); setSubmitted(false); }}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
            Submit another
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-lg">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Give Feedback</h1>
          <p className="text-gray-500 text-sm mt-1">Help us improve the app by sharing your thoughts</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          {/* Rating */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">How would you rate your experience?</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} type="button" onClick={() => setForm(f => ({ ...f, rating: star }))}
                  className={`text-3xl transition-transform hover:scale-110 ${form.rating >= star ? 'opacity-100' : 'opacity-30'}`}>
                  ⭐
                </button>
              ))}
            </div>
            {form.rating > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                {['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][form.rating]}
              </p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat} type="button" onClick={() => setForm(f => ({ ...f, category: cat }))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                    form.category === cat
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {cat === 'bug' ? '🐛 Bug' : cat === 'feature' ? '💡 Feature' : cat === 'design' ? '🎨 Design' : cat === 'general' ? '💬 General' : '📝 Other'}
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Your feedback</label>
            <textarea
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder="Tell us what you think, what's working well, or what could be improved..."
              rows={5}
              maxLength={1000}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
            />
            <p className="text-xs text-gray-400 text-right mt-1">{form.message.length}/1000</p>
          </div>

          <button type="submit" disabled={submitting || !form.rating || !form.message.trim()}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
            {submitting ? 'Submitting...' : 'Submit feedback'}
          </button>
        </form>
      </div>
    </Layout>
  );
}
