import { test } from 'node:test';
import assert from 'node:assert/strict';

// localStorage minimale per Node
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), key: (i) => [...mem.keys()][i], get length() { return mem.size; } };
globalThis.structuredClone ??= (v) => JSON.parse(JSON.stringify(v));
const S = await import('../js/store.js');

test('dati danneggiati: messi da parte, non sovrascritti', () => {
  mem.clear();
  mem.set('healthfit:v1', '{"days": {rotto');
  const s = S.load();
  assert.equal(s.profile, null);
  const backup = [...mem.keys()].find((k) => k.startsWith('healthfit:v1:danneggiato:'));
  assert.ok(backup, 'manca la copia dei dati danneggiati');
  assert.equal(mem.get(backup), '{"days": {rotto');
});

test('import: normalizza tipi e scarta voci non valide', () => {
  const s = S.validateImport({
    days: { '2026-10-01': { meals: { pranzo: [{ id: 'a"><img>', name: 7, kcal: '300' }, null] }, steps: '9000' }, 'non-una-data': {} },
    weights: [{ date: '2026-10-01', kg: '80.5' }, { date: 'x', kg: 3 }],
    workouts: [{ id: 'w1', date: '2026-10-01', exercises: [{ name: 'Squat', sets: [{ kg: '100', reps: 5, done: 1 }] }] }],
  });
  assert.deepEqual(Object.keys(s.days), ['2026-10-01']);
  const e = s.days['2026-10-01'].meals.pranzo;
  assert.equal(e.length, 1);
  assert.equal(e[0].name, '7');
  assert.equal(e[0].kcal, 300);
  assert.equal(s.days['2026-10-01'].steps, 9000);
  assert.deepEqual(s.weights, [{ date: '2026-10-01', kg: 80.5 }]);
  assert.equal(s.workouts[0].exercises[0].sets[0].kg, 100);
  assert.equal(s.routines.length, 3); // backup senza schede: restano quelle di base
  assert.throws(() => S.validateImport({ foo: 1 }), /backup di HealthFit/);
});

test('salvataggio e ricarica', () => {
  mem.clear();
  const s = S.emptyState();
  S.day(s, '2026-10-06').steps = 1234;
  assert.equal(S.save(s), true);
  assert.equal(S.load().days['2026-10-06'].steps, 1234);
});
