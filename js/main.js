import * as C from './calc.js';
import { FOODS, MEALS, EXERCISES, MUSCLES, CARDIO } from './data.js';
import * as S from './store.js';
import { lineChart, barChart, ring } from './charts.js';

let state = S.load();
const ui = {
  date: C.dateKey(),      // giorno aperto nel diario
  weightRange: 30,
  pick: null,             // { meal, date, food } nel modale alimenti
  exPick: null,           // { for: 'workout' | 'draft', muscle, q }
  draft: null,            // scheda in modifica
  rest: null,             // { endsAt, total }
};

const $ = (s, r = document) => r.querySelector(s);
const main = $('#main');
const dlg = $('#modal');

// ---------- utilità ----------

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n, d = 0) => Number(n || 0).toLocaleString('it-IT', { maximumFractionDigits: d, minimumFractionDigits: 0 });
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : NaN; };
const today = () => C.dateKey();

function dayLabel(key) {
  const t = today();
  if (key === t) return 'Oggi';
  if (key === C.addDays(t, -1)) return 'Ieri';
  if (key === C.addDays(t, 1)) return 'Domani';
  return C.parseKey(key).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
}
const shortDate = (key) => C.parseKey(key).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
const duration = (sec) => {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
};

function persist() {
  if (!S.save(state)) toast('Attenzione: il browser non permette di salvare. Esporta un backup.');
}
function commit() { persist(); render(); }

let toastTimer;
// regione live presente fin dall'avvio, così gli screen reader annunciano ogni messaggio
const live = document.createElement('div');
live.setAttribute('role', 'status');
live.setAttribute('aria-live', 'polite');
document.body.append(live);
function toast(msg, undo) {
  live.querySelectorAll('.toast').forEach((t) => t.remove());
  const el = document.createElement('div');
  el.className = 'toast row';
  el.innerHTML = `<span>${esc(msg)}</span>`;
  if (undo) {
    const b = document.createElement('button');
    b.className = 'btn sm ghost';
    b.style.color = 'inherit';
    b.textContent = 'Annulla';
    b.onclick = () => { undo(); el.remove(); };
    el.append(b);
  }
  live.append(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), undo ? 5000 : 2500);
}

// Icone disegnate per HealthFit (stile a linea, 24x24)
const ICONS = {
  logo: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/><path d="M7.5 11h2.5l1.2-2.2 1.8 4.4 1.2-2.2h2.3"/>',
  home: '<path d="M4 11.5 12 5l8 6.5"/><path d="M6 10v9h12v-9"/>',
  book: '<path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h10"/><path d="M9 8h5"/>',
  dumbbell: '<path d="M3 10v4M6 7v10M18 7v10M21 10v4M6 12h12"/>',
  chart: '<path d="M4 19h16"/><path d="M6 15l4-5 3 3 5-7"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1.2-3.6 4-5 7-5s5.8 1.4 7 5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>',
  left: '<path d="M15 6l-6 6 6 6"/>',
  right: '<path d="M9 6l6 6-6 6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  drop: '<path d="M12 4s6 6.5 6 10.5a6 6 0 0 1-12 0C6 10.5 12 4 12 4z"/>',
  steps: '<path d="M8 4c1.7 0 2.5 2 2.5 4.5S9.5 13 8 13s-2.5-2-2.5-4.5S6.3 4 8 4z"/><path d="M6 15.5h4V18a2 2 0 0 1-4 0z"/><path d="M16 7c1.7 0 2.5 2 2.5 4.5S17.5 16 16 16s-2.5-2-2.5-4.5S14.3 7 16 7z"/>',
  scale: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9 9.5a4 4 0 0 1 6 0l-2 2.5"/>',
  flame: '<path d="M12 21a6 6 0 0 0 6-6c0-4-3-6-4-10-1.5 2-2 3.5-2 5-1-1-2-1.5-2-3-2 2-4 4.5-4 8a6 6 0 0 0 6 6z"/>',
  timer: '<circle cx="12" cy="13" r="7"/><path d="M12 9v4l2.5 2M10 3h4"/>',
  copy: '<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M5 15V6a1 1 0 0 1 1-1h9"/>',
  up: '<path d="M6 15l6-6 6 6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>',
  play: '<path d="M8 5v14l11-7z"/>',
  watch: '<rect x="6" y="6" width="12" height="12" rx="3"/><path d="M9 6l1-3h4l1 3M9 18l1 3h4l1-3M12 9.5V12l1.5 1.5"/>',
};
const icon = (n, cls = 'icon') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;

// ---------- dati derivati ----------

function targets() {
  const p = state.profile || {};
  const kcal = C.calorieTarget(p);
  const pct = C.macroSplit(p, kcal);
  return { kcal, pct, g: C.macroGrams(kcal, pct), water: p.waterMl || 2000, steps: p.stepsGoal || 8000 };
}
const allEntries = (d) => Object.values(d.meals).flat();
const currentWeight = () => {
  const w = state.weights[state.weights.length - 1];
  return w ? w.kg : state.profile?.weightKg || 70;
};
function workoutsOn(key) { return state.workouts.filter((w) => w.date === key); }
const workoutKcal = (w) => w.kcal ?? C.workoutKcal(w, currentWeight());
// Con i dati di Salute (Apple Watch) l'esercizio è già misurato: si usa solo il bonus di energia attiva,
// altrimenti cardio + allenamenti registrati a mano.
function exerciseKcal(key) {
  const d = S.peekDay(state, key);
  if (d?.health) return C.activeEnergyBonus(state.profile || {}, d.health.activeKcal);
  const cardio = d ? d.cardio.reduce((s, c) => s + (c.kcal || 0), 0) : 0;
  const lifting = workoutsOn(key).reduce((s, w) => s + workoutKcal(w), 0);
  return cardio + lifting;
}
function totalsFor(key) {
  const d = S.peekDay(state, key);
  const food = d ? C.sumEntries(allEntries(d)) : { kcal: 0, p: 0, c: 0, f: 0 };
  const ex = exerciseKcal(key);
  const t = targets();
  return { food, ex, goal: t.kcal, remaining: t.kcal - food.kcal + ex, t, watch: !!d?.health };
}
const findFood = (id) => state.foods.find((f) => f.id === id) || FOODS.find((f) => f.id === id);
const allExercises = () => [...state.customExercises, ...EXERCISES];

function previousSets(name, excludeId) {
  for (let i = state.workouts.length - 1; i >= 0; i--) {
    const w = state.workouts[i];
    if (w.id === excludeId) continue;
    const ex = w.exercises.find((e) => e.name === name);
    if (ex) return ex.sets.filter((s) => s.done);
  }
  return [];
}

// Applica i dati arrivati dal Comando Rapido. I valori sostituiscono quelli del giorno
// (non si sommano), così importare due volte non raddoppia nulla.
function applyHealth({ date, values }) {
  const d = S.day(state, date);
  const done = [];
  if (values.steps != null) { d.steps = values.steps; done.push(`${fmt(values.steps)} passi`); }
  if (values.activeKcal != null) { d.health = { activeKcal: values.activeKcal, at: Date.now() }; done.push(`${fmt(values.activeKcal)} kcal attive`); }
  if (values.waterMl != null) { d.waterMl = values.waterMl; done.push(`${fmt(values.waterMl / 1000, 2)} L d'acqua`); }
  if (values.weightKg != null) { upsertWeight(date, values.weightKg); done.push(`${fmt(values.weightKg, 1)} kg`); }
  if (done.length) state.lastHealthSync = Date.now();
  return done;
}

function importHealth(text) {
  const res = C.parseHealthPayload(text, today());
  const done = applyHealth(res);
  if (!done.length) {
    toast(res.errors.length ? `Dati non validi: ${res.errors.join(', ')}` : 'Nessun dato da importare: controlla il Comando Rapido');
    return false;
  }
  persist();
  toast(`Da Salute (${dayLabel(res.date).toLowerCase()}): ${done.join(' · ')}`);
  return true;
}

function healthBaseUrl() { return `${location.origin}${location.pathname}#/importa?`; }

function upsertWeight(date, kg) {
  const i = state.weights.findIndex((w) => w.date === date);
  if (i >= 0) state.weights[i].kg = kg; else state.weights.push({ date, kg });
  state.weights.sort((a, b) => a.date.localeCompare(b.date));
  if (state.profile) state.profile.weightKg = state.weights[state.weights.length - 1].kg;
}

// ---------- componenti ----------

function macroBar(label, val, goal, color) {
  const pct = goal ? Math.min(100, (val / goal) * 100) : 0;
  return `<div class="macro">
    <div class="row between"><span>${label}</span><span class="num"><strong>${fmt(val)}</strong> / ${fmt(goal)} g</span></div>
    <div class="bar${val > goal * 1.1 ? ' over' : ''}" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="${goal}" aria-valuenow="${Math.round(val)}"><span style="width:${pct}%;background:${color}"></span></div>
  </div>`;
}

function calorieEquation(tt) {
  return `<dl class="eq">
    <dt>Obiettivo</dt><dd>${fmt(tt.goal)}</dd>
    <dt>Cibo</dt><dd>− ${fmt(tt.food.kcal)}</dd>
    <dt>${tt.watch ? 'Esercizio (Watch)' : 'Esercizio'}</dt><dd>+ ${fmt(tt.ex)}</dd>
    <dt class="total">Rimanenti</dt><dd class="total" style="color:${tt.remaining < 0 ? 'var(--danger)' : 'var(--text)'}">${fmt(tt.remaining)}</dd>
  </dl>`;
}

