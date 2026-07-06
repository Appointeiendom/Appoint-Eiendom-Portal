import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Layout from '../components/Layout';
import api from '../services/api';
import toast from 'react-hot-toast';

// Which fields are editable and how
// editing: null | 'phone' | 'email' | 'password'

function OtpInput({ value, onChange }) {
  return (
    <input
      type="text"
      required
      value={value}
      onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      maxLength={6}
      inputMode="numeric"
      placeholder="000000"
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-center tracking-[0.5em] font-mono text-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
    />
  );
}

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();
  const isAdmin = user?.role === 'admin';
  const isTenant = user?.role === 'tenant';
  const canEdit = isAdmin || isTenant;

  const [editing, setEditing] = useState(null); // null | 'phone' | 'email' | 'password'

  // Phone
  const [phone, setPhone] = useState('');
  const [phoneSaving, setPhoneSaving] = useState(false);

  // Email
  const [emailForm, setEmailForm] = useState({ email: '', password: '' });
  const [emailOtp, setEmailOtp] = useState('');
  const [emailStep, setEmailStep] = useState('form'); // form | otp
  const [emailSaving, setEmailSaving] = useState(false);

  // Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwOtp, setPwOtp] = useState('');
  const [pwStep, setPwStep] = useState('form'); // form | otp
  const [pwSaving, setPwSaving] = useState(false);

  const startEdit = (field) => {
    setEditing(field);
    if (field === 'phone') setPhone(user?.phone || '');
    if (field === 'email') { setEmailForm({ email: '', password: '' }); setEmailOtp(''); setEmailStep('form'); }
    if (field === 'password') { setNewPassword(''); setConfirmPassword(''); setPwOtp(''); setPwStep('form'); }
  };
  const cancelEdit = () => setEditing(null);

  // ── Phone save ──
  const handlePhoneSave = async (e) => {
    e.preventDefault();
    setPhoneSaving(true);
    try {
      const res = await api.put('/users/profile', { phone });
      updateUser({ phone: res.data.phone });
      toast.success(t('profile.phoneUpdated'));
      setEditing(null);
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'));
    } finally {
      setPhoneSaving(false);
    }
  };

  // ── Email OTP request ──
  const handleEmailRequest = async (e) => {
    e.preventDefault();
    setEmailSaving(true);
    try {
      await api.post('/auth/request-email-change', emailForm);
      toast.success(t('profile.otpSent')(emailForm.email));
      setEmailStep('otp');
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'));
    } finally {
      setEmailSaving(false);
    }
  };

  const handleEmailConfirm = async (e) => {
    e.preventDefault();
    setEmailSaving(true);
    try {
      const res = await api.put('/auth/confirm-email-change', { otp: emailOtp });
      updateUser({ email: res.data.email });
      toast.success(t('profile.emailUpdated'));
      setEditing(null);
    } catch (err) {
      toast.error(err.response?.data?.message || t('profile.wrongCode'));
    } finally {
      setEmailSaving(false);
    }
  };

  // ── Password OTP request ──
  const handlePwRequest = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error(t('tenants.passwordMin'));
    if (newPassword !== confirmPassword) return toast.error(t('profile.passwordMismatch'));
    setPwSaving(true);
    try {
      await api.post('/auth/request-password-change', { newPassword });
      toast.success(t('profile.otpSent')(user.email));
      setPwStep('otp');
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'));
    } finally {
      setPwSaving(false);
    }
  };

  const handlePwConfirm = async (e) => {
    e.preventDefault();
    setPwSaving(true);
    try {
      await api.put('/auth/confirm-password-change', { otp: pwOtp });
      toast.success(t('profile.passwordUpdated'));
      setEditing(null);
    } catch (err) {
      toast.error(err.response?.data?.message || t('profile.wrongCode'));
    } finally {
      setPwSaving(false);
    }
  };

  const rows = [
    { key: 'name',     label: t('profile.fullName'),    value: user?.name,             editable: false },
    { key: 'email',    label: t('profile.email'),        value: user?.email,            editable: canEdit },
    { key: 'phone',    label: t('profile.phone'),        value: user?.phone || '—',     editable: canEdit },
    { key: 'password', label: t('profile.password'),     value: '••••••••',             editable: canEdit },
    ...(isTenant ? [
      { key: 'unit',   label: t('profile.unitAddress'), value: user?.unit,             editable: false },
      { key: 'apt',    label: t('profile.building'),    value: user?.building || '—',  editable: false },
    ] : []),
  ];

  return (
    <Layout>
      <div className="max-w-lg">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('profile.title')}</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-6">

          {/* Avatar header */}
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

          {/* Field rows */}
          <div className="divide-y divide-gray-100">
            {rows.map(row => (
              <div key={row.key}>
                {/* Display row */}
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-gray-500 shrink-0 w-32">{row.label}</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-gray-800 truncate text-right">{row.value}</span>
                    {row.editable && editing !== row.key && (
                      <button
                        onClick={() => startEdit(row.key)}
                        className="text-gray-300 hover:text-emerald-500 transition-colors shrink-0 ml-1"
                        title={`Edit ${row.label}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline edit panel */}
                {editing === row.key && (
                  <div className="pb-4 pt-1">
                    {/* ── Phone edit ── */}
                    {row.key === 'phone' && (
                      <form onSubmit={handlePhoneSave} className="space-y-3">
                        <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)}
                          placeholder="+47 000 00 000"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                        <div className="flex gap-2">
                          <button type="button" onClick={cancelEdit}
                            className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                            {t('common.cancel')}
                          </button>
                          <button type="submit" disabled={phoneSaving}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60">
                            {phoneSaving ? t('common.saving') : t('common.save')}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* ── Email edit ── */}
                    {row.key === 'email' && emailStep === 'form' && (
                      <form onSubmit={handleEmailRequest} className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">{t('profile.newEmail')}</label>
                          <input type="email" required value={emailForm.email}
                            onChange={e => setEmailForm({ ...emailForm, email: e.target.value })}
                            placeholder={t('profile.newEmailPlaceholder')}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">{t('profile.confirmPassword')}</label>
                          <input type="password" required value={emailForm.password}
                            onChange={e => setEmailForm({ ...emailForm, password: e.target.value })}
                            placeholder="••••••••"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={cancelEdit}
                            className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                            {t('common.cancel')}
                          </button>
                          <button type="submit" disabled={emailSaving}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60">
                            {emailSaving ? t('profile.sending') : t('profile.sendCode')}
                          </button>
                        </div>
                      </form>
                    )}
                    {row.key === 'email' && emailStep === 'otp' && (
                      <form onSubmit={handleEmailConfirm} className="space-y-3">
                        <p className="text-xs text-gray-500">{t('profile.codeSentTo')(emailForm.email)}</p>
                        <OtpInput value={emailOtp} onChange={setEmailOtp} />
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setEmailStep('form')}
                            className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                            {t('common.back')}
                          </button>
                          <button type="submit" disabled={emailSaving || emailOtp.length < 6}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60">
                            {emailSaving ? t('profile.confirming') : t('profile.confirmBtn')}
                          </button>
                        </div>
                        <button type="button" onClick={handleEmailRequest} disabled={emailSaving}
                          className="w-full text-xs text-gray-400 hover:text-gray-600 py-1">
                          {t('profile.resendCode')}
                        </button>
                      </form>
                    )}

                    {/* ── Password edit ── */}
                    {row.key === 'password' && pwStep === 'form' && (
                      <form onSubmit={handlePwRequest} className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">{t('profile.newPassword')}</label>
                          <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)}
                            placeholder="Min. 6 characters"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">{t('profile.confirmNewPassword')}</label>
                          <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                            placeholder="Repeat password"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                        </div>
                        <p className="text-xs text-gray-400">{t('profile.passwordOtpHint')(user?.email)}</p>
                        <div className="flex gap-2">
                          <button type="button" onClick={cancelEdit}
                            className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                            {t('common.cancel')}
                          </button>
                          <button type="submit" disabled={pwSaving}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60">
                            {pwSaving ? t('profile.sending') : t('profile.sendCode')}
                          </button>
                        </div>
                      </form>
                    )}
                    {row.key === 'password' && pwStep === 'otp' && (
                      <form onSubmit={handlePwConfirm} className="space-y-3">
                        <p className="text-xs text-gray-500">{t('profile.codeSentTo')(user?.email)}</p>
                        <OtpInput value={pwOtp} onChange={setPwOtp} />
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setPwStep('form')}
                            className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                            {t('common.back')}
                          </button>
                          <button type="submit" disabled={pwSaving || pwOtp.length < 6}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60">
                            {pwSaving ? t('profile.confirming') : t('profile.confirmBtn')}
                          </button>
                        </div>
                        <button type="button" onClick={handlePwRequest} disabled={pwSaving}
                          className="w-full text-xs text-gray-400 hover:text-gray-600 py-1">
                          {t('profile.resendCode')}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {!canEdit && (
            <p className="text-xs text-gray-400 mt-4 text-center">{t('profile.contactAdmin')}</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
