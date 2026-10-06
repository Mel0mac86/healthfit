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
  };
}

export function emptyDay() {
  return { meals: { colazione: [], pranzo: [], cena: [], spuntini: [] }, waterMl: 0, steps: 0, cardio: [] };
}

function migrate(s) {
  const base = emptyState();
  const out = { ...base, ...s, settings: { ...base.settings, ...(s.settings || {}) } };
  for (const k of Object.keys(out.days)) {
    const d = out.days[k];
    out.days[k] = { ...emptyDay(), ...d, meals: { ...emptyDay().meals, ...(d.meals || {}) } };
  }
  out.version = VERSION;
  return out;
}

let memory = null; // se localStorage non è disponibile (navigazione privata), resta in memoria

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch { /* storage bloccato o JSON corrotto */ }
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
  if (!obj || typeof obj !== 'object') throw new Error('File non valido');
  if (!('days' in obj) || typeof obj.days !== 'object') throw new Error('Il file non è un backup di HealthFit');
  return migrate(obj);
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
