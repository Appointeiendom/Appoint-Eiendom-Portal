import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const { lang, toggleLang, t } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

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
      toast.error(err.response?.data?.message || t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

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
            <span className="text-white font-bold text-xl">AE</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Appoint Eiendom AS</h1>
          <p className="text-gray-500 text-sm mt-1">{t('auth.signin')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.email')}</label>
            <input
              type="email" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="din@epost.no"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.password')}</label>
            <input
              type="password" required value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="••••••••"
            />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60 mt-2">
            {loading ? t('auth.signingIn') : t('auth.signin')}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">{t('auth.contactAdmin')}</p>

        {/* Privacy Policy */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer text-xs text-gray-400 hover:text-gray-600 transition-colors select-none">
              <span className="font-medium">🔒 Personvernerklæring / Privacy Policy</span>
              <span className="group-open:rotate-180 transition-transform text-gray-300">▼</span>
            </summary>
            <div className="mt-4 text-xs text-gray-500 space-y-4 leading-relaxed max-h-96 overflow-y-auto pr-1">

              <div>
                <p className="font-semibold text-gray-600 mb-1">1. Behandlingsansvarlig / Data Controller</p>
                <p>Appoint Eiendom AS er behandlingsansvarlig for personopplysningene som behandles i denne portalen, i samsvar med personopplysningsloven (2018) og EUs personvernforordning (GDPR). Portalen benyttes til administrasjon av flere eiendommer og selskaper som er eid og drevet av samme eier. Alle disse eiendommene faller inn under samme behandlingsansvarlige og samme personvernerklæring.</p>
                <p className="mt-1 text-gray-400">Appoint Eiendom AS is the data controller for all properties and tenants managed through this portal. Multiple properties and company names may be administered here, but all are owned and operated by the same individual and fall under this single data controller and privacy policy.</p>
                <p className="mt-1">Kontakt / Contact: <span className="text-emerald-600">sameer@superstay.no</span></p>
                <p className="mt-1">Fullstendige juridiske opplysninger (organisasjonsnummer, forretningsadresse) er tilgjengelig på forespørsel. / Full legal entity details (organisation number, business address) are available upon request.</p>
              </div>

              <div>
                <p className="font-semibold text-gray-600 mb-1">2. Hvilke personopplysninger vi samler inn / What We Collect</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Fullt navn, e-postadresse, telefonnummer</li>
                  <li>Boligadresse og leilighetsnummer</li>
                  <li>Leieperiode (innflyttings- og utflyttingsdato)</li>
                  <li>Innloggingsinformasjon (kryptert passord)</li>
                  <li>Vedlikeholdssaker: tittel, beskrivelse, kategori, bilder</li>
                  <li>Meldinger og kommunikasjon i portalen</li>
                  <li>Profilbilde (valgfritt)</li>
                  <li>IP-adresser og tekniske logger (via hostingleverandør)</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-gray-600 mb-1">3. Formål og rettslig grunnlag / Purpose & Legal Basis</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Administrere leieforhold</strong> — oppfyllelse av avtale, GDPR art. 6(1)(b)</li>
                  <li><strong>Behandle vedlikeholdssaker</strong> — oppfyllelse av avtale, GDPR art. 6(1)(b)</li>
                  <li><strong>Varsler om statusendringer</strong> — berettiget interesse, GDPR art. 6(1)(f)</li>
                  <li><strong>Kunngjøringer til leietakere</strong> — berettiget interesse, GDPR art. 6(1)(f)</li>
                  <li><strong>Dokumentdeling</strong> — oppfyllelse av avtale, GDPR art. 6(1)(b)</li>
                  <li><strong>Sikkerhet og tilgangskontroll</strong> — berettiget interesse, GDPR art. 6(1)(f)</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-gray-600 mb-1">4. Databehandlere og tredjeparter / Third-Party Processors</p>
                <p className="mb-1">Vi benytter følgende underleverandører som behandler personopplysninger på våre vegne. Alle er bundet av databehandleravtaler:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>MongoDB Atlas</strong> (MongoDB Inc., USA) — databaselagring</li>
                  <li><strong>Cloudinary</strong> (Cloudinary Ltd., USA) — lagring av bilder og filer</li>
                  <li><strong>SendGrid / Twilio</strong> (Twilio Inc., USA) — utsending av e-post og SMS-varsler</li>
                  <li><strong>Render</strong> (Render Services Inc., USA) — hosting av serverapplikasjon</li>
                  <li><strong>Vercel</strong> (Vercel Inc., USA) — hosting av nettstedet</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-gray-600 mb-1">5. Overføring til tredjeland / International Data Transfers</p>
                <p>Alle ovennevnte leverandører er lokalisert i USA. Overføring skjer på grunnlag av EUs standardkontraktklausuler (Standard Contractual Clauses, SCCs) i henhold til GDPR art. 46(2)(c), som sikrer et tilstrekkelig beskyttelsesnivå for dine personopplysninger.<br/>
                <span className="text-gray-400">All processors above are US-based. Transfers occur under EU Standard Contractual Clauses (GDPR Art. 46(2)(c)).</span></p>
              </div>

              <div>
                <p className="font-semibold text-gray-600 mb-1">6. Lagringstid / Data Retention</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Kontoopplysninger: så lenge leieforholdet er aktivt + 3 år</li>
                  <li>Vedlikeholdssaker (løste): slettes automatisk 7 dager etter løsning</li>
                  <li>Meldinger og kommunikasjonslogg: 3 år etter leieforholdets avslutning</li>
                  <li>Regnskapsrelevante opplysninger: 5 år jf. regnskapsloven § 13</li>
                  <li>Sikkerhetslogs: 90 dager</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-gray-600 mb-1">7. Informasjonskapsler og lokal lagring / Cookies & Local Storage</p>
                <p>Portalen benytter <strong>sessionStorage</strong> og <strong>localStorage</strong> i nettleseren for å lagre innloggingstoken, språkvalg og leste varsler. Det benyttes ingen tredjeparts sporingskapsler. Disse dataene forlater ikke din enhet.<br/>
                <span className="text-gray-400">The portal uses browser sessionStorage and localStorage for login tokens and preferences. No third-party tracking cookies are used.</span></p>
              </div>

              <div>
                <p className="font-semibold text-gray-600 mb-1">8. Sikkerhet / Security</p>
                <p>Passord krypteres med bcrypt. Kommunikasjon mellom nettleser og server er kryptert med TLS/HTTPS. Tilgang er begrenset til autoriserte brukere med rollebasert tilgangskontroll. Vi iverksetter tekniske og organisatoriske tiltak i samsvar med GDPR art. 32.</p>
              </div>

              <div>
                <p className="font-semibold text-gray-600 mb-1">9. Automatiserte avgjørelser / Automated Decision-Making</p>
                <p>Vi foretar ingen automatiserte avgjørelser eller profilering som har rettslig eller tilsvarende vesentlig virkning for deg, jf. GDPR art. 22.<br/>
                <span className="text-gray-400">We do not carry out automated decision-making or profiling with legal or similarly significant effects.</span></p>
              </div>

              <div>
                <p className="font-semibold text-gray-600 mb-1">10. Dine rettigheter / Your Rights</p>
                <p className="mb-1">I henhold til GDPR har du følgende rettigheter:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Innsyn</strong> (art. 15) — rett til å se hvilke opplysninger vi har om deg</li>
                  <li><strong>Retting</strong> (art. 16) — rett til å korrigere feilaktige opplysninger</li>
                  <li><strong>Sletting</strong> (art. 17) — rett til å kreve sletting («retten til å bli glemt»)</li>
                  <li><strong>Begrensning</strong> (art. 18) — rett til å begrense behandlingen</li>
                  <li><strong>Dataportabilitet</strong> (art. 20) — rett til å motta dine data i maskinlesbart format</li>
                  <li><strong>Innsigelse</strong> (art. 21) — rett til å protestere mot behandling basert på berettiget interesse</li>
                  <li><strong>Trekke samtykke</strong> — der behandling er basert på samtykke, kan dette trekkes tilbake når som helst</li>
                </ul>
                <p className="mt-1">For å utøve dine rettigheter, kontakt oss på <span className="text-emerald-600">sameer@superstay.no</span>. Vi besvarer henvendelser innen 30 dager jf. GDPR art. 12.</p>
              </div>

              <div>
                <p className="font-semibold text-gray-600 mb-1">11. Klagerett / Right to Lodge a Complaint</p>
                <p>Du har rett til å klage til <strong>Datatilsynet</strong> dersom du mener vi behandler dine personopplysninger i strid med personvernregelverket.<br/>
                Datatilsynet — <span className="text-emerald-600">www.datatilsynet.no</span> — tlf. 74 07 70 00</p>
              </div>

              <div>
                <p className="font-semibold text-gray-600 mb-1">12. Endringer i personvernerklæringen / Policy Updates</p>
                <p>Ved vesentlige endringer vil leietakere varsles via e-post eller portal. Gjeldende versjon er alltid tilgjengelig på innloggingssiden.<br/>
                <span className="text-gray-400">Tenants will be notified of material changes via email or portal. The current version is always available on the login page.</span></p>
                <p className="mt-1 text-gray-400">Sist oppdatert / Last updated: {new Date().toLocaleDateString('no-NO', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>

            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