function waterCard(key) {
  const d = S.peekDay(state, key) || S.emptyDay();
  const goal = targets().water;
  const glasses = Math.max(8, Math.ceil(goal / 250));
  const full = Math.floor(d.waterMl / 250);
  return `<section class="card" aria-labelledby="water-h">
    <div class="card-head"><h3 id="water-h">${icon('drop')} Acqua</h3><span class="num"><strong>${fmt(d.waterMl / 1000, 2)}</strong> / ${fmt(goal / 1000, 1)} L</span></div>
    <div class="water-glasses" aria-hidden="true">${Array.from({ length: glasses }, (_, i) => `<span class="glass${i < full ? ' full' : ''}"></span>`).join('')}</div>
    <div class="row wrap">
      <button class="btn sm" data-action="water" data-ml="-250" data-date="${esc(key)}" aria-label="Togli 250 ml" ${d.waterMl <= 0 ? 'disabled' : ''}>${icon('minus')}</button>
      <button class="btn sm primary" data-action="water" data-ml="250" data-date="${esc(key)}">${icon('plus')} 250 ml</button>
      <button class="btn sm" data-action="water" data-ml="500" data-date="${esc(key)}">${icon('plus')} 500 ml</button>
    </div>
  </section>`;
}

function stepsCard(key) {
  const d = S.peekDay(state, key) || S.emptyDay();
  const goal = targets().steps;
  const pct = Math.min(100, (d.steps / goal) * 100);
  return `<section class="card" aria-labelledby="steps-h">
    <div class="card-head"><h3 id="steps-h">${icon('steps')} Passi</h3><span class="num"><strong>${fmt(d.steps)}</strong> / ${fmt(goal)}</span></div>
    <div class="bar" role="progressbar" aria-label="Passi" aria-valuemin="0" aria-valuemax="${goal}" aria-valuenow="${d.steps}"><span style="width:${pct}%"></span></div>
    <form class="row" data-form="steps" data-date="${esc(key)}">
      <label class="sr-only" for="steps-in-${key}">Passi di ${dayLabel(key)}</label>
      <input id="steps-in-${key}" name="steps" type="number" inputmode="numeric" min="0" max="200000" placeholder="Passi totali" value="${d.steps || ''}">
      <button class="btn">Salva</button>
    </form>
  </section>`;
}

function healthStrip(key) {
  const d = S.peekDay(state, key);
  if (!state.lastHealthSync) {
    return `<a class="card row" href="#/salute" style="text-decoration:none;color:inherit">${icon('watch')}<span class="grow"><strong>Collega Apple Watch</strong><br><span class="muted small">Passi, calorie attive e peso dall'app Salute</span></span>${icon('right')}</a>`;
  }
  return `<section class="card row wrap" aria-label="Apple Watch">${icon('watch')}
    <span class="grow small">${d?.health ? `<strong>${fmt(d.health.activeKcal)} kcal attive</strong> dal Watch` : '<strong>Nessun dato di oggi</strong> dal Watch'}<br>
    <span class="muted xs">Ultimo import: ${new Date(state.lastHealthSync).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></span>
    <button class="btn sm" data-action="health-paste">${icon('download')} Importa da Salute</button></section>`;
}

// ---------- viste ----------

function viewWelcome() {
  return `<section class="welcome">
      ${icon('logo')}
      <h1>Benvenuto in HealthFit</h1>
      <p class="muted">Calorie, allenamenti e progressi in un'unica app. I tuoi dati restano su questo dispositivo.</p>
    </section>
    <section class="card"><h2>Calcoliamo il tuo obiettivo</h2>${profileForm(true)}</section>`;
}

function viewOggi() {
  const key = today();
  const tt = totalsFor(key);
  const over = tt.remaining < 0;
  const last = state.workouts[state.workouts.length - 1];
  const lastW = state.weights[state.weights.length - 1];
  const hi = new Date().getHours();
  const hello = hi < 12 ? 'Buongiorno' : hi < 18 ? 'Buon pomeriggio' : 'Buonasera';
  return `<div class="page-title"><div><h1>${hello}${state.profile?.name ? ', ' + esc(state.profile.name) : ''}</h1>
      <p class="muted small">${C.parseKey(key).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div></div>

    <section class="card" aria-labelledby="cal-h">
      <div class="card-head"><h2 id="cal-h">Calorie</h2><a class="btn sm" href="#/diario" data-action="goto-diary" data-date="${esc(key)}">${icon('plus')} Registra</a></div>
      <div class="ring-wrap">
        <div class="ring">${ring(tt.food.kcal, tt.goal + tt.ex, { over })}
          <div class="center"><strong>${fmt(Math.abs(tt.remaining))}</strong><span class="muted small">${over ? 'in eccesso' : 'rimanenti'}</span></div>
        </div>
        ${calorieEquation(tt)}
      </div>
    </section>

    <section class="card" aria-labelledby="mac-h">
      <h2 id="mac-h">Macronutrienti</h2>
      ${macroBar('Proteine', tt.food.p, tt.t.g.p, 'var(--protein)')}
      ${macroBar('Carboidrati', tt.food.c, tt.t.g.c, 'var(--carbs)')}
      ${macroBar('Grassi', tt.food.f, tt.t.g.f, 'var(--fat)')}
    </section>

    <div class="grid2">${waterCard(key)}${stepsCard(key)}</div>
    ${healthStrip(key)}

    <div class="grid2">
      <section class="card" aria-labelledby="wt-h">
        <div class="card-head"><h3 id="wt-h">${icon('scale')} Peso</h3>${lastW ? `<span class="muted small">${dayLabel(lastW.date)}</span>` : ''}</div>
        <p class="stat num">${lastW ? fmt(lastW.kg, 1) : '—'} <small>kg</small></p>
        <form class="row" data-form="weight-quick">
          <label class="sr-only" for="wq">Peso di oggi in kg</label>
          <input id="wq" name="kg" type="number" inputmode="decimal" step="0.1" min="20" max="400" placeholder="Peso di oggi (kg)">
          <button class="btn">Salva</button>
        </form>
      </section>
      <section class="card" aria-labelledby="wk-h">
        <div class="card-head"><h3 id="wk-h">${icon('dumbbell')} Allenamento</h3></div>
        ${state.active
          ? `<p><strong>${esc(state.active.name)}</strong> in corso</p><a class="btn primary block" href="#/allenamento">${icon('play')} Riprendi</a>`
          : last
            ? `<p class="small"><span class="muted">Ultimo:</span> <strong>${esc(last.name)}</strong> · ${dayLabel(last.date)} · ${duration(last.durationSec)}</p><a class="btn primary block" href="#/allenamenti">${icon('play')} Inizia un allenamento</a>`
            : `<p class="muted small">Nessun allenamento registrato.</p><a class="btn primary block" href="#/allenamenti">${icon('play')} Inizia il primo</a>`}
      </section>
    </div>`;
}

function viewDiario() {
  const key = ui.date;
  const d = S.peekDay(state, key) || S.emptyDay();
  const tt = totalsFor(key);
  const y = S.peekDay(state, C.addDays(key, -1));
  const meals = MEALS.map((m) => {
    const list = d.meals[m.id];
    const tot = C.sumEntries(list);
    const canCopy = y && y.meals[m.id].length > 0;
    return `<section class="card" aria-labelledby="meal-${m.id}">
      <div class="card-head"><h2 id="meal-${m.id}">${m.label}</h2><span class="num"><strong>${fmt(tot.kcal)}</strong> kcal</span></div>
      ${list.length ? `<ul class="list">${list.map((e) => `<li>
          <div class="main"><div class="ellipsis">${esc(e.name)}</div><div class="muted xs num">${fmt(e.grams)} g · P ${fmt(e.p, 1)} · C ${fmt(e.c, 1)} · G ${fmt(e.f, 1)}</div></div>
          <span class="kcal">${fmt(e.kcal)}</span>
          <button class="btn ghost icon-btn sm" data-action="del-entry" data-meal="${m.id}" data-id="${esc(e.id)}" aria-label="Rimuovi ${esc(e.name)}">${icon('trash')}</button>
        </li>`).join('')}</ul>
        <p class="muted xs num">P ${fmt(tot.p)} g · C ${fmt(tot.c)} g · G ${fmt(tot.f)} g</p>` : ''}
      <div class="row wrap">
        <button class="btn sm primary" data-action="open-add-food" data-meal="${m.id}">${icon('plus')} Aggiungi alimento</button>
        ${canCopy ? `<button class="btn sm" data-action="copy-meal" data-meal="${m.id}">${icon('copy')} Copia da ieri</button>` : ''}
      </div>
    </section>`;
  }).join('');

  const ws = workoutsOn(key);
  const exItems = [
    ...d.cardio.map((c) => `<li><div class="main"><div>${esc(c.name)}</div><div class="muted xs">${fmt(c.min)} min</div></div><span class="kcal">${fmt(c.kcal)}</span>
      <button class="btn ghost icon-btn sm" data-action="del-cardio" data-id="${esc(c.id)}" aria-label="Rimuovi ${esc(c.name)}">${icon('trash')}</button></li>`),
    ...ws.map((w) => `<li><div class="main"><div>${esc(w.name)}</div><div class="muted xs">${duration(w.durationSec)} · stima</div></div><span class="kcal">${fmt(workoutKcal(w))}</span>
      <button class="btn ghost icon-btn sm" data-action="open-workout" data-id="${esc(w.id)}" aria-label="Dettagli ${esc(w.name)}">${icon('right')}</button></li>`),
  ];

  return `<h1 class="sr-only">Diario di ${dayLabel(key).toLowerCase()}</h1>
    <div class="datenav" role="group" aria-label="Giorno">
      <button class="btn ghost icon-btn" data-action="day" data-delta="-1" aria-label="Giorno precedente">${icon('left')}</button>
      <strong>${dayLabel(key)}</strong>
      ${key !== today() ? `<button class="btn ghost sm" data-action="day" data-delta="0">Oggi</button>` : ''}
      <button class="btn ghost icon-btn" data-action="day" data-delta="1" aria-label="Giorno successivo">${icon('right')}</button>
    </div>
    <section class="card" aria-label="Riepilogo calorie">${calorieEquation(tt)}
      <div class="row wrap small muted num"><span>P ${fmt(tt.food.p)}/${tt.t.g.p} g</span>·<span>C ${fmt(tt.food.c)}/${tt.t.g.c} g</span>·<span>G ${fmt(tt.food.f)}/${tt.t.g.f} g</span></div>
    </section>
    ${meals}
    <section class="card" aria-labelledby="ex-h">
      <div class="card-head"><h2 id="ex-h">${icon('flame')} Esercizio</h2><span class="num"><strong>${fmt(tt.ex)}</strong> kcal</span></div>
      ${d.health ? `<p class="small">${icon('watch')} <strong>${fmt(d.health.activeKcal)} kcal attive</strong> dal Watch.
        <span class="muted">Il tuo livello di attività ne prevede già ${fmt(C.tdee(state.profile) - C.bmr(state.profile))}: si aggiungono al budget le ${fmt(tt.ex)} in più.
        ${exItems.length ? 'Le attività qui sotto sono già incluse nei dati dell\'orologio.' : ''}</span></p>` : ''}
      ${exItems.length ? `<ul class="list">${exItems.join('')}</ul>` : d.health ? '' : '<p class="muted small">Nessuna attività. Le kcal bruciate si aggiungono al tuo budget.</p>'}
      <div class="row"><button class="btn sm primary" data-action="open-cardio">${icon('plus')} Aggiungi attività</button></div>
    </section>
    ${waterCard(key)}`;
}

