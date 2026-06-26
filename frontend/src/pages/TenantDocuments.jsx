import { useState, useEffect } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';
import { useLanguage } from '../context/LanguageContext';
import { useUnread } from '../context/UnreadContext';

export default function TenantDocuments() {
  const { t } = useLanguage();
  const { markAllRead } = useUnread();
  const [docs, setDocs] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('announcements');

  useEffect(() => {
    Promise.all([
      api.get('/announcements'),
      api.get('/documents'),
    ]).then(([a, d]) => {
      setAnnouncements(a.data);
      setDocs(d.data);
      markAllRead(a.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

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
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">{t('notices.title')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('notices.subtitle')}</p>
        </div>

        <div className="flex gap-2 mb-5">
          <button onClick={() => setTab('announcements')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'announcements' ? 'bg-emerald-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            📢 {t('nav.announcements')} {announcements.length > 0 && <span className="ml-1">({announcements.length})</span>}
          </button>
          <button onClick={() => setTab('documents')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'documents' ? 'bg-emerald-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            📁 {t('nav.documents')} {docs.length > 0 && <span className="ml-1">({docs.length})</span>}
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse h-20" />)}
          </div>
        ) : tab === 'announcements' ? (
          announcements.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
              <p className="text-gray-400">{t('notices.noAnnouncements')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map(a => (
                <div key={a._id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">📢</span>
                    <div>
                      <h3 className="font-semibold text-gray-800">{a.title}</h3>
                      <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{a.body}</p>
                      <p className="text-xs text-gray-400 mt-2">{new Date(a.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          docs.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
              <p className="text-gray-400">{t('notices.noDocs')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {docs.map(doc => (
                <a key={doc._id} href={doc.fileUrl} target="_blank" rel="noreferrer"
                  className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4 hover:border-emerald-300 hover:shadow-sm transition-all block">
                  <span className="text-2xl shrink-0">{fileIcon(doc.fileType)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm">{doc.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(doc.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className="text-xs text-emerald-600 shrink-0">{t('notices.open')}</span>
                </a>
              ))}
            </div>
          )
        )}
      </div>
    </Layout>
  );
}
