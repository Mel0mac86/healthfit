import { dateKey } from './calc.js';
import { DEFAULT_ROUTINES } from './data.js';

const KEY = 'healthfit:v1';
const VERSION = 1;

export function emptyState() {
  return {
    version: VERSION,
    profile: null,
    foods: [],          // alimenti personalizzati
    recent: [],         // id alimenti usati di recente
    days: {},           // 'YYYY-MM-DD' -> giorno
    weights: [],        // { date, kg }
    customExercises: [],
    routines: structuredClone(DEFAULT_ROUTINES),
    workouts: [],
    active: null,       // allenamento in corso
    settings: { theme: 'auto', restSec: 90 },
    lastHealthSync: null,
  };
}

export function emptyDay() {
  return { meals: { colazione: [], pranzo: [], cena: [], spuntini: [] }, waterMl: 0, steps: 0, cardio: [], health: null };
}

const arr = (v) => (Array.isArray(v) ? v : []);
const str = (v, max = 120) => String(v ?? '').slice(0, max);
const numOr = (v, d = 0) => (Number.isFinite(Number(v)) && v !== '' && v !== null ? Number(v) : d);
const isKey = (k) => /^\d{4}-\d{2}-\d{2}$/.test(k);

// Normalizza la struttura (anche di un backup importato): niente campi mancanti, tipi giusti,
// date valide. Così nessun dato inatteso arriva al rendering.
function migrate(s) {
  if (!s || typeof s !== 'object') throw new Error('dati non validi');
  const base = emptyState();
  const days = {};
  for (const [k, d] of Object.entries(s.days && typeof s.days === 'object' ? s.days : {})) {
    if (!isKey(k) || !d || typeof d !== 'object') continue;
    const meals = emptyDay().meals;
    for (const m of Object.keys(meals)) {
      meals[m] = arr(d.meals?.[m]).filter((e) => e && typeof e === 'object').map((e) => ({
        id: str(e.id || uid(), 40), foodId: str(e.foodId, 40), name: str(e.name, 80), grams: numOr(e.grams),
        kcal: numOr(e.kcal), p: numOr(e.p), c: numOr(e.c), f: numOr(e.f),
      }));
    }
    days[k] = {
      meals, waterMl: Math.max(0, numOr(d.waterMl)), steps: Math.max(0, numOr(d.steps)),
      cardio: arr(d.cardio).filter(Boolean).map((c) => ({ id: str(c.id || uid(), 40), name: str(c.name, 80), min: numOr(c.min), kcal: numOr(c.kcal) })),
      health: d.health && typeof d.health === 'object' ? { activeKcal: numOr(d.health.activeKcal), at: numOr(d.health.at) } : null,
    };
  }
  const sets = (ex) => arr(ex.sets).filter(Boolean).map((x) => ({ kg: x.kg === '' ? '' : numOr(x.kg), reps: x.reps === '' ? '' : numOr(x.reps), target: x.target, done: !!x.done }));
  const exercises = (w) => arr(w.exercises).filter(Boolean).map((ex) => ({ name: str(ex.name, 80), sets: sets(ex) }));
  return {
    ...base,
    profile: s.profile && typeof s.profile === 'object' ? { ...s.profile, name: str(s.profile.name, 30) } : null,
    foods: arr(s.foods).filter((f) => f && f.id).map((f) => ({ id: str(f.id, 40), name: str(f.name, 80), kcal: numOr(f.kcal), p: numOr(f.p), c: numOr(f.c), f: numOr(f.f), g: numOr(f.g, 100), cat: str(f.cat, 40) })),
    recent: arr(s.recent).map((id) => str(id, 40)),
    days,
    weights: arr(s.weights).filter((w) => w && isKey(w.date) && numOr(w.kg) > 0).map((w) => ({ date: w.date, kg: numOr(w.kg) })).sort((a, b) => a.date.localeCompare(b.date)),
    customExercises: arr(s.customExercises).filter((e) => e && e.name).map((e) => ({ name: str(e.name, 80), muscle: str(e.muscle, 20), equip: str(e.equip || 'Personalizzato', 30) })),
    routines: 'routines' in s ? arr(s.routines).filter((r) => r && r.id).map((r) => ({ id: str(r.id, 40), name: str(r.name, 60), exercises: arr(r.exercises).filter(Boolean).map((e) => ({ name: str(e.name, 80), sets: numOr(e.sets, 3), reps: numOr(e.reps, 10) })) })) : base.routines,
    workouts: arr(s.workouts).filter((w) => w && w.id && isKey(w.date)).map((w) => ({ id: str(w.id, 40), name: str(w.name, 60), date: w.date, startedAt: numOr(w.startedAt), durationSec: numOr(w.durationSec), routineId: w.routineId ?? null, kcal: w.kcal == null ? null : numOr(w.kcal), exercises: exercises(w) })),
    active: s.active && typeof s.active === 'object' && isKey(s.active.date) ? { ...s.active, id: str(s.active.id, 40), name: str(s.active.name, 60), startedAt: numOr(s.active.startedAt, Date.now()), exercises: exercises(s.active) } : null,
    lastHealthSync: numOr(s.lastHealthSync, 0) || null,
    settings: { ...base.settings, ...(s.settings && typeof s.settings === 'object' ? s.settings : {}) },
    version: VERSION,
  };
}

let memory = null; // se localStorage non è disponibile (navigazione privata), resta in memoria

export function load() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch { /* storage bloccato */ }
  if (raw) {
    try { return migrate(JSON.parse(raw)); } catch {
      // Dati danneggiati: li mettiamo da parte invece di sovrascriverli al primo salvataggio.
      try { localStorage.setItem(`${KEY}:danneggiato:${Date.now()}`, raw); } catch { /* pieno */ }
    }
  }
  return memory ? migrate(memory) : emptyState();
}

export function save(state) {
  memory = state;
  try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch { return false; }
}

export function day(state, key = dateKey()) {
  if (!state.days[key]) state.days[key] = emptyDay();
  return state.days[key];
}

// Lettura senza creare il giorno (per grafici e storico)
export function peekDay(state, key) {
  return state.days[key] || null;
}

export function validateImport(obj) {
  if (!obj || typeof obj !== 'object' || !obj.days || typeof obj.days !== 'object') throw new Error('Il file non è un backup di HealthFit');
  return migrate(obj);
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