function viewAllenamenti() {
  const prs = C.personalRecords(state.workouts).slice(0, 8);
  const hist = state.workouts.slice().reverse();
  return `<div class="page-title"><h1>Allenamenti</h1></div>
    ${state.active ? `<section class="card" style="border-color:var(--accent)">
      <div class="card-head"><h2>${esc(state.active.name)}</h2><span class="badge">in corso</span></div>
      <a class="btn primary block" href="#/allenamento">${icon('play')} Riprendi</a></section>` : ''}
    <section class="card" aria-labelledby="start-h">
      <div class="card-head"><h2 id="start-h">Inizia</h2></div>
      <button class="btn primary block" data-action="start-workout">${icon('play')} Allenamento libero</button>
      <div class="card-head"><h3>Le tue schede</h3><a class="btn sm" href="#/scheda/nuova">${icon('plus')} Nuova</a></div>
      ${state.routines.length ? `<ul class="list">${state.routines.map((r) => `<li>
        <div class="main"><div><strong>${esc(r.name)}</strong></div><div class="muted xs ellipsis">${r.exercises.map((e) => esc(e.name)).join(' · ') || 'Nessun esercizio'}</div></div>
        <a class="btn ghost icon-btn sm" href="#/scheda/${encodeURIComponent(r.id)}" aria-label="Modifica ${esc(r.name)}">${icon('edit')}</a>
        <button class="btn sm primary" data-action="start-workout" data-routine="${esc(r.id)}">Inizia</button>
      </li>`).join('')}</ul>` : '<p class="empty">Nessuna scheda. Creane una per partire più in fretta.</p>'}
    </section>
    <section class="card" aria-labelledby="pr-h">
      <h2 id="pr-h">${icon('trophy')} Record personali</h2>
      ${prs.length ? `<ul class="list">${prs.map((p) => `<li><div class="main"><div class="ellipsis">${esc(p.name)}</div><div class="muted xs">max ${fmt(p.maxKg, 1)} kg · ${shortDate(p.date)}</div></div><span class="kcal">${fmt(p.best1rm, 1)} kg <span class="muted xs">1RM</span></span></li>`).join('')}</ul>`
        : '<p class="empty">Completa delle serie con peso e ripetizioni per vedere i tuoi record.</p>'}
    </section>
    <section class="card" aria-labelledby="hist-h">
      <h2 id="hist-h">Storico</h2>
      ${hist.length ? `<ul class="list">${hist.map((w) => `<li>
        <button class="pick" data-action="open-workout" data-id="${esc(w.id)}">
          <div class="main"><div><strong>${esc(w.name)}</strong></div><div class="muted xs num">${dayLabel(w.date)} · ${duration(w.durationSec)} · ${C.doneSets(w)} serie · ${fmt(C.workoutVolume(w))} kg</div></div>
          ${icon('right')}
        </button></li>`).join('')}</ul>` : '<p class="empty">Ancora nessun allenamento.</p>'}
    </section>`;
}

function viewAllenamento() {
  const a = state.active;
  if (!a) { location.hash = '#/allenamenti'; return ''; }
  const cards = a.exercises.map((ex, ei) => {
    const prev = previousSets(ex.name, a.id);
    return `<section class="card ex-card" aria-label="${esc(ex.name)}">
      <div class="card-head"><h3 class="ellipsis">${esc(ex.name)}</h3>
        <div class="row">
          <button class="btn ghost icon-btn sm" data-action="ex-move" data-ex="${ei}" data-dir="-1" aria-label="Sposta su" ${ei === 0 ? 'disabled' : ''}>${icon('up')}</button>
          <button class="btn ghost icon-btn sm" data-action="ex-move" data-ex="${ei}" data-dir="1" aria-label="Sposta giù" ${ei === a.exercises.length - 1 ? 'disabled' : ''}>${icon('down')}</button>
          <button class="btn ghost icon-btn sm danger" data-action="ex-remove" data-ex="${ei}" aria-label="Rimuovi ${esc(ex.name)}">${icon('trash')}</button>
        </div></div>
      <table class="sets"><thead><tr><th>Serie</th><th>Prec.</th><th>kg</th><th>Rip.</th><th><span class="sr-only">Fatto</span></th></tr></thead><tbody>
      ${ex.sets.map((s, si) => {
        const p = prev[si];
        return `<tr class="${s.done ? 'done' : ''}">
          <td class="num"><strong>${si + 1}</strong></td>
          <td class="muted xs num">${p ? `${fmt(p.kg, 1)}×${p.reps}` : '—'}</td>
          <td><input type="number" inputmode="decimal" step="0.5" min="0" max="1000" aria-label="kg serie ${si + 1}" value="${s.kg}" placeholder="${p ? p.kg : ''}" data-input="set" data-ex="${ei}" data-set="${si}" data-field="kg"></td>
          <td><input type="number" inputmode="numeric" step="1" min="0" max="1000" aria-label="Ripetizioni serie ${si + 1}" value="${s.reps}" placeholder="${p ? p.reps : (s.target || '')}" data-input="set" data-ex="${ei}" data-set="${si}" data-field="reps"></td>
          <td><button class="check" data-action="set-done" data-ex="${ei}" data-set="${si}" aria-pressed="${!!s.done}" aria-label="Serie ${si + 1} completata">${icon('check')}</button></td>
        </tr>`;
      }).join('')}
      </tbody></table>
      <div class="row">
        <button class="btn sm" data-action="set-add" data-ex="${ei}">${icon('plus')} Serie</button>
        ${ex.sets.length > 1 ? `<button class="btn sm ghost" data-action="set-remove" data-ex="${ei}">${icon('minus')} Togli serie</button>` : ''}
      </div>
    </section>`;
  }).join('');
  return `<div class="page-title">
      <div class="grow"><label class="sr-only" for="wk-name">Nome allenamento</label>
        <input id="wk-name" type="text" maxlength="60" value="${esc(a.name)}" data-input="wk-name" style="font-weight:700;font-size:var(--fs-lg)">
        <p class="muted small num" style="margin-top:4px">${icon('timer')} <span id="elapsed">${duration((Date.now() - a.startedAt) / 1000)}</span> · ${C.doneSets(a)} serie fatte · ${fmt(C.workoutVolume(a))} kg</p></div>
    </div>
    ${cards || '<p class="empty">Aggiungi il primo esercizio.</p>'}
    <button class="btn block" data-action="open-ex-picker" data-for="workout">${icon('plus')} Aggiungi esercizio</button>
    <div class="row"><button class="btn danger grow" data-action="cancel-workout">Annulla</button><button class="btn primary grow" data-action="finish-workout">${icon('check')} Termina</button></div>`;
}

function viewScheda(id) {
  if (!ui.draft || ui.draft._for !== id) {
    const r = state.routines.find((x) => x.id === id);
    if (id !== 'nuova' && !r) { location.hash = '#/allenamenti'; return ''; }
    ui.draft = r ? { ...structuredClone(r), _for: id } : { id: 'r-' + S.uid(), name: '', exercises: [], _for: id };
  }
  const d = ui.draft;
  return `<form class="stack" data-form="routine">
    <div class="page-title"><h1>${id === 'nuova' ? 'Nuova scheda' : 'Modifica scheda'}</h1></div>
    <section class="card">
      <label class="field">Nome<input name="name" type="text" maxlength="50" required value="${esc(d.name)}" data-input="draft-name" placeholder="Es. Full body A"></label>
    </section>
    ${d.exercises.map((e, i) => `<section class="card"><div class="card-head"><h2 class="ellipsis" style="font-size:var(--fs-base)">${esc(e.name)}</h2>
        <div class="row">
          <button type="button" class="btn ghost icon-btn sm" data-action="draft-move" data-i="${i}" data-dir="-1" aria-label="Sposta su" ${i === 0 ? 'disabled' : ''}>${icon('up')}</button>
          <button type="button" class="btn ghost icon-btn sm" data-action="draft-move" data-i="${i}" data-dir="1" aria-label="Sposta giù" ${i === d.exercises.length - 1 ? 'disabled' : ''}>${icon('down')}</button>
          <button type="button" class="btn ghost icon-btn sm danger" data-action="draft-remove" data-i="${i}" aria-label="Rimuovi ${esc(e.name)}">${icon('trash')}</button>
        </div></div>
        <div class="form-grid">
          <label class="field">Serie<input type="number" min="1" max="20" value="${e.sets}" data-input="draft-ex" data-i="${i}" data-field="sets"></label>
          <label class="field">Ripetizioni<input type="number" min="1" max="100" value="${e.reps}" data-input="draft-ex" data-i="${i}" data-field="reps"></label>
        </div></section>`).join('')}
    <button type="button" class="btn block" data-action="open-ex-picker" data-for="draft">${icon('plus')} Aggiungi esercizio</button>
    <div class="row">
      ${id !== 'nuova' ? `<button type="button" class="btn danger" data-action="routine-delete">${icon('trash')} Elimina</button>` : ''}
      <a class="btn grow" href="#/allenamenti" data-action="draft-cancel">Annulla</a>
      <button class="btn primary grow">Salva scheda</button>
    </div>
  </form>`;
}

