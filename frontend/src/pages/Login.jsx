import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const policy = {
  no: {
    title: 'Personvernerklæring',
    sections: [
      {
        heading: '1. Behandlingsansvarlig',
        body: 'Service Portal er behandlingsansvarlig for personopplysningene som behandles i denne portalen, i samsvar med personopplysningsloven (2018) og EUs personvernforordning (GDPR). Portalen benyttes til administrasjon av flere eiendommer og selskaper som er eid og drevet av samme eier. Alle disse eiendommene faller inn under samme behandlingsansvarlige og samme personvernerklæring.',
        extra: [
          'Kontakt: sameer@superstay.no',
          'Fullstendige juridiske opplysninger (organisasjonsnummer, forretningsadresse) er tilgjengelig på forespørsel.',
        ],
      },
      {
        heading: '2. Hvilke personopplysninger vi samler inn',
        list: [
          'Fullt navn, e-postadresse, telefonnummer',
          'Boligadresse og leilighetsnummer',
          'Leieperiode (innflyttings- og utflyttingsdato)',
          'Innloggingsinformasjon (kryptert passord)',
          'Vedlikeholdssaker: tittel, beskrivelse, kategori, bilder',
          'Meldinger og kommunikasjon i portalen',
          'Profilbilde (valgfritt)',
          'IP-adresser og tekniske logger (via hostingleverandør)',
        ],
      },
      {
        heading: '3. Formål og rettslig grunnlag',
        list: [
          'Administrere leieforhold — oppfyllelse av avtale, GDPR art. 6(1)(b)',
          'Behandle vedlikeholdssaker — oppfyllelse av avtale, GDPR art. 6(1)(b)',
          'Varsler om statusendringer — berettiget interesse, GDPR art. 6(1)(f)',
          'Kunngjøringer til leietakere — berettiget interesse, GDPR art. 6(1)(f)',
          'Dokumentdeling — oppfyllelse av avtale, GDPR art. 6(1)(b)',
          'Sikkerhet og tilgangskontroll — berettiget interesse, GDPR art. 6(1)(f)',
        ],
      },
      {
        heading: '4. Databehandlere og tredjeparter',
        body: 'Vi benytter følgende underleverandører som behandler personopplysninger på våre vegne. Alle er bundet av databehandleravtaler:',
        list: [
          'MongoDB Atlas (MongoDB Inc., USA) — databaselagring',
          'Cloudinary (Cloudinary Ltd., USA) — lagring av bilder og filer',
          'SendGrid / Twilio (Twilio Inc., USA) — utsending av e-post og SMS-varsler',
          'Render (Render Services Inc., USA) — hosting av serverapplikasjon',
          'Vercel (Vercel Inc., USA) — hosting av nettstedet',
        ],
      },
      {
        heading: '5. Overføring til tredjeland',
        body: 'Alle ovennevnte leverandører er lokalisert i USA. Overføring skjer på grunnlag av EUs standardkontraktklausuler (Standard Contractual Clauses, SCCs) i henhold til GDPR art. 46(2)(c), som sikrer et tilstrekkelig beskyttelsesnivå for dine personopplysninger.',
      },
      {
        heading: '6. Lagringstid',
        list: [
          'Kontoopplysninger: så lenge leieforholdet er aktivt + 3 år',
          'Vedlikeholdssaker (løste): slettes automatisk 7 dager etter løsning',
          'Meldinger og kommunikasjonslogg: 3 år etter leieforholdets avslutning',
          'Regnskapsrelevante opplysninger: 5 år jf. regnskapsloven § 13',
          'Sikkerhetslogs: 90 dager',
        ],
      },
      {
        heading: '7. Informasjonskapsler og lokal lagring',
        body: 'Portalen benytter sessionStorage og localStorage i nettleseren for å lagre innloggingstoken, språkvalg og leste varsler. Det benyttes ingen tredjeparts sporingskapsler. Disse dataene forlater ikke din enhet.',
      },
      {
        heading: '8. Sikkerhet',
        body: 'Passord krypteres med bcrypt. Kommunikasjon mellom nettleser og server er kryptert med TLS/HTTPS. Tilgang er begrenset til autoriserte brukere med rollebasert tilgangskontroll. Vi iverksetter tekniske og organisatoriske tiltak i samsvar med GDPR art. 32.',
      },
      {
        heading: '9. Automatiserte avgjørelser',
        body: 'Vi foretar ingen automatiserte avgjørelser eller profilering som har rettslig eller tilsvarende vesentlig virkning for deg, jf. GDPR art. 22.',
      },
      {
        heading: '10. Dine rettigheter',
        body: 'I henhold til GDPR har du følgende rettigheter:',
        list: [
          'Innsyn (art. 15) — rett til å se hvilke opplysninger vi har om deg',
          'Retting (art. 16) — rett til å korrigere feilaktige opplysninger',
          'Sletting (art. 17) — rett til å kreve sletting («retten til å bli glemt»)',
          'Begrensning (art. 18) — rett til å begrense behandlingen',
          'Dataportabilitet (art. 20) — rett til å motta dine data i maskinlesbart format',
          'Innsigelse (art. 21) — rett til å protestere mot behandling basert på berettiget interesse',
          'Trekke samtykke — der behandling er basert på samtykke, kan dette trekkes tilbake når som helst',
        ],
        extra: ['For å utøve dine rettigheter, kontakt oss på sameer@superstay.no. Vi besvarer henvendelser innen 30 dager jf. GDPR art. 12.'],
      },
      {
        heading: '11. Klagerett',
        body: 'Du har rett til å klage til Datatilsynet dersom du mener vi behandler dine personopplysninger i strid med personvernregelverket.',
        extra: ['Datatilsynet — www.datatilsynet.no — tlf. 74 07 70 00'],
      },
      {
        heading: '12. Endringer i personvernerklæringen',
        body: 'Ved vesentlige endringer vil leietakere varsles via e-post eller portal. Gjeldende versjon er alltid tilgjengelig på innloggingssiden.',
      },
    ],
    updated: 'Sist oppdatert',
  },
  en: {
    title: 'Privacy Policy',
    sections: [
      {
        heading: '1. Data Controller',
        body: 'Service Portal is the data controller for all personal data processed in this portal, in accordance with the Norwegian Personal Data Act (2018) and the EU General Data Protection Regulation (GDPR). Multiple properties and company names are administered through this portal, all owned and operated by the same individual and covered by this single privacy policy.',
        extra: [
          'Contact: sameer@superstay.no',
          'Full legal entity details (organisation number, business address) are available upon request.',
        ],
      },
      {
        heading: '2. What Personal Data We Collect',
        list: [
          'Full name, email address, phone number',
          'Residential address and unit number',
          'Lease period (move-in and move-out dates)',
          'Login credentials (encrypted password)',
          'Maintenance issues: title, description, category, photos',
          'Messages and communications within the portal',
          'Profile photo (optional)',
          'IP addresses and technical logs (via hosting provider)',
        ],
      },
      {
        heading: '3. Purpose & Legal Basis',
        list: [
          'Managing tenancy agreements — contract performance, GDPR Art. 6(1)(b)',
          'Processing maintenance requests — contract performance, GDPR Art. 6(1)(b)',
          'Issue status notifications — legitimate interest, GDPR Art. 6(1)(f)',
          'Announcements to tenants — legitimate interest, GDPR Art. 6(1)(f)',
          'Document sharing — contract performance, GDPR Art. 6(1)(b)',
          'Security and access control — legitimate interest, GDPR Art. 6(1)(f)',
        ],
      },
      {
        heading: '4. Third-Party Processors',
        body: 'We use the following sub-processors who handle personal data on our behalf. All are bound by data processing agreements:',
        list: [
          'MongoDB Atlas (MongoDB Inc., USA) — database storage',
          'Cloudinary (Cloudinary Ltd., USA) — image and file storage',
          'SendGrid / Twilio (Twilio Inc., USA) — email and SMS notifications',
          'Render (Render Services Inc., USA) — server application hosting',
          'Vercel (Vercel Inc., USA) — website hosting',
        ],
      },
      {
        heading: '5. International Data Transfers',
        body: 'All processors listed above are located in the USA. Transfers are carried out under EU Standard Contractual Clauses (SCCs) pursuant to GDPR Art. 46(2)(c), ensuring an adequate level of protection for your personal data.',
      },
      {
        heading: '6. Data Retention',
        list: [
          'Account data: for the duration of the tenancy + 3 years',
          'Resolved maintenance issues: automatically deleted 7 days after resolution',
          'Messages and communication logs: 3 years after tenancy ends',
          'Accounting-relevant data: 5 years under the Norwegian Accounting Act § 13',
          'Security logs: 90 days',
        ],
      },
      {
        heading: '7. Cookies & Local Storage',
        body: 'The portal uses browser sessionStorage and localStorage to store login tokens, language preferences, and read notifications. No third-party tracking cookies are used. This data never leaves your device.',
      },
      {
        heading: '8. Security',
        body: 'Passwords are encrypted with bcrypt. All communication between browser and server is encrypted via TLS/HTTPS. Access is restricted to authorised users through role-based access control. We implement technical and organisational security measures in accordance with GDPR Art. 32.',
      },
      {
        heading: '9. Automated Decision-Making',
        body: 'We do not carry out any automated decision-making or profiling that produces legal or similarly significant effects on you, in accordance with GDPR Art. 22.',
      },
      {
        heading: '10. Your Rights',
        body: 'Under GDPR you have the following rights:',
        list: [
          'Access (Art. 15) — right to see what data we hold about you',
          'Rectification (Art. 16) — right to correct inaccurate data',
          'Erasure (Art. 17) — right to request deletion ("right to be forgotten")',
          'Restriction (Art. 18) — right to restrict processing',
          'Data portability (Art. 20) — right to receive your data in machine-readable format',
          'Objection (Art. 21) — right to object to processing based on legitimate interest',
          'Withdraw consent — where processing is based on consent, you may withdraw it at any time',
        ],
        extra: ['To exercise your rights, contact us at sameer@superstay.no. We respond within 30 days per GDPR Art. 12.'],
      },
      {
        heading: '11. Right to Lodge a Complaint',
        body: 'You have the right to lodge a complaint with the Norwegian Data Protection Authority (Datatilsynet) if you believe we are processing your personal data unlawfully.',
        extra: ['Datatilsynet — www.datatilsynet.no — tel. 74 07 70 00'],
      },
      {
        heading: '12. Policy Updates',
        body: 'Tenants will be notified of material changes via email or the portal. The current version is always available on the login page.',
      },
    ],
    updated: 'Last updated',
  },
};

