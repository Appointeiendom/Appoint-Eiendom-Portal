import { useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

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

const SECTIONS = [
  { label: 'Fire Extinguisher', icon: '🧯', steps: [0, 4] },
  { label: 'Smoke Detector', icon: '🔔', steps: [5, 9] },
  { label: 'Stove Heat Detector', icon: '🍳', steps: [10, 14] },
];

function sectionOf(step) {
  if (step <= 4) return 0;
  if (step <= 9) return 1;
  return 2;
}

function ProgressBar({ step }) {
  const current = sectionOf(step);
  return (
    <div className="flex gap-3 mb-8">
      {SECTIONS.map((s, i) => (
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
  return (
    <div className="flex gap-3 mt-5">
      <button onClick={onYes}
        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl text-lg transition-colors shadow-sm">
        ✅ Yes
      </button>
      <button onClick={onNo}
        className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 font-bold py-4 rounded-2xl text-lg transition-colors">
        ❌ No
      </button>
    </div>
  );
}

function ReasonInput({ value, onChange, onContinue, label }) {
  return (
    <div className="mt-4 space-y-3">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
        Please describe why before continuing.
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
        Continue →
      </button>
    </div>
  );
}

function PhotoUpload({ label, file, preview, onChange, onNext, required }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">{label}</p>
      <label className={`block w-full border-2 border-dashed rounded-2xl cursor-pointer overflow-hidden transition-colors ${preview ? 'border-emerald-400' : 'border-gray-300 hover:border-emerald-400'}`}>
        {preview ? (
          <img src={preview} alt="preview" className="w-full h-52 object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <span className="text-4xl mb-2">📷</span>
            <span className="text-sm font-medium">Tap to take a photo</span>
            <span className="text-xs mt-1">Use camera or choose from gallery</span>
          </div>
        )}
        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onChange} />
      </label>
      {preview && (
        <button onClick={onNext}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl transition-colors">
          Next →
        </button>
      )}
      {!required && !preview && (
        <button onClick={onNext}
          className="w-full border border-gray-300 text-gray-500 hover:bg-gray-50 py-3 rounded-2xl text-sm transition-colors">
          Skip photo
        </button>
      )}
    </div>
  );
}

function BatteryStep({ item, onBeeped, onStillNo }) {
  return (
    <div className="space-y-5">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
        <p className="text-3xl mb-2">🔋</p>
        <p className="font-semibold text-amber-800">Please change the batteries</p>
        <p className="text-sm text-amber-700 mt-1">
          Replace the batteries in your {item}, then press the test button again.
        </p>
      </div>
      <p className="text-sm font-medium text-gray-700 text-center">Did it beep after changing batteries?</p>
      <div className="flex gap-3">
        <button onClick={onBeeped}
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl text-lg transition-colors">
          ✅ Yes, it beeped!
        </button>
        <button onClick={onStillNo}
          className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 font-bold py-4 rounded-2xl text-lg transition-colors">
          ❌ Still no beep
        </button>
      </div>
    </div>
  );
}

function NeedsInspectionNotice({ item, onContinue }) {
  return (
    <div className="space-y-5">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
        <p className="text-4xl mb-3">🚨</p>
        <p className="font-bold text-red-800 text-lg">This needs a physical inspection</p>
        <p className="text-sm text-red-700 mt-2">
          Your {item} did not respond even after changing batteries. We will arrange for a technician to check it. Please do not ignore this.
        </p>
      </div>
      <button onClick={onContinue}
        className="w-full bg-gray-700 hover:bg-gray-800 text-white font-semibold py-3 rounded-2xl transition-colors">
        Understood, continue →
      </button>
    </div>
  );
}

function SummaryItem({ label, icon, data, type }) {
  if (!data) return null;
  const lines = [];
  if (type === 'fireExt') {
    if (!data.present) lines.push({ text: `Not present: ${data.notPresentReason || '—'}`, color: 'text-amber-700' });
    else {
      lines.push({ text: `Pressure gauge: ${data.gaugeGreen ? '✅ Green' : `❌ Not green — ${data.gaugeReason || ''}`}`, color: data.gaugeGreen ? 'text-emerald-700' : 'text-red-700' });
      lines.push({ text: `Safety pin: ${data.pinIntact ? '✅ Intact' : `❌ Not intact — ${data.pinReason || ''}`}`, color: data.pinIntact ? 'text-emerald-700' : 'text-red-700' });
      lines.push({ text: data.photo ? '📷 Photo uploaded' : '📷 No photo', color: data.photo ? 'text-emerald-700' : 'text-gray-400' });
    }
  } else {
    if (!data.present) lines.push({ text: `Not present: ${data.notPresentReason || '—'}`, color: 'text-amber-700' });
    else if (data.needsInspection) lines.push({ text: '🚨 Needs physical inspection — no beep after battery change', color: 'text-red-700' });
    else {
      const beepSource = data.beeped ? 'on first test' : 'after battery change';
      lines.push({ text: `✅ Beeped ${beepSource}`, color: 'text-emerald-700' });
      lines.push({ text: data.photo ? '📷 Photo uploaded' : '📷 No photo', color: data.photo ? 'text-emerald-700' : 'text-gray-400' });
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
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState({
    fireExt: { present: null, notPresentReason: '', gaugeGreen: null, gaugeReason: '', pinIntact: null, pinReason: '', photo: null, preview: null },
    smokeDet: { present: null, notPresentReason: '', beeped: null, beepedAfter: null, needsInspection: false, photo: null, preview: null },
    stoveSensor: { present: null, notPresentReason: '', beeped: null, beepedAfter: null, needsInspection: false, photo: null, preview: null },
  });

  const go = (n) => setStep(n);
  const next = () => setStep(s => s + 1);
  const upd = (key, val) => setAnswers(a => ({ ...a, [key]: { ...a[key], ...val } }));
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
      toast.success('Inspection submitted! Thank you.');
      onComplete();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed. Please try again.');
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
            <h2 className="text-xl font-bold text-gray-800 mb-1">🧯 Fire Extinguisher Check</h2>
            <p className="text-sm text-gray-500 mb-5">Follow these steps before answering the questions below.</p>
            <ol className="space-y-3 mb-6">
              {[
                'Find your fire extinguisher in the unit.',
                'Check the pressure gauge — the needle must be in the GREEN zone.',
                'Check that the safety pin is in place and the seal is unbroken.',
                'Look for any visible damage, rust, or dents.',
                'Prepare to take a clear photo of the entire extinguisher including the gauge.',
              ].map((s, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-700">
                  <span className="shrink-0 w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-xs">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
            <button onClick={next} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl transition-colors">
              Start →
            </button>
          </>
        );

      case 1:
        return (
          <>
            <h2 className="text-lg font-bold text-gray-800 mb-1">🧯 Fire Extinguisher</h2>
            <p className="text-base text-gray-700 mt-3">Is a fire extinguisher present in your unit?</p>
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
                label="Why is there no fire extinguisher?"
                onContinue={() => go(5)}
              />
            )}
          </>
        );

      case 2:
        return (
          <>
            <h2 className="text-lg font-bold text-gray-800 mb-1">🧯 Fire Extinguisher</h2>
            <p className="text-sm text-gray-500 mb-3">Look at the circular pressure gauge on the front of the extinguisher.</p>
            <p className="text-base text-gray-700">Is the needle in the <strong>green zone</strong>?</p>
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
                label="Describe what you see on the gauge"
                onContinue={() => { upd('fireExt', { pinIntact: null }); go(3); }}
              />
            )}
          </>
        );

      case 3:
        return (
          <>
            <h2 className="text-lg font-bold text-gray-800 mb-1">🧯 Fire Extinguisher</h2>
            <p className="text-sm text-gray-500 mb-3">The safety pin is the small pin in the handle that prevents accidental discharge.</p>
            <p className="text-base text-gray-700">Is the <strong>safety pin and seal intact</strong>?</p>
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
                label="What is wrong with the pin or seal?"
                onContinue={() => go(4)}
              />
            )}
          </>
        );

      case 4:
        return (
          <>
            <h2 className="text-lg font-bold text-gray-800 mb-4">🧯 Fire Extinguisher — Photo</h2>
            <PhotoUpload
              label="Take a clear photo of the entire extinguisher, including the pressure gauge. Make sure it is in focus and well-lit."
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
            <h2 className="text-xl font-bold text-gray-800 mb-1">🔔 Smoke Detector Check</h2>
            <p className="text-sm text-gray-500 mb-5">Follow these steps before answering.</p>
            <ol className="space-y-3 mb-6">
              {[
                'Find your smoke detector — usually mounted on the ceiling.',
                'Stand safely below it (use a step stool if needed).',
                'Press and HOLD the test button until you hear a loud beep.',
                'If it does not beep, you will be asked to change the batteries.',
                'Take a photo of the detector after testing.',
              ].map((s, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-700">
                  <span className="shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-xs">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
            <button onClick={next} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 rounded-2xl transition-colors">
              Start →
            </button>
          </>
        );

      case 6:
        return (
          <>
            <h2 className="text-lg font-bold text-gray-800 mb-1">🔔 Smoke Detector</h2>
            <p className="text-base text-gray-700 mt-3">Is a smoke detector present in your unit?</p>
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
                label="Why is there no smoke detector?"
                onContinue={() => go(10)}
              />
            )}
          </>
        );

      case 7:
        return (
          <>
            <h2 className="text-lg font-bold text-gray-800 mb-1">🔔 Smoke Detector</h2>
            <p className="text-sm text-gray-500 mb-3">Press and hold the test button on your smoke detector for 3–5 seconds.</p>
            <p className="text-base text-gray-700">Did it <strong>beep</strong>?</p>
            <YNButtons
              onYes={() => { upd('smokeDet', { beeped: true }); go(9); }}
              onNo={() => { upd('smokeDet', { beeped: false }); go(8); }}
            />
          </>
        );

      case 8:
        return (
          <>
            <h2 className="text-lg font-bold text-gray-800 mb-4">🔔 Smoke Detector</h2>
            {smokeDet.beepedAfter === null ? (
              <BatteryStep
                item="smoke detector"
                onBeeped={() => { upd('smokeDet', { beepedAfter: true }); go(9); }}
                onStillNo={() => { upd('smokeDet', { beepedAfter: false, needsInspection: true }); go(10); }}
              />
            ) : null}
            {smokeDet.needsInspection && <NeedsInspectionNotice item="smoke detector" onContinue={() => go(10)} />}
          </>
        );

      case 9:
        return (
          <>
            <h2 className="text-lg font-bold text-gray-800 mb-4">🔔 Smoke Detector — Photo</h2>
            <PhotoUpload
              label="Take a clear photo of the smoke detector. Make sure the device is clearly visible and well-lit."
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
            <h2 className="text-xl font-bold text-gray-800 mb-1">🍳 Stove Heat Detector Check</h2>
            <p className="text-sm text-gray-500 mb-5">This detector is located near your stove and detects heat from fires.</p>
            <ol className="space-y-3 mb-6">
              {[
                'Find the heat detector near your stove or kitchen area.',
                'Press and HOLD the test button until you hear a beep.',
                'If it does not beep, you will be asked to change the batteries.',
                'Take a photo of the detector after testing.',
              ].map((s, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-700">
                  <span className="shrink-0 w-6 h-6 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center font-bold text-xs">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
            <button onClick={next} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl transition-colors">
              Start →
            </button>
          </>
        );

      case 11:
        return (
          <>
            <h2 className="text-lg font-bold text-gray-800 mb-1">🍳 Stove Heat Detector</h2>
            <p className="text-base text-gray-700 mt-3">Is a heat detector present near your stove?</p>
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
                label="Why is there no heat detector?"
                onContinue={() => go(15)}
              />
            )}
          </>
        );

      case 12:
        return (
          <>
            <h2 className="text-lg font-bold text-gray-800 mb-1">🍳 Stove Heat Detector</h2>
            <p className="text-sm text-gray-500 mb-3">Press and hold the test button on your heat detector for 3–5 seconds.</p>
            <p className="text-base text-gray-700">Did it <strong>beep</strong>?</p>
            <YNButtons
              onYes={() => { upd('stoveSensor', { beeped: true }); go(14); }}
              onNo={() => { upd('stoveSensor', { beeped: false }); go(13); }}
            />
          </>
        );

      case 13:
        return (
          <>
            <h2 className="text-lg font-bold text-gray-800 mb-4">🍳 Stove Heat Detector</h2>
            {stoveSensor.beepedAfter === null ? (
              <BatteryStep
                item="heat detector"
                onBeeped={() => { upd('stoveSensor', { beepedAfter: true }); go(14); }}
                onStillNo={() => { upd('stoveSensor', { beepedAfter: false, needsInspection: true }); go(15); }}
              />
            ) : null}
            {stoveSensor.needsInspection && <NeedsInspectionNotice item="heat detector" onContinue={() => go(15)} />}
          </>
        );

      case 14:
        return (
          <>
            <h2 className="text-lg font-bold text-gray-800 mb-4">🍳 Stove Heat Detector — Photo</h2>
            <PhotoUpload
              label="Take a clear photo of the heat detector near your stove."
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
            <h2 className="text-xl font-bold text-gray-800 mb-1">✅ Review & Submit</h2>
            <p className="text-sm text-gray-500 mb-5">Check your answers before submitting. Once submitted you cannot change them.</p>
            <div className="space-y-3 mb-6">
              <SummaryItem label="Fire Extinguisher" icon="🧯" data={fireExt} type="fireExt" />
              <SummaryItem label="Smoke Detector" icon="🔔" data={smokeDet} type="detector" />
              <SummaryItem label="Stove Heat Detector" icon="🍳" data={stoveSensor} type="detector" />
            </div>
            <button onClick={submit} disabled={submitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl transition-colors disabled:opacity-60 text-lg">
              {submitting ? 'Submitting…' : 'Submit Inspection ✅'}
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
        <div className="w-full max-w-lg mb-6 text-center">
          <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-4 py-1.5 rounded-full text-xs font-semibold mb-3">
            🔒 Required — Due {dueDate}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Annual Safety Inspection</h1>
          <p className="text-sm text-gray-500 mt-1">You must complete this inspection to access the portal.</p>
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