function viewProgressi() {
  const t = targets();
  const range = ui.weightRange;
  const from = range ? C.addDays(today(), -range) : '0000';
  const ws = state.weights.filter((w) => w.date >= from);
  const pts = ws.map((w) => ({ y: w.kg, label: shortDate(w.date) }));
  const delta = ws.length > 1 ? ws[ws.length - 1].kg - ws[0].kg : null;
  const bmiV = C.bmi(currentWeight(), state.profile?.heightCm);

  const last7 = Array.from({ length: 7 }, (_, i) => C.addDays(today(), i - 6));
  const wd = (k) => C.parseKey(k).toLocaleDateString('it-IT', { weekday: 'short' }).slice(0, 3);
  const calBars = last7.map((k) => ({ label: wd(k), v: totalsFor(k).food.kcal, overIsBad: true }));
  const stepBars = last7.map((k) => ({ label: wd(k), v: S.peekDay(state, k)?.steps || 0 }));
  const logged = calBars.filter((b) => b.v > 0);
  const avg = logged.length ? Math.round(logged.reduce((s, b) => s + b.v, 0) / logged.length) : 0;

  // allenamenti per settimana (lunedì come inizio)
  const monday = (k) => { const d = C.parseKey(k); const dow = (d.getDay() + 6) % 7; return C.addDays(k, -dow); };
  const thisMon = monday(today());
  const weeks = Array.from({ length: 8 }, (_, i) => C.addDays(thisMon, (i - 7) * 7));
  const wkBars = weeks.map((m) => ({ label: shortDate(m), v: state.workouts.filter((w) => monday(w.date) === m).length }));

  return `<div class="page-title"><h1>Progressi</h1></div>
    <section class="card" aria-labelledby="w-h">
      <div class="card-head"><h2 id="w-h">${icon('scale')} Peso</h2>
        <div class="seg" role="group" aria-label="Periodo">${[[30, '30 g'], [90, '90 g'], [365, '1 anno'], [0, 'Tutto']].map(([v, l]) => `<button data-action="w-range" data-v="${v}" aria-pressed="${range === v}">${l}</button>`).join('')}</div></div>
      ${delta !== null ? `<p class="small"><strong class="num" style="color:${(state.profile?.goal === 'aumentare' ? delta >= 0 : delta <= 0) ? 'var(--success)' : 'var(--danger)'}">${delta > 0 ? '+' : ''}${fmt(delta, 1)} kg</strong> <span class="muted">nel periodo</span></p>` : ''}
      ${lineChart(pts, { unit: 'kg', label: 'Andamento del peso' })}
      <form class="form-grid" data-form="weight">
        <label class="field">Data<input name="date" type="date" value="${today()}" max="${today()}" required></label>
        <label class="field">Peso (kg)<input name="kg" type="number" inputmode="decimal" step="0.1" min="20" max="400" required></label>
        <button class="btn primary" style="align-self:end">Aggiungi</button>
      </form>
      ${state.weights.length ? `<ul class="list">${state.weights.slice(-5).reverse().map((w) => `<li><div class="main">${dayLabel(w.date)}</div><span class="kcal">${fmt(w.kg, 1)} kg</span>
        <button class="btn ghost icon-btn sm" data-action="del-weight" data-date="${esc(w.date)}" aria-label="Elimina peso del ${shortDate(w.date)}">${icon('trash')}</button></li>`).join('')}</ul>` : ''}
    </section>
    <div class="grid2">
      <section class="card"><h3>BMI</h3><p class="stat num">${bmiV ?? '—'} <small>${C.bmiLabel(bmiV)}</small></p>
        <p class="muted xs">Indicatore generico: non tiene conto della massa muscolare.</p></section>
      <section class="card"><h3>Media calorie (7 g)</h3><p class="stat num">${avg ? fmt(avg) : '—'} <small>kcal / obiettivo ${fmt(t.kcal)}</small></p>
        <p class="muted xs">Calcolata sui giorni con almeno un pasto.</p></section>
    </div>
    <section class="card"><h2>${icon('flame')} Calorie ultimi 7 giorni</h2>${barChart(calBars, { goal: t.kcal, label: 'Calorie degli ultimi 7 giorni', unit: 'kcal' })}</section>
    <section class="card"><h2>${icon('steps')} Passi ultimi 7 giorni</h2>${barChart(stepBars, { goal: t.steps, label: 'Passi degli ultimi 7 giorni', unit: 'passi' })}</section>
    <section class="card"><h2>${icon('dumbbell')} Allenamenti per settimana</h2>${barChart(wkBars, { label: 'Allenamenti per settimana', unit: 'allenamenti' })}</section>`;
}

function profileForm(first = false) {
  const p = state.profile || { sex: 'M', activity: 'leggero', goal: 'perdere', rate: 0.5, waterMl: 2000, stepsGoal: 8000 };
  const opt = (obj, val) => Object.entries(obj).map(([k, v]) => `<option value="${k}" ${String(k) === String(val) ? 'selected' : ''}>${esc(typeof v === 'string' ? v : v.label)}</option>`).join('');
  const pct = p.macroPct || {};
  return `<form class="stack" data-form="profile" novalidate>
    <div class="form-grid">
      <label class="field">Nome (facoltativo)<input name="name" type="text" maxlength="30" value="${esc(p.name || '')}" autocomplete="given-name"></label>
      <label class="field">Sesso<select name="sex"><option value="M" ${p.sex === 'M' ? 'selected' : ''}>Uomo</option><option value="F" ${p.sex === 'F' ? 'selected' : ''}>Donna</option></select></label>
      <label class="field">Età<input name="age" type="number" inputmode="numeric" min="14" max="100" required value="${p.age || ''}"></label>
      <label class="field">Altezza (cm)<input name="heightCm" type="number" inputmode="numeric" min="120" max="230" required value="${p.heightCm || ''}"></label>
      <label class="field">Peso (kg)<input name="weightKg" type="number" inputmode="decimal" step="0.1" min="30" max="300" required value="${p.weightKg || ''}"></label>
      <label class="field">Attività quotidiana<select name="activity" aria-describedby="act-hint">${opt(C.ACTIVITY, p.activity)}</select><span class="hint" id="act-hint">Senza contare gli allenamenti: li registri a parte.</span></label>
      <label class="field">Obiettivo<select name="goal">${opt(C.GOALS, p.goal)}</select></label>
      <label class="field">Ritmo (kg/settimana)<select name="rate">${[0.25, 0.5, 0.75, 1].map((r) => `<option value="${r}" ${Number(p.rate) === r ? 'selected' : ''}>${fmt(r, 2)}</option>`).join('')}</select></label>
    </div>
    ${first ? '' : `<details><summary class="small" style="cursor:pointer;font-weight:600">Obiettivi personalizzati</summary>
      <div class="form-grid" style="margin-top:12px">
        <label class="field">Calorie al giorno<input name="kcalOverride" type="number" min="800" max="6000" value="${p.kcalOverride || ''}" placeholder="automatico"><span class="hint">Vuoto = calcolato</span></label>
        <label class="field">Proteine %<input name="pp" type="number" min="5" max="70" value="${pct.p ?? ''}" placeholder="auto"></label>
        <label class="field">Carboidrati %<input name="pc" type="number" min="5" max="80" value="${pct.c ?? ''}" placeholder="auto"></label>
        <label class="field">Grassi %<input name="pf" type="number" min="5" max="70" value="${pct.f ?? ''}" placeholder="auto"></label>
        <label class="field">Acqua (ml)<input name="waterMl" type="number" min="500" max="6000" step="250" value="${p.waterMl || 2000}"></label>
        <label class="field">Passi al giorno<input name="stepsGoal" type="number" min="1000" max="50000" step="500" value="${p.stepsGoal || 8000}"></label>
      </div></details>`}
    <p class="error-text" id="profile-error" role="alert"></p>
    <button class="btn primary">${first ? 'Calcola e inizia' : 'Salva profilo'}</button>
  </form>`;
}