export default function Login() {
  const { login } = useAuth();
  const { lang, toggleLang, t } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Forgot password state
  const [forgotStep, setForgotStep] = useState(null); // null | 'email' | 'otp'
  const [fpEmail, setFpEmail] = useState('');
  const [fpOtp, setFpOtp] = useState('');
  const [fpPassword, setFpPassword] = useState('');
  const [fpConfirm, setFpConfirm] = useState('');
  const [fpLoading, setFpLoading] = useState(false);
  const [fpError, setFpError] = useState('');

  const handleForgotRequest = async (e) => {
    e.preventDefault();
    setFpLoading(true); setFpError('');
    try {
      await api.post('/auth/forgot-password', { email: fpEmail });
      setForgotStep('otp');
    } catch (err) {
      // Always show success msg to avoid email enumeration
      setForgotStep('otp');
    } finally {
      setFpLoading(false);
    }
  };

  const handleForgotReset = async (e) => {
    e.preventDefault();
    if (fpPassword !== fpConfirm) return setFpError(lang === 'no' ? 'Passordene stemmer ikke overens' : 'Passwords do not match');
    if (fpPassword.length < 6) return setFpError(lang === 'no' ? 'Minst 6 tegn' : 'At least 6 characters');
    setFpLoading(true); setFpError('');
    try {
      await api.post('/auth/reset-password', { email: fpEmail, otp: fpOtp, newPassword: fpPassword });
      toast.success(lang === 'no' ? 'Passord tilbakestilt! Logg inn.' : 'Password reset! Please log in.');
      setForgotStep(null); setFpEmail(''); setFpOtp(''); setFpPassword(''); setFpConfirm('');
    } catch (err) {
      setFpError(err.response?.data?.message || (lang === 'no' ? 'Noe gikk galt' : 'Something went wrong'));
    } finally {
      setFpLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(t('auth.welcome')(user.name));
      sessionStorage.removeItem('lang');
      navigate(
        user.role === 'admin' ? '/admin/dashboard'
        : user.role === 'maintenance' ? '/maintenance/dashboard'
        : '/tenant/dashboard'
      );
    } catch (err) {
      setError(err.response?.data?.message || t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  const p = policy[lang] || policy.en;
  const detailsRef = useRef(null);

  useEffect(() => {
    if (window.location.hash === '#privacy' && detailsRef.current) {
      detailsRef.current.open = true;
      detailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">
        <div className="flex justify-end mb-2">
          <button onClick={toggleLang} className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
            {lang === 'no' ? '🇬🇧 EN' : '🇳🇴 NO'}
          </button>
        </div>

        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Service Portal</h1>
          <p className="text-gray-500 text-sm mt-1">{t('auth.signin')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.email')}</label>
            <input
              type="email" required value={form.email}
              onChange={(e) => { setForm({ ...form, email: e.target.value }); setError(''); }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="din@epost.no"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.password')}</label>
            <input
              type="password" required value={form.password}
              onChange={(e) => { setForm({ ...form, password: e.target.value }); setError(''); }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}
          <button type="submit" disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60 mt-2">
            {loading ? t('auth.signingIn') : t('auth.signin')}
          </button>
          <div className="text-center">
            <button type="button" onClick={() => { setForgotStep('email'); setFpError(''); }}
              className="text-sm text-emerald-600 hover:text-emerald-800 hover:underline transition-colors">
              {lang === 'no' ? 'Glemt passord?' : 'Forgot password?'}
            </button>
          </div>
        </form>

        {/* Forgot password inline panel */}
        {forgotStep && (
          <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-xl p-5">
            {forgotStep === 'email' ? (
              <form onSubmit={handleForgotRequest} className="space-y-3">
                <p className="text-sm font-semibold text-gray-700">
                  {lang === 'no' ? 'Tilbakestill passord' : 'Reset password'}
                </p>
                <p className="text-xs text-gray-500">
                  {lang === 'no' ? 'Skriv inn e-postadressen din. Vi sender deg en kode.' : 'Enter your email address. We will send you a code.'}
                </p>
                <input type="email" required value={fpEmail} onChange={e => setFpEmail(e.target.value)}
                  placeholder={lang === 'no' ? 'din@epost.no' : 'your@email.com'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                {fpError && <p className="text-xs text-red-600">{fpError}</p>}
                <div className="flex gap-2">
                  <button type="submit" disabled={fpLoading}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold py-2 rounded-lg transition-colors disabled:opacity-60">
                    {fpLoading ? (lang === 'no' ? 'Sender...' : 'Sending...') : (lang === 'no' ? 'Send kode' : 'Send code')}
                  </button>
                  <button type="button" onClick={() => setForgotStep(null)}
                    className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg">
                    {lang === 'no' ? 'Avbryt' : 'Cancel'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleForgotReset} className="space-y-3">
                <p className="text-sm font-semibold text-gray-700">
                  {lang === 'no' ? 'Angi ny kode og passord' : 'Enter code and new password'}
                </p>
                <p className="text-xs text-gray-500">
                  {lang === 'no' ? `En 6-sifret kode er sendt til ${fpEmail}` : `A 6-digit code was sent to ${fpEmail}`}
                </p>
                <input type="text" required inputMode="numeric" maxLength={6} value={fpOtp}
                  onChange={e => setFpOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder={lang === 'no' ? '6-sifret kode' : '6-digit code'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                <input type="password" required value={fpPassword} onChange={e => setFpPassword(e.target.value)}
                  placeholder={lang === 'no' ? 'Nytt passord' : 'New password'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                <input type="password" required value={fpConfirm} onChange={e => setFpConfirm(e.target.value)}
                  placeholder={lang === 'no' ? 'Bekreft nytt passord' : 'Confirm new password'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                {fpError && <p className="text-xs text-red-600">{fpError}</p>}
                <div className="flex gap-2">
                  <button type="submit" disabled={fpLoading}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold py-2 rounded-lg transition-colors disabled:opacity-60">
                    {fpLoading ? (lang === 'no' ? 'Lagrer...' : 'Saving...') : (lang === 'no' ? 'Tilbakestill passord' : 'Reset password')}
                  </button>
                  <button type="button" onClick={() => setForgotStep('email')}
                    className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg">
                    ← {lang === 'no' ? 'Tilbake' : 'Back'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">{t('auth.contactAdmin')}</p>

        {/* Privacy Policy */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <details ref={detailsRef} className="group" id="privacy">
            <summary className="flex items-center justify-between cursor-pointer text-xs text-gray-400 hover:text-gray-600 transition-colors select-none">
              <span className="font-medium">🔒 {p.title}</span>
              <span className="group-open:rotate-180 transition-transform text-gray-300">▼</span>
            </summary>
            <div className="mt-4 text-xs text-gray-500 space-y-4 leading-relaxed max-h-96 overflow-y-auto pr-1">
              {p.sections.map((s, i) => (
                <div key={i}>
                  <p className="font-semibold text-gray-600 mb-1">{s.heading}</p>
                  {s.body && <p>{s.body}</p>}
                  {s.list && (
                    <ul className="list-disc list-inside space-y-1 mt-1">
                      {s.list.map((item, j) => <li key={j}>{item}</li>)}
                    </ul>
                  )}
                  {s.extra && s.extra.map((e, j) => (
                    <p key={j} className="mt-1">{e}</p>
                  ))}
                </div>
              ))}
              <p className="text-gray-400">{p.updated}: {new Date().toLocaleDateString(lang === 'no' ? 'no-NO' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
