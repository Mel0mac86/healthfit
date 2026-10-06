// Calcoli puri: nessun accesso al DOM o allo storage, così sono testabili.

export const ACTIVITY = {
  sedentario: { factor: 1.2, label: 'Sedentario (poco o nessun esercizio)' },
  leggero: { factor: 1.375, label: 'Leggero (1-3 allenamenti/settimana)' },
  moderato: { factor: 1.55, label: 'Moderato (3-5 allenamenti/settimana)' },
  attivo: { factor: 1.725, label: 'Attivo (6-7 allenamenti/settimana)' },
  molto: { factor: 1.9, label: 'Molto attivo (lavoro fisico + sport)' },
};

export const GOALS = {
  perdere: 'Perdere peso',
  mantenere: 'Mantenere il peso',
  aumentare: 'Aumentare massa',
};

// Variazione giornaliera di kcal per ritmo (kg/settimana): 1 kg ≈ 7700 kcal
export const RATES = { 0.25: 275, 0.5: 550, 0.75: 825, 1: 1100 };

// Mifflin-St Jeor
export function bmr({ sex, weightKg, heightCm, age }) {
  if (!weightKg || !heightCm || !age) return 0;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === 'F' ? base - 161 : base + 5);
}

export function tdee(profile) {
  const f = (ACTIVITY[profile.activity] || ACTIVITY.leggero).factor;
  return Math.round(bmr(profile) * f);
}

export function calorieTarget(profile) {
  if (profile.kcalOverride) return Math.round(profile.kcalOverride);
  const t = tdee(profile);
  if (!t) return 2000;
  const delta = RATES[profile.rate] ?? 550;
  const floor = profile.sex === 'F' ? 1200 : 1500;
  if (profile.goal === 'perdere') return Math.max(floor, Math.round((t - delta) / 10) * 10);
  if (profile.goal === 'aumentare') return Math.round((t + Math.min(delta, 550) / 2) / 10) * 10;
  return Math.round(t / 10) * 10;
}

// Ripartizione macro in % delle kcal. Default: proteine ~1.8 g/kg, grassi 27%, resto carboidrati.
export function macroSplit(profile, kcal = calorieTarget(profile)) {
  if (profile.macroPct) return { ...profile.macroPct };
  const proteinG = (profile.weightKg || 70) * (profile.goal === 'mantenere' ? 1.6 : 1.8);
  let p = Math.round((proteinG * 4 / kcal) * 100);
  p = Math.min(40, Math.max(15, p));
  const f = 27;
  return { p, c: 100 - p - f, f };
}

export function macroGrams(kcal, pct) {
  return {
    p: Math.round(kcal * pct.p / 100 / 4),
    c: Math.round(kcal * pct.c / 100 / 4),
    f: Math.round(kcal * pct.f / 100 / 9),
  };
}

export function bmi(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

export function bmiLabel(v) {
  if (v == null) return '';
  if (v < 18.5) return 'Sottopeso';
  if (v < 25) return 'Normopeso';
  if (v < 30) return 'Sovrappeso';
  return 'Obesità';
}

// Valori nutrizionali per una porzione di `grams` di un alimento definito per 100 g
export function portion(food, grams) {
  const k = (Number(grams) || 0) / 100;
  const r1 = (n) => Math.round(n * 10) / 10;
  return { kcal: Math.round(food.kcal * k), p: r1(food.p * k), c: r1(food.c * k), f: r1(food.f * k) };
}

export function sumEntries(entries) {
  const t = { kcal: 0, p: 0, c: 0, f: 0 };
  for (const e of entries) { t.kcal += e.kcal || 0; t.p += e.p || 0; t.c += e.c || 0; t.f += e.f || 0; }
  t.p = Math.round(t.p); t.c = Math.round(t.c); t.f = Math.round(t.f);
  return t;
}

// kcal da MET: MET × 3.5 × kg / 200 × minuti
export function metKcal(met, weightKg, minutes) {
  return Math.round(met * 3.5 * (weightKg || 70) / 200 * (Number(minutes) || 0));
}

// 1RM stimato (Epley)
export function oneRepMax(kg, reps) {
  kg = Number(kg); reps = Number(reps);
  if (!kg || !reps) return 0;
  if (reps === 1) return kg;
  return Math.round(kg * (1 + reps / 30) * 10) / 10;
}

export function workoutVolume(w) {
  let v = 0;
  for (const ex of w.exercises) for (const s of ex.sets) if (s.done) v += (Number(s.kg) || 0) * (Number(s.reps) || 0);
  return Math.round(v);
}

export function doneSets(w) {
  return w.exercises.reduce((n, ex) => n + ex.sets.filter((s) => s.done).length, 0);
}

// Stima kcal di un allenamento con i pesi: ~5 MET per il tempo effettivo
export function workoutKcal(w, weightKg) {
  const min = Math.min((w.durationSec || 0) / 60, 180);
  return metKcal(5, weightKg, min);
}

// Record personali per esercizio da una lista di allenamenti
export function personalRecords(workouts) {
  const pr = {};
  for (const w of workouts) {
    for (const ex of w.exercises) {
      for (const s of ex.sets) {
        if (!s.done || !Number(s.kg) || !Number(s.reps)) continue;
        const e1 = oneRepMax(s.kg, s.reps);
        const r = pr[ex.name] || (pr[ex.name] = { name: ex.name, maxKg: 0, best1rm: 0, date: w.date, maxReps: 0 });
        if (Number(s.kg) > r.maxKg) r.maxKg = Number(s.kg);
        if (Number(s.reps) > r.maxReps) r.maxReps = Number(s.reps);
        if (e1 > r.best1rm) { r.best1rm = e1; r.date = w.date; }
      }
    }
  }
  return Object.values(pr).sort((a, b) => b.best1rm - a.best1rm);
}

// Date locali in formato YYYY-MM-DD (niente UTC: il "giorno" è quello dell'utente)
export function dateKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, n) {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

// Giorni consecutivi (fino a oggi o ieri) con almeno un alimento registrato
export function streak(days, today = dateKey()) {
  const has = (k) => {
    const d = days[k];
    return d && Object.values(d.meals || {}).some((m) => m.length);
  };
  let k = has(today) ? today : addDays(today, -1);
  let n = 0;
  while (has(k)) { n++; k = addDays(k, -1); }
  return n;
}