function viewSalute() {
  const base = healthBaseUrl();
  const step = (n, html) => `<li><span class="badge" aria-hidden="true">${n}</span><div>${html}</div></li>`;
  return `<div class="page-title"><h1>Apple Watch e Salute</h1></div>
    <section class="card">
      <p>HealthFit non può leggere direttamente l'app Salute (è una web app). Un <strong>Comando Rapido</strong> di iPhone fa da ponte:
      legge passi, calorie attive e peso registrati dall'Apple Watch e li manda qui.</p>
      ${state.lastHealthSync ? `<p class="small muted">Ultimo import: ${new Date(state.lastHealthSync).toLocaleString('it-IT')}</p>` : ''}
      <div class="row wrap">
        <button class="btn primary" data-action="health-paste">${icon('download')} Importa da Salute</button>
        <button class="btn" data-action="health-manual">Incolla i dati a mano</button>
      </div>
    </section>
    <section class="card" aria-labelledby="sc-h">
      <h2 id="sc-h">Crea il Comando Rapido (una volta sola)</h2>
      <p class="small muted">Apri l'app <strong>Comandi</strong> su iPhone, tocca <strong>+</strong> e chiamalo “HealthFit”. Aggiungi queste azioni cercandole per nome:</p>
      <ol class="guide">
        ${step(1, '<strong>Trova campioni di Salute</strong>: Tipo <em>Passi</em>, Data di inizio <em>è oggi</em>, Raggruppa per <em>Giorno</em>.')}
        ${step(2, '<strong>Calcola statistiche</strong>: <em>Somma</em> dei campioni. Rinomina il risultato in <em>Passi</em>.')}
        ${step(3, 'Di nuovo <strong>Trova campioni di Salute</strong>: Tipo <em>Energia attiva</em>, Data di inizio <em>è oggi</em>, Raggruppa per <em>Giorno</em>.')}
        ${step(4, '<strong>Calcola statistiche</strong>: <em>Somma</em>. Rinomina in <em>Attive</em>.')}
        ${step(5, '(Facoltativo) <strong>Trova campioni di Salute</strong>: Tipo <em>Peso</em>, Data di inizio <em>è oggi</em>, Ordina per <em>Data di inizio</em> dalla più recente, Limite <em>1</em>. Rinomina in <em>Peso</em>.')}
        ${step(6, `<strong>Testo</strong>: incolla l'indirizzo qui sotto e, dopo ogni <code>=</code>, inserisci la variabile corrispondente.
          <code class="url">${esc(base)}passi=<b>Passi</b>&amp;attive=<b>Attive</b>&amp;peso=<b>Peso</b></code>
          <button class="btn sm" data-action="copy-base">${icon('copy')} Copia l'indirizzo</button>`)}
        ${step(7, `Ultima azione, a scelta:
          <ul class="small"><li><strong>Apri URL</strong> (Testo): se usi HealthFit <em>da Safari</em>, i dati entrano da soli.</li>
          <li><strong>Copia negli appunti</strong> (Testo): se hai HealthFit <em>sulla schermata Home</em>. Poi apri l'app e tocca “Importa da Salute”.</li></ul>
          <p class="muted xs">Su iPhone l'app installata sulla schermata Home e Safari hanno dati separati: per questo servono due varianti.</p>`)}
      </ol>
      <p class="small muted">Controlla la prima volta che passi e calorie coincidano con quelli dell'app Salute.</p>
    </section>
    <section class="card" aria-labelledby="auto-h">
      <h2 id="auto-h">Automatico ogni sera</h2>
      <p class="small">In <strong>Comandi → Automazione → Nuova automazione → Ora del giorno</strong> scegli per esempio le 21:30,
      seleziona <strong>Esegui immediatamente</strong> e il comando “HealthFit”. Puoi anche avviarlo dal Watch o con un widget.</p>
    </section>
    <section class="card" aria-labelledby="how-h">
      <h2 id="how-h">Come vengono usati i dati</h2>
      <ul class="small">
        <li><strong>Passi</strong> e <strong>peso</strong> sostituiscono quelli del giorno (importare due volte non raddoppia nulla).</li>
        <li><strong>Calorie attive</strong>: il tuo livello di attività ne prevede già una parte. Al budget si aggiungono solo quelle <em>in più</em>,
        e nei giorni con i dati del Watch le attività inserite a mano non vengono sommate di nuovo.</li>
      </ul>
    </section>`;
}

function viewProfilo() {
  if (!state.profile) return viewWelcome();
  const p = state.profile;
  const t = targets();
  return `<div class="page-title"><h1>Profilo</h1></div>
    <section class="card" aria-labelledby="tg-h">
      <h2 id="tg-h">Il tuo obiettivo</h2>
      <div class="grid2">
        <div><p class="muted xs">Metabolismo basale</p><p class="stat num">${fmt(C.bmr(p))} <small>kcal</small></p></div>
        <div><p class="muted xs">Fabbisogno (TDEE)</p><p class="stat num">${fmt(C.tdee(p))} <small>kcal</small></p></div>
        <div><p class="muted xs">Obiettivo giornaliero</p><p class="stat num" style="color:var(--accent)">${fmt(t.kcal)} <small>kcal</small></p></div>
        <div><p class="muted xs">Macro</p><p class="small num"><strong style="color:var(--protein)">P ${t.g.p} g</strong> · <strong style="color:var(--carbs)">C ${t.g.c} g</strong> · <strong style="color:var(--fat)">G ${t.g.f} g</strong></p><p class="muted xs">${t.pct.p}% · ${t.pct.c}% · ${t.pct.f}%</p></div>
      </div>
      <p class="muted xs">Stime con la formula di Mifflin-St Jeor. Non sono un parere medico: per esigenze di salute rivolgiti a un professionista.</p>
    </section>
    <section class="card"><h2>Dati personali</h2>${profileForm()}</section>
    <a class="card row" href="#/salute" style="text-decoration:none;color:inherit">${icon('watch')}<span class="grow"><strong>Apple Watch e Salute</strong><br><span class="muted small">${state.lastHealthSync ? 'Collegato tramite Comandi Rapidi' : 'Importa passi, calorie attive e peso'}</span></span>${icon('right')}</a>
    <section class="card" aria-labelledby="set-h">
      <h2 id="set-h">Impostazioni</h2>
      <div class="row between wrap"><span>Tema</span><div class="seg" role="group" aria-label="Tema">${[['auto', 'Automatico'], ['light', 'Chiaro'], ['dark', 'Scuro']].map(([v, l]) => `<button data-action="theme" data-v="${v}" aria-pressed="${state.settings.theme === v}">${l}</button>`).join('')}</div></div>
      <div class="row between wrap"><span>Recupero tra le serie</span><div class="seg" role="group" aria-label="Recupero">${[60, 90, 120, 180].map((v) => `<button data-action="rest-default" data-v="${v}" aria-pressed="${state.settings.restSec === v}">${v}s</button>`).join('')}</div></div>
    </section>
    <section class="card" aria-labelledby="data-h">
      <h2 id="data-h">I tuoi dati</h2>
      <p class="muted small">Tutto è salvato solo su questo dispositivo. Esporta un backup per non perderlo o per spostarlo su un altro telefono.</p>
      <div class="row wrap">
        <button class="btn" data-action="export">${icon('download')} Esporta backup</button>
        <label class="btn">${icon('upload')} Importa backup<input type="file" accept="application/json,.json" data-change="import" class="sr-only"></label>
        <button class="btn danger" data-action="reset">${icon('trash')} Cancella tutto</button>
      </div>
    </section>
    <p class="muted xs" style="text-align:center">HealthFit · versione 1.0</p>`;
}

// ---------- modali ----------

function openModal(title, body, { foot = '', form = '' } = {}) {
  const head = `<div class="modal-head"><h2 id="modal-title">${title}</h2><button type="button" class="btn ghost icon-btn" data-action="close-modal" aria-label="Chiudi">${icon('x')}</button></div>`;
  const inner = `${head}<div class="modal-body">${body}</div>${foot ? `<div class="modal-foot">${foot}</div>` : ''}`;
  dlg.innerHTML = form ? `<form class="modal-inner" data-form="${form}" novalidate>${inner}</form>` : `<div class="modal-inner">${inner}</div>`;
  if (!dlg.open) dlg.showModal();
  const f = dlg.querySelector('[autofocus]') || dlg.querySelector('input:not([type=hidden]),select');
  if (f && matchMedia('(pointer: fine)').matches) f.focus();
}
function closeModal() { if (dlg.open) dlg.close(); dlg.innerHTML = ''; }

function openHealthManual(msg = '') {
  openModal('Importa da Salute', `
    ${msg ? `<p class="small">${esc(msg)}</p>` : ''}
    <label class="field">Dati del Comando Rapido<textarea name="payload" rows="4" placeholder="passi=8500&amp;attive=520&amp;peso=80,4" autofocus></textarea>
      <span class="hint">Incolla il testo o l'indirizzo copiato dal Comando Rapido.</span></label>`,
  { form: 'health', foot: '<button class="btn primary">Importa</button>' });
}

function foodItem(f) {
  return `<button class="pick" data-action="pick-food" data-id="${esc(esc(f.id))}">
    <div class="main"><div class="ellipsis">${esc(f.name)}${f.id.startsWith('u-') ? ' <span class="badge">mio</span>' : ''}</div>
    <div class="muted xs num">${fmt(f.kcal)} kcal · P ${fmt(f.p, 1)} · C ${fmt(f.c, 1)} · G ${fmt(f.f, 1)} per 100 g</div></div>${icon('plus')}</button>`;
}

function foodResults(q) {
  const all = [...state.foods, ...FOODS];
  if (!q) {
    const recent = state.recent.map(findFood).filter(Boolean).slice(0, 8);
    return `${recent.length ? `<h3 class="small muted">Recenti</h3><div>${recent.map(foodItem).join('')}</div>` : ''}
      <h3 class="small muted">Tutti gli alimenti</h3><div>${all.map(foodItem).join('')}</div>`;
  }
  const words = norm(q).split(/\s+/).filter(Boolean);
  const hits = all.filter((f) => { const n = norm(f.name + ' ' + (f.cat || '')); return words.every((w) => n.includes(w)); });
  return hits.length ? hits.map(foodItem).join('')
    : `<div class="empty">Nessun alimento trovato per “${esc(q)}”.<br><button class="btn sm" style="margin-top:8px" data-action="new-food" data-name="${esc(q)}">${icon('plus')} Crea “${esc(q)}”</button></div>`;
}

function openAddFood(meal, q = '') {
  ui.pick = { meal, date: ui.date, food: null };
  const label = MEALS.find((m) => m.id === meal).label;
  openModal(`Aggiungi a ${label}`, `
    <label class="sr-only" for="food-q">Cerca alimento</label>
    <input id="food-q" type="search" placeholder="Cerca: pasta, pollo, yogurt…" autocomplete="off" data-input="food-q" value="${esc(q)}" autofocus>
    <button class="btn sm" data-action="new-food">${icon('plus')} Crea alimento personalizzato</button>
    <div id="food-results" aria-live="polite">${foodResults(q)}</div>`);
}

