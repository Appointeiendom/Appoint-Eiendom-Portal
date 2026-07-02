import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Layout from '../components/Layout';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();
  const isAdmin = user?.role === 'admin';
  const isTenant = user?.role === 'tenant';

  // Email change state
  const [emailForm, setEmailForm] = useState({ email: '', password: '' });
  const [otp, setOtp] = useState('');
  const [emailStep, setEmailStep] = useState('idle'); // idle | request | confirm
  const [emailSaving, setEmailSaving] = useState(false);

  // Phone change state
  const [phoneForm, setPhoneForm] = useState({ phone: '' });
  const [showPhoneEdit, setShowPhoneEdit] = useState(false);
  const [phoneSaving, setPhoneSaving] = useState(false);

  const fields = [
    { label: t('profile.fullName'), value: user?.name },
    { label: t('profile.email'), value: user?.email },
    { label: t('profile.phone'), value: user?.phone || '—' },
    ...(isTenant ? [
      { label: t('profile.unitAddress'), value: user?.unit },
      { label: t('profile.building'), value: user?.building || '—' },
    ] : []),
  ];

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setEmailSaving(true);
    try {
      await api.post('/auth/request-email-change', emailForm);
      toast.success(t('profile.otpSent')(emailForm.email));
      setEmailStep('confirm');
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'));
    } finally {
      setEmailSaving(false);
    }
  };

  const handleConfirmOtp = async (e) => {
    e.preventDefault();
    setEmailSaving(true);
    try {
      const res = await api.put('/auth/confirm-email-change', { otp });
      updateUser({ email: res.data.email });
      toast.success(t('profile.emailUpdated'));
      setEmailForm({ email: '', password: '' });
      setOtp('');
      setEmailStep('idle');
    } catch (err) {
      toast.error(err.response?.data?.message || t('profile.wrongCode'));
    } finally {
      setEmailSaving(false);
    }
  };

  const handlePhoneSave = async (e) => {
    e.preventDefault();
    setPhoneSaving(true);
    try {
      const res = await api.put('/users/profile', { phone: phoneForm.phone });
      updateUser({ phone: res.data.phone });
      toast.success(t('profile.phoneUpdated'));
      setShowPhoneEdit(false);
      setPhoneForm({ phone: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'));
    } finally {
      setPhoneSaving(false);
    }
  };

  const canEdit = isAdmin || isTenant;

  return (
    <Layout>
      <div className="max-w-lg">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('profile.title')}</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
            <div className="w-14 h-14 rounded-full overflow-hidden shrink-0">
              {user?.photo
                ? <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-emerald-500 flex items-center justify-center">
                    <span className="text-white font-bold text-xl">{user?.name?.[0]?.toUpperCase()}</span>
                  </div>
              }
            </div>
            <div>
              <p className="font-semibold text-gray-800">{user?.name}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full capitalize">{user?.role}</span>
            </div>
          </div>

          <div className="space-y-3">
            {fields.map((f) => (
              <div key={f.label} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-500">{f.label}</span>
                <span className="text-sm font-medium text-gray-800 capitalize">{f.value}</span>
              </div>
            ))}
          </div>

          {canEdit && (
            <div className="mt-6 pt-5 border-t border-gray-100 space-y-6">

              {/* ── Phone number ── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-700">{t('profile.changePhone')}</p>
                  {showPhoneEdit && (
                    <button onClick={() => { setShowPhoneEdit(false); setPhoneForm({ phone: '' }); }}
                      className="text-xs text-gray-400 hover:text-gray-600">{t('common.cancel')}</button>
                  )}
                </div>
                {!showPhoneEdit ? (
                  <button onClick={() => { setShowPhoneEdit(true); setPhoneForm({ phone: user?.phone || '' }); }}
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium border border-emerald-200 px-4 py-2 rounded-lg hover:bg-emerald-50 transition-colors w-full">
                    {t('profile.changePhoneBtn')}
                  </button>
                ) : (
                  <form onSubmit={handlePhoneSave} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{t('profile.newPhone')}</label>
                      <input type="tel" required value={phoneForm.phone}
                        onChange={(e) => setPhoneForm({ phone: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        placeholder="+47 000 00 000" />
                    </div>
                    <button type="submit" disabled={phoneSaving}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold py-2 rounded-lg transition-colors disabled:opacity-60">
                      {phoneSaving ? t('common.saving') : t('profile.savePhone')}
                    </button>
                  </form>
                )}
              </div>

              {/* ── Email ── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-700">{t('profile.changeEmail')}</p>
                  {emailStep !== 'idle' && (
                    <button onClick={() => { setEmailStep('idle'); setOtp(''); setEmailForm({ email: '', password: '' }); }}
                      className="text-xs text-gray-400 hover:text-gray-600">{t('common.cancel')}</button>
                  )}
                </div>

                {emailStep === 'idle' && (
                  <button onClick={() => setEmailStep('request')}
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium border border-emerald-200 px-4 py-2 rounded-lg hover:bg-emerald-50 transition-colors w-full">
                    {t('profile.changeEmailBtn')}
                  </button>
                )}

                {emailStep === 'request' && (
                  <form onSubmit={handleRequestOtp} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{t('profile.newEmail')}</label>
                      <input type="email" required value={emailForm.email}
                        onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        placeholder={t('profile.newEmailPlaceholder')} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{t('profile.confirmPassword')}</label>
                      <input type="password" required value={emailForm.password}
                        onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        placeholder="••••••••" />
                    </div>
                    <button type="submit" disabled={emailSaving}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold py-2 rounded-lg transition-colors disabled:opacity-60">
                      {emailSaving ? t('profile.sending') : t('profile.sendCode')}
                    </button>
                  </form>
                )}

                {emailStep === 'confirm' && (
                  <form onSubmit={handleConfirmOtp} className="space-y-3">
                    <p className="text-xs text-gray-500">{t('profile.codeSentTo')(emailForm.email)}</p>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{t('profile.code')}</label>
                      <input type="text" required value={otp} onChange={(e) => setOtp(e.target.value)}
                        maxLength={6} inputMode="numeric"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-center tracking-widest font-mono text-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        placeholder="000000" />
                    </div>
                    <button type="submit" disabled={emailSaving || otp.length < 6}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold py-2 rounded-lg transition-colors disabled:opacity-60">
                      {emailSaving ? t('profile.confirming') : t('profile.confirmBtn')}
                    </button>
                    <button type="button" onClick={handleRequestOtp} disabled={emailSaving}
                      className="w-full text-xs text-gray-400 hover:text-gray-600 py-1">
                      {t('profile.resendCode')}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {!canEdit && (
            <p className="text-xs text-gray-400 mt-4 text-center">{t('profile.contactAdmin')}</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
