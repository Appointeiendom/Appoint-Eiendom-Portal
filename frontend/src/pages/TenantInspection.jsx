import { useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';

// ── SVG Guide Illustrations ───────────────────────────────────────────────────

function FireExtinguisherSVG() {
  return (
    <svg viewBox="0 0 220 300" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[180px] mx-auto drop-shadow-md">
      {/* Body */}
      <rect x="75" y="100" width="70" height="160" rx="35" fill="#DC2626"/>
      <rect x="75" y="100" width="70" height="30" rx="0" fill="#B91C1C"/>
      {/* Neck */}
      <rect x="90" y="68" width="40" height="38" rx="6" fill="#B91C1C"/>
      {/* Top valve / handle area */}
      <rect x="78" y="58" width="64" height="16" rx="8" fill="#991B1B"/>
      {/* Hose nozzle */}
      <path d="M142 66 Q175 50 178 80" fill="none" stroke="#374151" strokeWidth="5" strokeLinecap="round"/>
      <ellipse cx="179" cy="82" rx="6" ry="5" fill="#374151"/>
      {/* Trigger handle */}
      <rect x="82" y="108" width="56" height="10" rx="5" fill="#7F1D1D"/>
      {/* Safety PIN — gold */}
      <circle cx="110" cy="108" r="6" fill="#FBBF24" stroke="#D97706" strokeWidth="1.5"/>
      <line x1="110" y1="102" x2="110" y2="92" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="110" cy="91" r="3" fill="#D97706"/>
      {/* Label band */}
      <rect x="75" y="148" width="70" height="40" rx="4" fill="#EF4444" opacity="0.3"/>
      {/* Pressure gauge — white circle */}
      <circle cx="110" cy="210" r="26" fill="white" stroke="#E5E7EB" strokeWidth="2"/>
      {/* Gauge green zone (roughly 9 o'clock to 3 o'clock via top) */}
      <path d="M110 210 L110 185 A25 25 0 1 1 85 210 Z" fill="#BBF7D0"/>
      <path d="M110 210 L85 210 A25 25 0 0 1 110 185 Z" fill="#BBF7D0"/>
      {/* Gauge red zone (left) */}
      <path d="M110 210 L85 210 A25 25 0 0 0 95 232 Z" fill="#FCA5A5"/>
      {/* Gauge red zone (right) */}
      <path d="M110 210 L135 210 A25 25 0 0 1 125 232 Z" fill="#FCA5A5"/>
      {/* "G" and "R" labels */}
      <text x="110" y="193" textAnchor="middle" fontSize="8" fill="#166534" fontWeight="bold">GREEN</text>
      <text x="86" y="218" textAnchor="middle" fontSize="7" fill="#991B1B">R</text>
      <text x="134" y="218" textAnchor="middle" fontSize="7" fill="#991B1B">R</text>
      {/* Needle — pointing into green */}
      <line x1="110" y1="210" x2="110" y2="187" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="110" cy="210" r="3" fill="#374151"/>
      {/* ── RED ANNOTATION CIRCLE around gauge ── */}
      <circle cx="110" cy="210" r="32" fill="none" stroke="#DC2626" strokeWidth="3" strokeDasharray="6,3"/>
      {/* Arrow + label pointing to gauge */}
      <line x1="155" y1="195" x2="143" y2="205" stroke="#DC2626" strokeWidth="2" markerEnd="url(#arr)"/>
      <text x="157" y="192" fontSize="10" fill="#DC2626" fontWeight="bold">Check this</text>
      {/* Arrow marker */}
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#DC2626"/>
        </marker>
      </defs>
      {/* ── RED ANNOTATION CIRCLE around pin ── */}
      <circle cx="110" cy="100" r="16" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeDasharray="5,3"/>
      <text x="130" y="85" fontSize="9" fill="#DC2626" fontWeight="bold">Pin here</text>
      <line x1="128" y1="88" x2="120" y2="97" stroke="#DC2626" strokeWidth="1.5"/>
    </svg>
  );
}

function GaugeSVG() {
  return (
    <svg viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[200px] mx-auto">
      {/* Background */}
      <rect x="20" y="20" width="160" height="140" rx="16" fill="#F9FAFB" stroke="#E5E7EB" strokeWidth="2"/>
      {/* Gauge face */}
      <circle cx="100" cy="105" r="60" fill="white" stroke="#D1D5DB" strokeWidth="3"/>
      {/* Green zone arc */}
      <path d="M100 105 L48 105 A52 52 0 0 1 74 58 Z" fill="#DCFCE7"/>
      <path d="M100 105 L74 58 A52 52 0 0 1 126 58 Z" fill="#86EFAC"/>
      <path d="M100 105 L126 58 A52 52 0 0 1 152 105 Z" fill="#DCFCE7"/>
      {/* Red zones */}
      <path d="M100 105 L48 105 A52 52 0 0 0 74 152 Z" fill="#FEE2E2"/>
      <path d="M100 105 L152 105 A52 52 0 0 1 126 152 Z" fill="#FEE2E2"/>
      {/* Labels */}
      <text x="100" y="78" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#166534">GREEN ✓</text>
      <text x="62" y="138" textAnchor="middle" fontSize="9" fill="#991B1B">LOW</text>
      <text x="138" y="138" textAnchor="middle" fontSize="9" fill="#991B1B">HIGH</text>
      {/* Tick marks */}
      {[0,30,60,90,120,150,180].map((deg,i) => {
        const rad = ((deg - 90) * Math.PI) / 180;
        const x1 = 100 + 50 * Math.cos(rad), y1 = 105 + 50 * Math.sin(rad);
        const x2 = 100 + 42 * Math.cos(rad), y2 = 105 + 42 * Math.sin(rad);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#9CA3AF" strokeWidth="1.5"/>;
      })}
      {/* Needle pointing up (into green) */}
      <line x1="100" y1="105" x2="100" y2="60" stroke="#1F2937" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="100" cy="105" r="5" fill="#374151"/>
      {/* Red circle annotation */}
      <circle cx="100" cy="105" r="66" fill="none" stroke="#DC2626" strokeWidth="3" strokeDasharray="8,4"/>
      <text x="100" y="30" textAnchor="middle" fontSize="11" fill="#DC2626" fontWeight="bold">Needle must be in GREEN</text>
    </svg>
  );
}

function PinSVG() {
  return (
    <svg viewBox="0 0 220 160" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[200px] mx-auto">
      <rect x="10" y="10" width="200" height="140" rx="14" fill="#F9FAFB" stroke="#E5E7EB" strokeWidth="2"/>
      {/* Handle body */}
      <rect x="60" y="40" width="100" height="30" rx="15" fill="#B91C1C"/>
      {/* Trigger lever */}
      <rect x="75" y="60" width="70" height="14" rx="7" fill="#991B1B"/>
      {/* Pin ring */}
      <circle cx="110" cy="47" r="10" fill="none" stroke="#FBBF24" strokeWidth="4"/>
      {/* Pin rod */}
      <line x1="110" y1="37" x2="110" y2="20" stroke="#FBBF24" strokeWidth="4" strokeLinecap="round"/>
      <circle cx="110" cy="18" r="5" fill="#F59E0B"/>
      {/* Plastic seal */}
      <path d="M100 47 Q110 55 120 47" fill="none" stroke="#60A5FA" strokeWidth="2.5" strokeDasharray="3,2"/>
      <text x="130" y="30" fontSize="9" fill="#1D4ED8">Seal</text>
      {/* Red annotation circle around pin */}
      <circle cx="110" cy="40" r="22" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeDasharray="5,3"/>
      {/* Arrow + label */}
      <line x1="55" y1="30" x2="88" y2="38" stroke="#DC2626" strokeWidth="2" markerEnd="url(#arr2)"/>
      <text x="20" y="27" fontSize="10" fill="#DC2626" fontWeight="bold">Pin + seal</text>
      <text x="20" y="39" fontSize="9" fill="#DC2626">must be intact</text>
      <defs>
        <marker id="arr2" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#DC2626"/>
        </marker>
      </defs>
    </svg>
  );
}

function SmokeDetectorSVG() {
  return (
    <svg viewBox="0 0 220 200" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[180px] mx-auto">
      {/* Ceiling */}
      <rect x="0" y="0" width="220" height="22" fill="#E5E7EB"/>
      <text x="110" y="15" textAnchor="middle" fontSize="10" fill="#6B7280">ceiling</text>
      {/* Mount bracket */}
      <rect x="90" y="20" width="40" height="10" rx="3" fill="#D1D5DB"/>
      {/* Detector body — viewed from below (circle) */}
      <ellipse cx="110" cy="120" rx="70" ry="65" fill="white" stroke="#D1D5DB" strokeWidth="3"/>
      <ellipse cx="110" cy="120" rx="70" ry="65" fill="#F9FAFB"/>
      {/* Outer ring detail */}
      <ellipse cx="110" cy="120" rx="62" ry="58" fill="none" stroke="#E5E7EB" strokeWidth="2"/>
      {/* Vent slots */}
      {[-30,-15,0,15,30].map((offset,i) => (
        <rect key={i} x={107+offset-3} y="90" width="6" height="20" rx="3" fill="#E5E7EB"/>
      ))}
      {/* Test button in center */}
      <circle cx="110" cy="120" r="18" fill="#374151"/>
      <circle cx="110" cy="120" r="13" fill="#4B5563"/>
      <text x="110" y="124" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">TEST</text>
      {/* LED dot */}
      <circle cx="110" cy="152" r="4" fill="#EF4444"/>
      {/* ── RED ANNOTATION CIRCLE around button ── */}
      <circle cx="110" cy="120" r="26" fill="none" stroke="#DC2626" strokeWidth="3" strokeDasharray="6,3"/>
      {/* Arrow + label */}
      <line x1="155" y1="98" x2="136" y2="110" stroke="#DC2626" strokeWidth="2" markerEnd="url(#arr3)"/>
      <text x="157" y="95" fontSize="10" fill="#DC2626" fontWeight="bold">Press &amp; hold</text>
      <text x="157" y="107" fontSize="9" fill="#DC2626">this button</text>
      <defs>
        <marker id="arr3" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#DC2626"/>
        </marker>
      </defs>
    </svg>
  );
}

function HeatDetectorSVG() {
  return (
    <svg viewBox="0 0 220 210" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[180px] mx-auto">
      {/* Ceiling / wall context */}
      <rect x="0" y="0" width="220" height="22" fill="#E5E7EB"/>
      <text x="110" y="15" textAnchor="middle" fontSize="10" fill="#6B7280">near stove / kitchen</text>
      {/* Mount */}
      <rect x="90" y="20" width="40" height="10" rx="3" fill="#D1D5DB"/>
      {/* Body — slightly rectangular / square for heat detector */}
      <rect x="50" y="45" width="120" height="115" rx="30" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="3"/>
      <rect x="60" y="55" width="100" height="95" rx="24" fill="#F9FAFB" stroke="#E5E7EB" strokeWidth="2"/>
      {/* Heat vent slits */}
      {[-25,-10,5,20,35].map((offset,i) => (
        <rect key={i} x={107+offset-3} y="70" width="6" height="16" rx="3" fill="#E5E7EB"/>
      ))}
      {/* Test button */}
      <circle cx="110" cy="125" r="20" fill="#374151"/>
      <circle cx="110" cy="125" r="14" fill="#4B5563"/>
      <text x="110" y="129" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">TEST</text>
      {/* LED */}
      <circle cx="110" cy="152" r="4" fill="#F97316"/>
      {/* ── RED ANNOTATION CIRCLE around button ── */}
      <circle cx="110" cy="125" r="28" fill="none" stroke="#DC2626" strokeWidth="3" strokeDasharray="6,3"/>
      {/* Arrow + label */}
      <line x1="155" y1="105" x2="137" y2="117" stroke="#DC2626" strokeWidth="2" markerEnd="url(#arr4)"/>
      <text x="157" y="102" fontSize="10" fill="#DC2626" fontWeight="bold">Press &amp; hold</text>
      <text x="157" y="114" fontSize="9" fill="#DC2626">this button</text>
      <defs>
        <marker id="arr4" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#DC2626"/>
        </marker>
      </defs>
    </svg>
  );
}

// Step map:
// 0  fire ext instructions
// 1  fire ext: present?          YES→2  NO+reason→5
// 2  fire ext: gauge green?      YES→3  NO+reason→3
// 3  fire ext: pin intact?       YES→4  NO+reason→4
// 4  fire ext: photo             →5
// 5  smoke instructions
// 6  smoke: present?             YES→7  NO+reason→10
// 7  smoke: beep?                YES→9  NO→8
// 8  smoke: battery+beep again?  YES→9  NO(needsInspection)→10
// 9  smoke: photo                →10
// 10 stove instructions
// 11 stove: present?             YES→12 NO+reason→15
// 12 stove: beep?                YES→14 NO→13
// 13 stove: battery+beep again?  YES→14 NO(needsInspection)→15
// 14 stove: photo                →15
// 15 summary + submit

function sectionOf(step) {
  if (step <= 4) return 0;
  if (step <= 9) return 1;
  return 2;
}

function ProgressBar({ step }) {
  const { t } = useLanguage();
  const current = sectionOf(step);
  const sections = [
    { label: t('inspection.fireExt'), icon: '🧯' },
    { label: t('inspection.smokeDet'), icon: '🔔' },
    { label: t('inspection.stoveSensor'), icon: '🍳' },
  ];
  return (
    <div className="flex gap-3 mb-8">
      {sections.map((s, i) => (
        <div key={i} className="flex-1 text-center">
          <div className={`h-1.5 rounded-full mb-1.5 ${i < current ? 'bg-emerald-500' : i === current ? 'bg-emerald-400' : 'bg-gray-200'}`} />
          <span className={`text-xs font-medium ${i === current ? 'text-gray-800' : 'text-gray-400'}`}>
            {s.icon} {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function YNButtons({ onYes, onNo }) {
  const { t } = useLanguage();
  return (
    <div className="flex gap-3 mt-5">
      <button onClick={onYes}
        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl text-lg transition-colors shadow-sm">
        {t('inspection.yes')}
      </button>
      <button onClick={onNo}
        className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 font-bold py-4 rounded-2xl text-lg transition-colors">
        {t('inspection.no')}
      </button>
    </div>
  );
}

function ReasonInput({ value, onChange, onContinue, label }) {
  const { t } = useLanguage();
  return (
    <div className="mt-4 space-y-3">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
        {t('inspection.describeWhy')}
      </div>
      <textarea
        rows={3}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={label}
        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
      />
      <button onClick={onContinue}
        className="w-full bg-gray-700 hover:bg-gray-800 text-white font-semibold py-3 rounded-xl transition-colors">
        {t('inspection.continueBtn')}
      </button>
    </div>
  );
}

function PhotoUpload({ label, file, preview, onChange, onNext, required }) {
  const { t } = useLanguage();
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">{label}</p>
      <label className={`block w-full border-2 border-dashed rounded-2xl cursor-pointer overflow-hidden transition-colors ${preview ? 'border-emerald-400' : 'border-gray-300 hover:border-emerald-400'}`}>
        {preview ? (
          <img src={preview} alt="preview" className="w-full h-52 object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <span className="text-4xl mb-2">📷</span>
            <span className="text-sm font-medium">{t('inspection.takePhoto')}</span>
            <span className="text-xs mt-1">{t('inspection.useCamera')}</span>
          </div>
        )}
        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onChange} />
      </label>
      {preview && (
        <button onClick={onNext}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl transition-colors">
          {t('inspection.nextBtn')}
        </button>
      )}
      {!required && !preview && (
        <button onClick={onNext}
          className="w-full border border-gray-300 text-gray-500 hover:bg-gray-50 py-3 rounded-2xl text-sm transition-colors">
          {t('inspection.skipPhoto')}
        </button>
      )}
    </div>
  );
}

function BatteryStep({ item, onBeeped, onStillNo }) {
  const { t } = useLanguage();
  return (
    <div className="space-y-5">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
        <p className="text-3xl mb-2">🔋</p>
        <p className="font-semibold text-amber-800">{t('inspection.batteryTitle')}</p>
        <p className="text-sm text-amber-700 mt-1">{t('inspection.batteryBody')(item)}</p>
      </div>
      <p className="text-sm font-medium text-gray-700 text-center">{t('inspection.batteryQ')}</p>
      <div className="flex gap-3">
        <button onClick={onBeeped}
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl text-lg transition-colors">
          {t('inspection.yesBeep')}
        </button>
        <button onClick={onStillNo}
          className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 font-bold py-4 rounded-2xl text-lg transition-colors">
          {t('inspection.stillNo')}
        </button>
      </div>
    </div>
  );
}

function NeedsInspectionNotice({ item, onContinue }) {
  const { t } = useLanguage();
  return (
    <div className="space-y-5">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
        <p className="text-4xl mb-3">🚨</p>
        <p className="font-bold text-red-800 text-lg">{t('inspection.needsTitle')}</p>
        <p className="text-sm text-red-700 mt-2">{t('inspection.needsBody')(item)}</p>
      </div>
      <button onClick={onContinue}
        className="w-full bg-gray-700 hover:bg-gray-800 text-white font-semibold py-3 rounded-2xl transition-colors">
        {t('inspection.understood')}
      </button>
    </div>
  );
}

function SummaryItem({ label, icon, data, type }) {
  const { t } = useLanguage();
  if (!data) return null;
  const lines = [];
  if (type === 'fireExt') {
    if (!data.present) lines.push({ text: t('inspection.notPresent')(data.notPresentReason), color: 'text-amber-700' });
    else {
      lines.push({ text: `Pressure gauge: ${data.gaugeGreen ? t('inspection.gaugeOk') : t('inspection.gaugeNo')(data.gaugeReason)}`, color: data.gaugeGreen ? 'text-emerald-700' : 'text-red-700' });
      lines.push({ text: `Safety pin: ${data.pinIntact ? t('inspection.pinOk') : t('inspection.pinNo')(data.pinReason)}`, color: data.pinIntact ? 'text-emerald-700' : 'text-red-700' });
      lines.push({ text: data.photo ? t('inspection.photoUploaded') : t('inspection.noPhoto'), color: data.photo ? 'text-emerald-700' : 'text-gray-400' });
    }
  } else {
    if (!data.present) lines.push({ text: t('inspection.notPresent')(data.notPresentReason), color: 'text-amber-700' });
    else if (data.needsInspection) lines.push({ text: t('inspection.needsPhysical'), color: 'text-red-700' });
    else {
      const beepSrc = data.beeped ? t('inspection.beepSrcFirst') : t('inspection.beepSrcAfter');
      lines.push({ text: t('inspection.beepFirst')(beepSrc), color: 'text-emerald-700' });
      lines.push({ text: data.photo ? t('inspection.photoUploaded') : t('inspection.noPhoto'), color: data.photo ? 'text-emerald-700' : 'text-gray-400' });
    }
  }
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <p className="font-semibold text-gray-800 mb-2">{icon} {label}</p>
      {lines.map((l, i) => <p key={i} className={`text-sm ${l.color}`}>{l.text}</p>)}
    </div>
  );
}

export default function TenantInspection({ inspection, onComplete }) {
  const { t, lang, toggleLang } = useLanguage();
  const [step, setStep] = useState(0);
  const [stepHistory, setStepHistory] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState({
    fireExt: { present: null, notPresentReason: '', gaugeGreen: null, gaugeReason: '', pinIntact: null, pinReason: '', photo: null, preview: null },
    smokeDet: { present: null, notPresentReason: '', beeped: null, beepedAfter: null, needsInspection: false, photo: null, preview: null },
    stoveSensor: { present: null, notPresentReason: '', beeped: null, beepedAfter: null, needsInspection: false, photo: null, preview: null },
  });

  const upd = (key, val) => setAnswers(a => ({ ...a, [key]: { ...a[key], ...val } }));

  // Reset answer state when navigating back to a step so questions re-appear
  const stepResets = {
    1: () => setAnswers(a => ({ ...a, fireExt: { ...a.fireExt, present: null, notPresentReason: '' } })),
    2: () => setAnswers(a => ({ ...a, fireExt: { ...a.fireExt, gaugeGreen: null, gaugeReason: '' } })),
    3: () => setAnswers(a => ({ ...a, fireExt: { ...a.fireExt, pinIntact: null, pinReason: '' } })),
    4: () => setAnswers(a => ({ ...a, fireExt: { ...a.fireExt, photo: null, preview: null } })),
    6: () => setAnswers(a => ({ ...a, smokeDet: { ...a.smokeDet, present: null, notPresentReason: '' } })),
    7: () => setAnswers(a => ({ ...a, smokeDet: { ...a.smokeDet, beeped: null } })),
    8: () => setAnswers(a => ({ ...a, smokeDet: { ...a.smokeDet, beepedAfter: null, needsInspection: false } })),
    9: () => setAnswers(a => ({ ...a, smokeDet: { ...a.smokeDet, photo: null, preview: null } })),
    11: () => setAnswers(a => ({ ...a, stoveSensor: { ...a.stoveSensor, present: null, notPresentReason: '' } })),
    12: () => setAnswers(a => ({ ...a, stoveSensor: { ...a.stoveSensor, beeped: null } })),
    13: () => setAnswers(a => ({ ...a, stoveSensor: { ...a.stoveSensor, beepedAfter: null, needsInspection: false } })),
    14: () => setAnswers(a => ({ ...a, stoveSensor: { ...a.stoveSensor, photo: null, preview: null } })),
  };

  const go = (n) => { setStepHistory(h => [...h, step]); setStep(n); };
  const next = () => { setStepHistory(h => [...h, step]); setStep(s => s + 1); };
  const goBack = () => {
    if (stepHistory.length === 0) return;
    const prev = stepHistory[stepHistory.length - 1];
    setStepHistory(h => h.slice(0, -1));
    stepResets[prev]?.();
    setStep(prev);
  };
  const setPhoto = (key, file) => {
    const preview = URL.createObjectURL(file);
    upd(key, { photo: file, preview });
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const { fireExt, smokeDet, stoveSensor } = answers;
      const fd = new FormData();
      fd.append('fireExtinguisher', JSON.stringify({
        present: fireExt.present,
        notPresentReason: fireExt.notPresentReason,
        gaugeGreen: fireExt.gaugeGreen,
        gaugeReason: fireExt.gaugeReason,
        pinIntact: fireExt.pinIntact,
        pinReason: fireExt.pinReason,
      }));
      fd.append('smokeDetector', JSON.stringify({
        present: smokeDet.present,
        notPresentReason: smokeDet.notPresentReason,
        beeped: smokeDet.beeped,
        beepedAfterBattery: smokeDet.beepedAfter,
        needsInspection: smokeDet.needsInspection,
      }));
      fd.append('stoveSensor', JSON.stringify({
        present: stoveSensor.present,
        notPresentReason: stoveSensor.notPresentReason,
        beeped: stoveSensor.beeped,
        beepedAfterBattery: stoveSensor.beepedAfter,
        needsInspection: stoveSensor.needsInspection,
      }));
      if (fireExt.photo) fd.append('fireExtPhoto', fireExt.photo);
      if (smokeDet.photo) fd.append('smokeDetPhoto', smokeDet.photo);
      if (stoveSensor.photo) fd.append('stoveSensorPhoto', stoveSensor.photo);

      await api.post(`/inspections/${inspection._id}/respond`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(t('inspection.submitSuccess'));
      onComplete();
    } catch (err) {
      toast.error(err.response?.data?.message || t('inspection.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const { fireExt, smokeDet, stoveSensor } = answers;

  function renderStep() {
    switch (step) {
      // ─── FIRE EXTINGUISHER ───────────────────────────────────────
      case 0:
        return (
          <>
            <h2 className="text-xl font-bold text-gray-800 mb-1">{t('inspection.feIntroTitle')}</h2>
            <p className="text-sm text-gray-500 mb-4">{t('inspection.feIntroSub')}</p>
            <div className="bg-gray-50 rounded-2xl p-4 mb-5 flex justify-center">
              <FireExtinguisherSVG />
            </div>
            <ol className="space-y-3 mb-6">
              {t('inspection.feSteps').map((s, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-700">
                  <span className="shrink-0 w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-xs">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
            <button onClick={next} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl transition-colors">
              {t('inspection.startBtn')}
            </button>
          </>
        );

      case 1:
        return (
          <>
            <h2 className="text-lg font-bold text-gray-800 mb-1">🧯 {t('inspection.fireExt')}</h2>
            <p className="text-base text-gray-700 mt-3">{t('inspection.feQ1')}</p>
            {fireExt.present === null && (
              <YNButtons
                onYes={() => { upd('fireExt', { present: true }); go(2); }}
                onNo={() => upd('fireExt', { present: false })}
              />
            )}
            {fireExt.present === false && (
              <ReasonInput
                value={fireExt.notPresentReason}
                onChange={v => upd('fireExt', { notPresentReason: v })}
                label={t('inspection.feNoReason')}
                onContinue={() => go(5)}
              />
            )}
          </>
        );

      case 2:
        return (
          <>
            <h2 className="text-lg font-bold text-gray-800 mb-1">🧯 {t('inspection.fireExt')}</h2>
            <p className="text-sm text-gray-500 mb-3">{t('inspection.feGaugeSub')}</p>
            <div className="bg-gray-50 rounded-2xl p-3 mb-3 flex justify-center">
              <GaugeSVG />
            </div>
            <p className="text-base text-gray-700">{t('inspection.feGaugeQ')}</p>
            {fireExt.gaugeGreen === null && (
              <YNButtons
                onYes={() => { upd('fireExt', { gaugeGreen: true }); go(3); }}
                onNo={() => upd('fireExt', { gaugeGreen: false })}
              />
            )}
            {fireExt.gaugeGreen === false && (
              <ReasonInput
                value={fireExt.gaugeReason}
                onChange={v => upd('fireExt', { gaugeReason: v })}
                label={t('inspection.feGaugeReason')}
                onContinue={() => { upd('fireExt', { pinIntact: null }); go(3); }}
              />
            )}
          </>
        );

      case 3:
        return (
          <>
            <h2 className="text-lg font-bold text-gray-800 mb-1">🧯 {t('inspection.fireExt')}</h2>
            <p className="text-sm text-gray-500 mb-3">{t('inspection.fePinSub')}</p>
            <div className="bg-gray-50 rounded-2xl p-3 mb-3 flex justify-center">
              <PinSVG />
            </div>
            <p className="text-base text-gray-700">{t('inspection.fePinQ')}</p>
            {fireExt.pinIntact === null && (
              <YNButtons
                onYes={() => { upd('fireExt', { pinIntact: true }); go(4); }}
                onNo={() => upd('fireExt', { pinIntact: false })}
              />
            )}
            {fireExt.pinIntact === false && (
              <ReasonInput
                value={fireExt.pinReason}
                onChange={v => upd('fireExt', { pinReason: v })}
                label={t('inspection.fePinReason')}
                onContinue={() => go(4)}
              />
            )}
          </>
        );

      case 4:
        return (
          <>
            <h2 className="text-lg font-bold text-gray-800 mb-4">{t('inspection.fePhotoTitle')}</h2>
            <PhotoUpload
              label={t('inspection.fePhotoLabel')}
              file={fireExt.photo}
              preview={fireExt.preview}
              onChange={e => e.target.files[0] && setPhoto('fireExt', e.target.files[0])}
              onNext={() => go(5)}
              required={true}
            />
          </>
        );

      // ─── SMOKE DETECTOR ──────────────────────────────────────────
      case 5:
        return (
          <>
            <h2 className="text-xl font-bold text-gray-800 mb-1">{t('inspection.sdIntroTitle')}</h2>
            <p className="text-sm text-gray-500 mb-4">{t('inspection.sdIntroSub')}</p>
            <div className="bg-gray-50 rounded-2xl p-4 mb-5 flex justify-center">
              <SmokeDetectorSVG />
            </div>
            <ol className="space-y-3 mb-6">
              {t('inspection.sdSteps').map((s, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-700">
                  <span className="shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-xs">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
            <button onClick={next} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 rounded-2xl transition-colors">
              {t('inspection.startBtn')}
            </button>
          </>
        );

      case 6:
        return (
          <>
            <h2 className="text-lg font-bold text-gray-800 mb-1">🔔 {t('inspection.smokeDet')}</h2>
            <p className="text-base text-gray-700 mt-3">{t('inspection.sdQ1')}</p>
            {smokeDet.present === null && (
              <YNButtons
                onYes={() => { upd('smokeDet', { present: true }); go(7); }}
                onNo={() => upd('smokeDet', { present: false })}
              />
            )}
            {smokeDet.present === false && (
              <ReasonInput
                value={smokeDet.notPresentReason}
                onChange={v => upd('smokeDet', { notPresentReason: v })}
                label={t('inspection.sdNoReason')}
                onContinue={() => go(10)}
              />
            )}
          </>
        );

      case 7:
        return (
          <>
            <h2 className="text-lg font-bold text-gray-800 mb-1">🔔 {t('inspection.smokeDet')}</h2>
            <p className="text-sm text-gray-500 mb-3">{t('inspection.sdBeepSub')}</p>
            <div className="bg-gray-50 rounded-2xl p-3 mb-3 flex justify-center">
              <SmokeDetectorSVG />
            </div>
            <p className="text-base text-gray-700">{t('inspection.sdBeepQ')}</p>
            <YNButtons
              onYes={() => { upd('smokeDet', { beeped: true }); go(9); }}
              onNo={() => { upd('smokeDet', { beeped: false }); go(8); }}
            />
          </>
        );

      case 8:
        return (
          <>
            <h2 className="text-lg font-bold text-gray-800 mb-4">🔔 {t('inspection.smokeDet')}</h2>
            {smokeDet.beepedAfter === null ? (
              <BatteryStep
                item={t('inspection.smokeDet')}
                onBeeped={() => { upd('smokeDet', { beepedAfter: true }); go(9); }}
                onStillNo={() => { upd('smokeDet', { beepedAfter: false, needsInspection: true }); go(10); }}
              />
            ) : null}
            {smokeDet.needsInspection && <NeedsInspectionNotice item={t('inspection.smokeDet')} onContinue={() => go(10)} />}
          </>
        );

      case 9:
        return (
          <>
            <h2 className="text-lg font-bold text-gray-800 mb-4">{t('inspection.sdPhotoTitle')}</h2>
            <PhotoUpload
              label={t('inspection.sdPhotoLabel')}
              file={smokeDet.photo}
              preview={smokeDet.preview}
              onChange={e => e.target.files[0] && setPhoto('smokeDet', e.target.files[0])}
              onNext={() => go(10)}
              required={true}
            />
          </>
        );

      // ─── STOVE HEAT DETECTOR ─────────────────────────────────────
      case 10:
        return (
          <>
            <h2 className="text-xl font-bold text-gray-800 mb-1">{t('inspection.svIntroTitle')}</h2>
            <p className="text-sm text-gray-500 mb-4">{t('inspection.svIntroSub')}</p>
            <div className="bg-gray-50 rounded-2xl p-4 mb-5 flex justify-center">
              <HeatDetectorSVG />
            </div>
            <ol className="space-y-3 mb-6">
              {t('inspection.svSteps').map((s, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-700">
                  <span className="shrink-0 w-6 h-6 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center font-bold text-xs">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
            <button onClick={next} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl transition-colors">
              {t('inspection.startBtn')}
            </button>
          </>
        );

      case 11:
        return (
          <>
            <h2 className="text-lg font-bold text-gray-800 mb-1">🍳 {t('inspection.stoveSensor')}</h2>
            <p className="text-base text-gray-700 mt-3">{t('inspection.svQ1')}</p>
            {stoveSensor.present === null && (
              <YNButtons
                onYes={() => { upd('stoveSensor', { present: true }); go(12); }}
                onNo={() => upd('stoveSensor', { present: false })}
              />
            )}
            {stoveSensor.present === false && (
              <ReasonInput
                value={stoveSensor.notPresentReason}
                onChange={v => upd('stoveSensor', { notPresentReason: v })}
                label={t('inspection.svNoReason')}
                onContinue={() => go(15)}
              />
            )}
          </>
        );

      case 12:
        return (
          <>
            <h2 className="text-lg font-bold text-gray-800 mb-1">🍳 {t('inspection.stoveSensor')}</h2>
            <p className="text-sm text-gray-500 mb-3">{t('inspection.svBeepSub')}</p>
            <div className="bg-gray-50 rounded-2xl p-3 mb-3 flex justify-center">
              <HeatDetectorSVG />
            </div>
            <p className="text-base text-gray-700">{t('inspection.svBeepQ')}</p>
            <YNButtons
              onYes={() => { upd('stoveSensor', { beeped: true }); go(14); }}
              onNo={() => { upd('stoveSensor', { beeped: false }); go(13); }}
            />
          </>
        );

      case 13:
        return (
          <>
            <h2 className="text-lg font-bold text-gray-800 mb-4">🍳 {t('inspection.stoveSensor')}</h2>
            {stoveSensor.beepedAfter === null ? (
              <BatteryStep
                item={t('inspection.stoveSensor')}
                onBeeped={() => { upd('stoveSensor', { beepedAfter: true }); go(14); }}
                onStillNo={() => { upd('stoveSensor', { beepedAfter: false, needsInspection: true }); go(15); }}
              />
            ) : null}
            {stoveSensor.needsInspection && <NeedsInspectionNotice item={t('inspection.stoveSensor')} onContinue={() => go(15)} />}
          </>
        );

      case 14:
        return (
          <>
            <h2 className="text-lg font-bold text-gray-800 mb-4">{t('inspection.svPhotoTitle')}</h2>
            <PhotoUpload
              label={t('inspection.svPhotoLabel')}
              file={stoveSensor.photo}
              preview={stoveSensor.preview}
              onChange={e => e.target.files[0] && setPhoto('stoveSensor', e.target.files[0])}
              onNext={() => go(15)}
              required={true}
            />
          </>
        );

      // ─── SUMMARY ─────────────────────────────────────────────────
      case 15:
        return (
          <>
            <h2 className="text-xl font-bold text-gray-800 mb-1">{t('inspection.summaryTitle')}</h2>
            <p className="text-sm text-gray-500 mb-5">{t('inspection.summarySub')}</p>
            <div className="space-y-3 mb-6">
              <SummaryItem label={t('inspection.fireExt')} icon="🧯" data={fireExt} type="fireExt" />
              <SummaryItem label={t('inspection.smokeDet')} icon="🔔" data={smokeDet} type="detector" />
              <SummaryItem label={t('inspection.stoveSensor')} icon="🍳" data={stoveSensor} type="detector" />
            </div>
            <button onClick={submit} disabled={submitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl transition-colors disabled:opacity-60 text-lg">
              {submitting ? t('inspection.submitting') : t('inspection.submitBtn')}
            </button>
          </>
        );

      default:
        return null;
    }
  }

  const dueDate = new Date(inspection.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-50 to-gray-100 overflow-auto">
      <div className="min-h-full flex flex-col items-center py-8 px-4">
        {/* Header */}
        <div className="w-full max-w-lg mb-6">
          {/* Top bar: back + lang toggle */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={goBack}
              disabled={stepHistory.length === 0}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 disabled:opacity-0 disabled:pointer-events-none transition-all px-3 py-2 rounded-xl hover:bg-white"
            >
              <span className="text-lg leading-none">‹</span>
              {t('inspection.backBtn')}
            </button>
            <button
              onClick={toggleLang}
              className="text-xs font-semibold px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors shadow-sm"
            >
              {lang === 'no' ? '🇬🇧 EN' : '🇳🇴 NO'}
            </button>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-4 py-1.5 rounded-full text-xs font-semibold mb-3">
              {t('inspection.required')(dueDate)}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{t('inspection.title')}</h1>
            <p className="text-sm text-gray-500 mt-1">{t('inspection.subtitle')}</p>
          </div>
        </div>

        <div className="w-full max-w-lg">
          <ProgressBar step={step} />
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {renderStep()}
          </div>
        </div>
      </div>
    </div>
  );
}