function portionPreview(food, grams) {
  const v = C.portion(food, grams);
  return `<div class="grid2" style="grid-template-columns:repeat(4,1fr);gap:8px;text-align:center">
    <div><p class="stat num" style="font-size:22px">${fmt(v.kcal)}</p><p class="muted xs">kcal</p></div>
    <div><p class="num" style="font-weight:700;color:var(--protein)">${fmt(v.p, 1)} g</p><p class="muted xs">Proteine</p></div>
    <div><p class="num" style="font-weight:700;color:var(--carbs)">${fmt(v.c, 1)} g</p><p class="muted xs">Carboidrati</p></div>
    <div><p class="num" style="font-weight:700;color:var(--fat)">${fmt(v.f, 1)} g</p><p class="muted xs">Grassi</p></div></div>`;
}

function openPortion(food) {
  ui.pick.food = food;
  const g = food.g || 100;
  openModal(esc(food.name), `
    <div class="row wrap">${[0.5, 1, 1.5, 2].map((m) => `<button type="button" class="chip" data-action="portion" data-g="${Math.round(g * m)}">${m === 1 ? '1 porzione' : `${fmt(m, 1)} porz.`} · ${Math.round(g * m)} g</button>`).join('')}</div>
    <div class="form-grid">
      <label class="field">Quantità (g)<input id="grams" name="grams" type="number" inputmode="decimal" min="1" max="5000" step="1" value="${g}" data-input="grams" required autofocus></label>
      <label class="field">Pasto<select name="meal">${MEALS.map((m) => `<option value="${m.id}" ${m.id === ui.pick.meal ? 'selected' : ''}>${m.label}</option>`).join('')}</select></label>
    </div>
    <div id="portion-preview">${portionPreview(food, g)}</div>
    <p class="error-text" id="portion-error" role="alert"></p>`,
  { form: 'add-entry', foot: `<button type="button" class="btn" data-action="back-to-search">${icon('left')} Indietro</button><button class="btn primary">Aggiungi</button>` });
}

function openNewFood(name = '') {
  openModal('Nuovo alimento', `
    <label class="field">Nome<input name="name" type="text" maxlength="60" required value="${esc(name)}" autofocus></label>
    <p class="muted xs">Valori per 100 g (li trovi nella tabella nutrizionale in etichetta).</p>
    <div class="form-grid">
      <label class="field">Kcal<input name="kcal" type="number" inputmode="decimal" min="0" max="950" step="any" required></label>
      <label class="field">Proteine (g)<input name="p" type="number" inputmode="decimal" min="0" max="100" step="any" value="0"></label>
      <label class="field">Carboidrati (g)<input name="c" type="number" inputmode="decimal" min="0" max="100" step="any" value="0"></label>
      <label class="field">Grassi (g)<input name="f" type="number" inputmode="decimal" min="0" max="100" step="any" value="0"></label>
      <label class="field">Porzione tipica (g)<input name="g" type="number" inputmode="numeric" min="1" max="2000" value="100"></label>
    </div>
    <p class="error-text" id="food-error" role="alert"></p>`,
  { form: 'new-food', foot: `<button type="button" class="btn" data-action="back-to-search">Annulla</button><button class="btn primary">Salva</button>` });
}

function openCardio() {
  const kg = currentWeight();
  const first = CARDIO[0];
  openModal('Aggiungi attività', `
    <label class="field">Attività<select name="type" data-input="cardio-calc">${CARDIO.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label>
    <div class="form-grid">
      <label class="field">Durata (min)<input name="min" type="number" inputmode="numeric" min="1" max="600" value="30" required data-input="cardio-calc"></label>
      <label class="field">Kcal<input name="kcal" type="number" inputmode="numeric" min="0" max="5000" value="${C.metKcal(first.met, kg, 30)}" data-input="cardio-kcal"><span class="hint">Stimate sul tuo peso (${fmt(kg, 1)} kg). Puoi modificarle.</span></label>
    </div>
    <p class="error-text" id="cardio-error" role="alert"></p>`,
  { form: 'cardio', foot: '<button class="btn primary">Aggiungi</button>' });
}

function exerciseResults() {
  const { muscle, q } = ui.exPick;
  const words = norm(q || '').split(/\s+/).filter(Boolean);
  const list = allExercises().filter((e) => (muscle === 'Tutti' || e.muscle === muscle) && words.every((w) => norm(e.name).includes(w)));
  return list.length ? list.map((e) => `<button class="pick" data-action="pick-exercise" data-name="${esc(e.name)}">
      <div class="main"><div class="ellipsis">${esc(e.name)}</div><div class="muted xs">${esc(e.muscle)} · ${esc(e.equip || 'Personalizzato')}</div></div>${icon('plus')}</button>`).join('')
    : `<p class="empty">Nessun esercizio trovato.</p>`;
}

function openExPicker(target) {
  ui.exPick = { for: target, muscle: 'Tutti', q: '' };
  openModal('Scegli esercizio', `
    <input type="search" placeholder="Cerca esercizio" aria-label="Cerca esercizio" data-input="ex-q" autocomplete="off" autofocus>
    <div class="row wrap" role="group" aria-label="Gruppo muscolare">${['Tutti', ...MUSCLES].map((m) => `<button class="chip" data-action="ex-muscle" data-m="${m}" aria-pressed="${m === 'Tutti'}">${m}</button>`).join('')}</div>
    <div id="ex-results">${exerciseResults()}</div>
    <details><summary class="small" style="cursor:pointer;font-weight:600">Crea esercizio personalizzato</summary>
      <form class="form-grid" data-form="new-exercise" style="margin-top:8px">
        <label class="field">Nome<input name="name" type="text" maxlength="50" required></label>
        <label class="field">Gruppo<select name="muscle">${MUSCLES.map((m) => `<option>${m}</option>`).join('')}</select></label>
        <button class="btn primary" style="align-self:end">Crea e aggiungi</button>
      </form></details>`);
}

function openWorkoutDetail(id) {
  const w = state.workouts.find((x) => x.id === id);
  if (!w) return;
  openModal(esc(w.name), `
    <p class="muted small num">${C.parseKey(w.date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })} · ${duration(w.durationSec)} · ${C.doneSets(w)} serie · ${fmt(C.workoutVolume(w))} kg di volume · ~${fmt(workoutKcal(w))} kcal</p>
    ${w.exercises.map((ex) => `<div><h3>${esc(ex.name)}</h3><ol class="small num" style="margin:4px 0 0;padding-left:20px">${ex.sets.map((s) => `<li>${fmt(s.kg, 1)} kg × ${s.reps} <span class="muted xs">(1RM ~${fmt(C.oneRepMax(s.kg, s.reps), 1)})</span></li>`).join('')}</ol></div>`).join('')}`,
  { foot: `<button class="btn danger" data-action="del-workout" data-id="${esc(w.id)}">${icon('trash')} Elimina</button><button class="btn" data-action="save-as-routine" data-id="${esc(w.id)}">Salva come scheda</button><button class="btn primary" data-action="close-modal">Chiudi</button>` });
}

// ---------- timer di recupero ----------

const restRoot = document.createElement('div');
document.body.append(restRoot);
function renderRest() {
  if (!ui.rest) { restRoot.innerHTML = ''; return; }
  const left = Math.ceil((ui.rest.endsAt - Date.now()) / 1000);
  if (left <= 0) {
    ui.rest = null; restRoot.innerHTML = '';
    navigator.vibrate?.([200, 100, 200]);
    toast('Recupero finito: prossima serie!');
    return;
  }
  // i pulsanti non vengono ricreati ogni secondo: un tocco a cavallo dell'aggiornamento andrebbe perso
  if (!restRoot.firstChild) {
    restRoot.innerHTML = `<div class="rest" role="timer" aria-label="Recupero">${icon('timer')}<span class="num" id="rest-left"></span>
      <button data-action="rest-adj" data-s="-15" aria-label="Meno 15 secondi">−15</button><button data-action="rest-adj" data-s="15" aria-label="Più 15 secondi">+15</button><button data-action="rest-skip">Salta</button></div>`;
  }
  restRoot.querySelector('#rest-left').textContent = `Recupero ${duration(left)}`;
}
function startRest() { ui.rest = { endsAt: Date.now() + state.settings.restSec * 1000 }; renderRest(); }

setInterval(() => {
  if (ui.rest) renderRest();
  const el = document.getElementById('elapsed');
  if (el && state.active) el.textContent = duration((Date.now() - state.active.startedAt) / 1000);
}, 1000);

// ---------- azioni ----------

function startWorkout(routineId) {
  if (state.active) { toast('Hai già un allenamento in corso'); location.hash = '#/allenamento'; return; }
  const r = state.routines.find((x) => x.id === routineId);
  state.active = {
    id: 'w-' + S.uid(), name: r ? r.name : 'Allenamento libero', date: today(), startedAt: Date.now(), routineId: r?.id || null,
    exercises: r ? r.exercises.map((e) => ({ name: e.name, sets: Array.from({ length: e.sets }, () => ({ kg: '', reps: '', target: e.reps, done: false })) })) : [],
  };
  persist();
  location.hash = '#/allenamento';
}

function finishWorkout() {
  const a = state.active;
  if (!C.doneSets(a)) {
    if (confirm('Nessuna serie completata. Vuoi scartare questo allenamento?')) { state.active = null; ui.rest = null; renderRest(); commit(); location.hash = '#/allenamenti'; }
    return;
  }
  const before = Object.fromEntries(C.personalRecords(state.workouts).map((p) => [p.name, p.best1rm]));
  const w = {
    id: a.id, name: a.name.trim() || 'Allenamento', date: a.date, startedAt: a.startedAt, routineId: a.routineId,
    durationSec: Math.round((Date.now() - a.startedAt) / 1000),
    kcal: null,
    exercises: a.exercises.map((ex) => ({ name: ex.name, sets: ex.sets.filter((s) => s.done).map((s) => ({ kg: Number(s.kg) || 0, reps: Number(s.reps) || 0, done: true })) })).filter((ex) => ex.sets.length),
  };
  w.kcal = C.workoutKcal(w, currentWeight()); // fissate ora: un peso futuro non cambia lo storico
  state.workouts.push(w);
  state.active = null;
  ui.rest = null; renderRest();
  const prs = C.personalRecords([w]).filter((p) => p.best1rm > (before[p.name] || 0) && before[p.name] !== undefined);
  persist();
  location.hash = '#/allenamenti';
  render(); // subito, così il riepilogo si apre sulla pagina giusta (hashchange poi non ri-renderizza)
  toast(prs.length ? `Nuovo record: ${prs.map((p) => p.name).join(', ')}!` : 'Allenamento salvato. Ottimo lavoro!');
  openWorkoutDetail(w.id);
}

const actions = {
  'close-modal': closeModal,
  day(el) {
    const d = Number(el.dataset.delta);
    ui.date = d === 0 ? today() : C.addDays(ui.date, d);
    render();
  },
  'goto-diary'(el) { ui.date = el.dataset.date; },
  water(el) {
    const d = S.day(state, el.dataset.date);
    d.waterMl = Math.max(0, d.waterMl + Number(el.dataset.ml));
    commit();
  },
  'open-add-food'(el) { openAddFood(el.dataset.meal); },
  'pick-food'(el) { const f = findFood(el.dataset.id); if (f) openPortion(f); },
  'back-to-search'() { openAddFood(ui.pick.meal); },
  'new-food'(el) { openNewFood(el.dataset.name || ''); },
  portion(el) {
    const g = $('#grams'); g.value = el.dataset.g;
    $('#portion-preview').innerHTML = portionPreview(ui.pick.food, g.value);
  },
  'del-entry'(el) {
    const list = S.day(state, ui.date).meals[el.dataset.meal];
    const i = list.findIndex((e) => e.id === el.dataset.id);
    if (i < 0) return;
    const [removed] = list.splice(i, 1);
    commit();
    toast(`${removed.name} rimosso`, () => { list.splice(i, 0, removed); commit(); });
  },
  'copy-meal'(el) {
    const src = S.peekDay(state, C.addDays(ui.date, -1));
    if (!src) return;
    const m = el.dataset.meal;
    const copies = src.meals[m].map((e) => ({ ...e, id: S.uid() }));
    S.day(state, ui.date).meals[m].push(...copies);
    commit();
    toast(`${copies.length} alimenti copiati da ieri`);
  },
  'open-cardio': openCardio,
  'del-cardio'(el) {
    const d = S.day(state, ui.date);
    const i = d.cardio.findIndex((c) => c.id === el.dataset.id);
    if (i < 0) return;
    const [removed] = d.cardio.splice(i, 1);
    commit();
    toast('Attività rimossa', () => { d.cardio.splice(i, 0, removed); commit(); });
  },
  'start-workout'(el) { startWorkout(el.dataset.routine); },
  'finish-workout': finishWorkout,
  'cancel-workout'() {
    if (!confirm('Annullare l\'allenamento? Le serie registrate andranno perse.')) return;
    state.active = null; ui.rest = null; renderRest(); commit(); location.hash = '#/allenamenti';
  },
  'set-done'(el) {
    const ex = state.active.exercises[el.dataset.ex];
    const s = ex.sets[el.dataset.set];
    s.done = !s.done;
    if (s.done) {
      const prev = previousSets(ex.name, state.active.id)[el.dataset.set];
      if (s.kg === '' && prev) s.kg = prev.kg;
      if (s.reps === '') s.reps = prev ? prev.reps : (s.target || '');
      if (s.reps === '' || Number(s.reps) <= 0) { s.done = false; toast('Inserisci le ripetizioni'); render(); return; }
      startRest();
    }
    commit();
  },
  'set-add'(el) {
    const ex = state.active.exercises[el.dataset.ex];
    const last = ex.sets[ex.sets.length - 1];
    ex.sets.push({ kg: last ? last.kg : '', reps: last ? last.reps : '', target: last?.target, done: false });
    commit();
  },
  'set-remove'(el) {
    const ex = state.active.exercises[el.dataset.ex];
    if (ex.sets.length > 1) ex.sets.pop();
    commit();
  },
  'ex-remove'(el) {
    const ex = state.active.exercises[el.dataset.ex];
    if (ex.sets.some((s) => s.done) && !confirm(`Rimuovere ${ex.name} e le sue serie?`)) return;
    state.active.exercises.splice(el.dataset.ex, 1);
    commit();
  },
  'ex-move'(el) { move(state.active.exercises, Number(el.dataset.ex), Number(el.dataset.dir)); commit(); },
  'rest-adj'(el) { if (ui.rest) { ui.rest.endsAt += Number(el.dataset.s) * 1000; renderRest(); } },
  'rest-skip'() { ui.rest = null; renderRest(); },
  'open-ex-picker'(el) { openExPicker(el.dataset.for); },
  'ex-muscle'(el) {
    ui.exPick.muscle = el.dataset.m;
    dlg.querySelectorAll('[data-action=ex-muscle]').forEach((b) => b.setAttribute('aria-pressed', b === el));
    $('#ex-results').innerHTML = exerciseResults();
  },
  'pick-exercise'(el) { addExercise(el.dataset.name); },
  'draft-move'(el) { move(ui.draft.exercises, Number(el.dataset.i), Number(el.dataset.dir)); render(); },
  'draft-remove'(el) { ui.draft.exercises.splice(Number(el.dataset.i), 1); render(); },
  'draft-cancel'() { ui.draft = null; },
  'routine-delete'() {
    if (!confirm(`Eliminare la scheda “${ui.draft.name}”?`)) return;
    state.routines = state.routines.filter((r) => r.id !== ui.draft.id);
    ui.draft = null; persist(); location.hash = '#/allenamenti';
  },
  'open-workout'(el) { openWorkoutDetail(el.dataset.id); },
  'del-workout'(el) {
    if (!confirm('Eliminare questo allenamento dallo storico?')) return;
    state.workouts = state.workouts.filter((w) => w.id !== el.dataset.id);
    closeModal(); commit();
  },
  'save-as-routine'(el) {
    const w = state.workouts.find((x) => x.id === el.dataset.id);
    state.routines.push({ id: 'r-' + S.uid(), name: w.name, exercises: w.exercises.map((e) => ({ name: e.name, sets: e.sets.length, reps: e.sets[0]?.reps || 10 })) });
    closeModal(); commit(); toast('Scheda creata');
  },
  async 'health-paste'() {
    try {
      const text = await navigator.clipboard.readText();
      if (!/passi=|attive=|peso=|acqua=/.test(text)) throw new Error('vuoto');
      if (importHealth(text)) render();
    } catch {
      openHealthManual('Non trovo i dati negli appunti. Esegui prima il Comando Rapido “HealthFit” oppure incollali qui.');
    }
  },
  'health-manual'() { openHealthManual(); },
  async 'copy-base'() {
    try { await navigator.clipboard.writeText(`${healthBaseUrl()}passi=&attive=&peso=`); toast('Indirizzo copiato'); } catch { toast('Copia non riuscita: seleziona il testo a mano'); }
  },
  'w-range'(el) { ui.weightRange = Number(el.dataset.v); render(); },
  'del-weight'(el) {
    const i = state.weights.findIndex((w) => w.date === el.dataset.date);
    if (i < 0) return;
    const [removed] = state.weights.splice(i, 1);
    commit();
    toast('Peso eliminato', () => { upsertWeight(removed.date, removed.kg); commit(); });
  },
  theme(el) { state.settings.theme = el.dataset.v; applyTheme(); commit(); },
  'rest-default'(el) { state.settings.restSec = Number(el.dataset.v); commit(); },
  export() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `healthfit-backup-${today()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  reset() {
    if (!confirm('Cancellare TUTTI i dati di HealthFit da questo dispositivo?')) return;
    if (!confirm('Sei sicuro? L\'operazione non si può annullare.')) return;
    state = S.emptyState(); ui.date = today(); commit(); location.hash = '#/oggi';
  },
};

function move(arr, i, dir) {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
}

function addExercise(name) {
  if (ui.exPick.for === 'workout') {
    const prev = previousSets(name, state.active.id);
    const n = Math.max(3, prev.length);
    state.active.exercises.push({ name, sets: Array.from({ length: n }, () => ({ kg: '', reps: '', target: prev[0]?.reps || 10, done: false })) });
    closeModal(); commit();
  } else {
    ui.draft.exercises.push({ name, sets: 3, reps: 10 });
    closeModal(); render();
  }
}

const inputs = {
  'food-q'(el) { $('#food-results').innerHTML = foodResults(el.value.trim()); },
  grams(el) { $('#portion-preview').innerHTML = portionPreview(ui.pick.food, num(el.value) || 0); },
  'ex-q'(el) { ui.exPick.q = el.value; $('#ex-results').innerHTML = exerciseResults(); },
  set(el) {
    const s = state.active.exercises[el.dataset.ex].sets[el.dataset.set];
    s[el.dataset.field] = el.value === '' ? '' : Math.max(0, num(el.value) || 0);
    persist();
  },
  'wk-name'(el) { state.active.name = el.value; persist(); },
  'draft-name'(el) { ui.draft.name = el.value; },
  'draft-ex'(el) {
    const v = Math.round(num(el.value));
    if (v > 0) ui.draft.exercises[el.dataset.i][el.dataset.field] = Math.min(el.dataset.field === 'sets' ? 20 : 100, v);
  },
  'cardio-calc'(el) {
    const f = el.form;
    const c = CARDIO.find((x) => x.id === f.type.value);
    f.kcal.value = C.metKcal(c.met, currentWeight(), num(f.min.value) || 0);
  },
  'cardio-kcal'() {},
};

const forms = {
  health(f, fd) {
    if (importHealth(String(fd.get('payload') || ''))) { closeModal(); render(); }
  },
  steps(f, fd) {
    const v = Math.round(num(fd.get('steps')));
    if (!(v >= 0 && v <= 200000)) { toast('Inserisci un numero di passi valido'); return; }
    S.day(state, f.dataset.date).steps = v;
    commit(); toast('Passi salvati');
  },
  'weight-quick'(f, fd) {
    const kg = num(fd.get('kg'));
    if (!(kg >= 20 && kg <= 400)) { toast('Inserisci un peso tra 20 e 400 kg'); return; }
    upsertWeight(today(), Math.round(kg * 10) / 10);
    commit(); toast('Peso salvato');
  },
  weight(f, fd) {
    const kg = num(fd.get('kg'));
    const date = fd.get('date');
    if (!(kg >= 20 && kg <= 400) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today()) { toast('Controlla data e peso'); return; }
    upsertWeight(date, Math.round(kg * 10) / 10);
    commit(); toast('Peso salvato');
  },
  'add-entry'(f, fd) {
    const grams = num(fd.get('grams'));
    if (!(grams > 0 && grams <= 5000)) { $('#portion-error').textContent = 'Inserisci una quantità tra 1 e 5000 g.'; return; }
    const food = ui.pick.food;
    const meal = fd.get('meal');
    S.day(state, ui.pick.date).meals[meal].push({ id: S.uid(), foodId: food.id, name: food.name, grams: Math.round(grams), ...C.portion(food, grams) });
    state.recent = [food.id, ...state.recent.filter((id) => id !== food.id)].slice(0, 15);
    closeModal(); commit();
    toast(`${food.name} aggiunto`);
  },
  'new-food'(f, fd) {
    const name = String(fd.get('name') || '').trim();
    const vals = ['kcal', 'p', 'c', 'f'].map((k) => num(fd.get(k) || 0));
    const g = Math.round(num(fd.get('g'))) || 100;
    const err = $('#food-error');
    if (!name) { err.textContent = 'Dai un nome all\'alimento.'; return; }
    if (vals.some((v) => !(v >= 0)) || vals[0] > 950 || vals[1] + vals[2] + vals[3] > 100) { err.textContent = 'Controlla i valori: per 100 g, macro in totale non oltre 100 g.'; return; }
    const food = { id: 'u-' + S.uid(), name, kcal: vals[0], p: vals[1], c: vals[2], f: vals[3], g, cat: 'Personalizzati' };
    state.foods.unshift(food);
    persist();
    openPortion(food);
  },
  cardio(f, fd) {
    const c = CARDIO.find((x) => x.id === fd.get('type'));
    const min = Math.round(num(fd.get('min')));
    const kcal = Math.round(num(fd.get('kcal')));
    if (!(min > 0 && min <= 600) || !(kcal >= 0 && kcal <= 5000)) { $('#cardio-error').textContent = 'Controlla durata e kcal.'; return; }
    S.day(state, ui.date).cardio.push({ id: S.uid(), name: c.name, min, kcal });
    closeModal(); commit(); toast('Attività aggiunta');
  },
  'new-exercise'(f, fd) {
    const name = String(fd.get('name') || '').trim();
    if (!name) return;
    if (!allExercises().some((e) => norm(e.name) === norm(name))) state.customExercises.push({ name, muscle: fd.get('muscle'), equip: 'Personalizzato' });
    persist();
    addExercise(allExercises().find((e) => norm(e.name) === norm(name)).name);
  },
  routine() {
    const d = ui.draft;
    if (!d.name.trim()) { toast('Dai un nome alla scheda'); return; }
    const { _for, ...clean } = d;
    clean.name = clean.name.trim();
    const i = state.routines.findIndex((r) => r.id === clean.id);
    if (i >= 0) state.routines[i] = clean; else state.routines.push(clean);
    ui.draft = null; persist(); location.hash = '#/allenamenti'; toast('Scheda salvata');
  },
  profile(f, fd) {
    const err = $('#profile-error');
    const age = Math.round(num(fd.get('age'))), heightCm = Math.round(num(fd.get('heightCm'))), weightKg = num(fd.get('weightKg'));
    if (!(age >= 14 && age <= 100)) { err.textContent = 'Inserisci un\'età tra 14 e 100 anni.'; return; }
    if (!(heightCm >= 120 && heightCm <= 230)) { err.textContent = 'Inserisci un\'altezza tra 120 e 230 cm.'; return; }
    if (!(weightKg >= 30 && weightKg <= 300)) { err.textContent = 'Inserisci un peso tra 30 e 300 kg.'; return; }
    const first = !state.profile;
    const prev = state.profile || {};
    const p = {
      ...prev, name: String(fd.get('name') || '').trim(), sex: fd.get('sex'), age, heightCm, weightKg: Math.round(weightKg * 10) / 10,
      activity: fd.get('activity'), goal: fd.get('goal'), rate: Number(fd.get('rate')),
    };
    if (!first) {
      const ko = num(fd.get('kcalOverride'));
      p.kcalOverride = ko >= 800 && ko <= 6000 ? Math.round(ko) : null;
      const pp = num(fd.get('pp')), pc = num(fd.get('pc')), pf = num(fd.get('pf'));
      if ([pp, pc, pf].every(Number.isFinite)) {
        if ([pp, pc, pf].some((v) => v < 5 || v > 80)) { err.textContent = 'Ogni macro deve essere tra il 5% e l\'80%.'; return; }
        if (Math.round(pp + pc + pf) !== 100) { err.textContent = `Le percentuali dei macro devono fare 100 (ora: ${fmt(pp + pc + pf)}).`; return; }
        p.macroPct = { p: pp, c: pc, f: pf };
      } else if ([pp, pc, pf].some(Number.isFinite)) {
        err.textContent = 'Compila tutte e tre le percentuali dei macro, oppure lasciale vuote.'; return;
      } else p.macroPct = null;
      p.waterMl = Math.round(num(fd.get('waterMl'))) || 2000;
      p.stepsGoal = Math.round(num(fd.get('stepsGoal'))) || 8000;
    } else { p.waterMl = 2000; p.stepsGoal = 8000; }
    state.profile = p;
    const lastW = state.weights[state.weights.length - 1];
    if (!lastW || lastW.kg !== p.weightKg) upsertWeight(today(), p.weightKg);
    commit();
    if (first) { location.hash = '#/oggi'; toast(`Obiettivo: ${fmt(C.calorieTarget(p))} kcal al giorno`); } else toast('Profilo salvato');
  },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.action];
  if (!fn) return;
  if (el.tagName !== 'A') e.preventDefault();
  fn(el, e);
});
document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-input]');
  if (el && inputs[el.dataset.input]) inputs[el.dataset.input](el, e);
});
document.addEventListener('change', async (e) => {
  if (e.target.dataset.change !== 'import') return;
  const file = e.target.files[0];
  if (!file) return;
  try {
    const next = S.validateImport(JSON.parse(await file.text()));
    if (!confirm('Importare il backup? I dati attuali su questo dispositivo verranno sostituiti.')) return;
    state = next; applyTheme(); commit(); toast('Backup importato');
  } catch (err) { toast(err.message || 'File non valido'); }
  e.target.value = '';
});
document.addEventListener('submit', (e) => {
  const f = e.target.closest('form[data-form]');
  if (!f) return;
  e.preventDefault();
  forms[f.dataset.form]?.(f, new FormData(f));
});
dlg.addEventListener('click', (e) => { if (e.target === dlg) closeModal(); }); // clic sullo sfondo
dlg.addEventListener('close', () => { dlg.innerHTML = ''; });

// ---------- router ----------

const ROUTES = {
  oggi: { view: viewOggi, title: 'Oggi', tab: 'oggi' },
  diario: { view: viewDiario, title: 'Diario', tab: 'diario' },
  allenamenti: { view: viewAllenamenti, title: 'Allenamenti', tab: 'allenamenti' },
  allenamento: { view: viewAllenamento, title: 'Allenamento in corso', tab: 'allenamenti' },
  scheda: { view: viewScheda, title: 'Scheda', tab: 'allenamenti' },
  progressi: { view: viewProgressi, title: 'Progressi', tab: 'progressi' },
  profilo: { view: viewProfilo, title: 'Profilo', tab: 'profilo' },
  salute: { view: viewSalute, title: 'Apple Watch e Salute', tab: 'profilo' },
};

function render() {
  // #/importa?passi=..: arriva dal Comando Rapido. Applica una volta, poi mostra Oggi
  // (replaceState: tornando indietro non si reimporta).
  if (location.hash.startsWith('#/importa')) {
    importHealth(location.hash);
    history.replaceState(null, '', '#/oggi');
  }
  const [path] = location.hash.replace(/^#\/?/, '').split('?');
  const [name, rawArg] = path.split('/');
  const arg = rawArg && decodeURIComponent(rawArg);
  const route = ROUTES[name] || ROUTES.oggi;
  const needsProfile = !state.profile;
  const scrollY = window.scrollY;
  const active = document.activeElement?.id;
  main.innerHTML = needsProfile ? viewWelcome() : route.view(arg);
  document.title = `${needsProfile ? 'Benvenuto' : route.title} · HealthFit`;
  document.querySelectorAll('.tabbar a').forEach((a) => {
    if (a.dataset.tab === (needsProfile ? '' : route.tab)) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  const s = needsProfile ? 0 : streak();
  $('#streak').innerHTML = s > 1 ? `<span class="badge" title="Giorni consecutivi con il diario compilato">${icon('flame')} ${s} giorni</span>` : '';
  if (render.last === location.hash) { window.scrollTo(0, scrollY); if (active) document.getElementById(active)?.focus({ preventScroll: true }); } else window.scrollTo(0, 0);
  render.last = location.hash;
}
const streak = () => C.streak(state.days, today());

function applyTheme() {
  const t = state.settings.theme;
  if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
}

window.addEventListener('hashchange', () => {
  if (location.hash === render.last) return; // già renderizzato
  closeModal();
  if (!location.hash.startsWith('#/scheda/')) ui.draft = null;
  render();
});
window.addEventListener('storage', (e) => { if (e.key === 'healthfit:v1') { state = S.load(); render(); } });
// a mezzanotte "oggi" cambia: riallinea quando l'app torna visibile
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });

applyTheme();
render();

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
