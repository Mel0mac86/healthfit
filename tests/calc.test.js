import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../js/calc.js';

const man = { sex: 'M', age: 30, heightCm: 180, weightKg: 80, activity: 'moderato', goal: 'mantenere', rate: 0.5 };

test('BMR Mifflin-St Jeor', () => {
  assert.equal(C.bmr(man), 1780);                       // 800 + 1125 - 150 + 5
  assert.equal(C.bmr({ ...man, sex: 'F' }), 1614);
  assert.equal(C.bmr({}), 0);
});

test('TDEE e obiettivo calorie', () => {
  assert.equal(C.tdee(man), Math.round(1780 * 1.55));
  assert.equal(C.calorieTarget(man), 2760);
  assert.equal(C.calorieTarget({ ...man, goal: 'perdere' }), Math.round((2759 - 550) / 10) * 10);
  assert.equal(C.calorieTarget({ ...man, kcalOverride: 2100 }), 2100);
  // mai sotto la soglia minima
  assert.equal(C.calorieTarget({ sex: 'F', age: 70, heightCm: 150, weightKg: 45, activity: 'sedentario', goal: 'perdere', rate: 1 }), 1200);
});

test('macro: percentuali sommano 100 e grammi coerenti', () => {
  const pct = C.macroSplit(man, 2500);
  assert.equal(pct.p + pct.c + pct.f, 100);
  const g = C.macroGrams(2000, { p: 30, c: 40, f: 30 });
  assert.deepEqual(g, { p: 150, c: 200, f: 67 });
});

test('porzioni e somme', () => {
  const pasta = { kcal: 355, p: 12.5, c: 72, f: 1.5 };
  assert.deepEqual(C.portion(pasta, 80), { kcal: 284, p: 10, c: 57.6, f: 1.2 });
  assert.deepEqual(C.sumEntries([{ kcal: 100, p: 1.4, c: 2, f: 3 }, { kcal: 50, p: 1.4, c: 0, f: 0 }]), { kcal: 150, p: 3, c: 2, f: 3 });
});

test('MET, 1RM, volume, record', () => {
  assert.equal(C.metKcal(10, 70, 60), 735);
  assert.equal(C.oneRepMax(100, 1), 100);
  assert.equal(C.oneRepMax(100, 10), 133.3);
  assert.equal(C.oneRepMax(0, 5), 0);
  const w = { date: '2026-10-01', exercises: [{ name: 'Squat', sets: [{ kg: 100, reps: 5, done: true }, { kg: 120, reps: 3, done: true }, { kg: 200, reps: 1, done: false }] }] };
  assert.equal(C.workoutVolume(w), 860);
  assert.equal(C.doneSets(w), 2);
  const [pr] = C.personalRecords([w]);
  assert.equal(pr.maxKg, 120);
  assert.equal(pr.best1rm, 132);
});

test('date locali e streak', () => {
  assert.equal(C.addDays('2026-03-31', 1), '2026-04-01');
  assert.equal(C.addDays('2024-03-01', -1), '2024-02-29');
  const meal = (n) => ({ meals: { colazione: n ? [{}] : [], pranzo: [], cena: [], spuntini: [] } });
  const days = { '2026-10-06': meal(1), '2026-10-05': meal(1), '2026-10-04': meal(0), '2026-10-03': meal(1) };
  assert.equal(C.streak(days, '2026-10-06'), 2);
  assert.equal(C.streak(days, '2026-10-07'), 2); // oggi vuoto: conta da ieri
  assert.equal(C.streak({}, '2026-10-06'), 0);
});

test('BMI', () => {
  assert.equal(C.bmi(80, 180), 24.7);
  assert.equal(C.bmiLabel(24.7), 'Normopeso');
  assert.equal(C.bmi(80, 0), null);
});

test('numeri dai Comandi Rapidi (italiano e inglese)', () => {
  const n = C.parseLocaleNumber;
  assert.equal(n('8.500'), 8500);
  assert.equal(n('8,500'), 8.5);
  assert.equal(n('1.234,5'), 1234.5);
  assert.equal(n('1,234.5'), 1234.5);
  assert.equal(n('80,4 kg'), 80.4);
  assert.equal(n('612.3'), 612.3);
  assert.ok(Number.isNaN(n('abc')));
  assert.ok(Number.isNaN(n('')));
});

test('payload di Salute', () => {
  const p = C.parseHealthPayload('https://x.io/app/#/importa?passi=8.500&attive=612,3&peso=80,4', '2026-10-06');
  assert.deepEqual(p, { date: '2026-10-06', values: { steps: 8500, activeKcal: 612, weightKg: 80.4 }, errors: [] });
  // campi vuoti ignorati, valori fuori scala segnalati, data italiana accettata
  const q = C.parseHealthPayload('passi=&attive=-4&peso=79&data=05/10/2026', '2026-10-06');
  assert.deepEqual(q, { date: '2026-10-05', values: { weightKg: 79 }, errors: ['attive'] });
  // data futura rifiutata
  assert.deepEqual(C.parseHealthPayload('passi=10&data=2026-10-07', '2026-10-06').errors, ['data']);
});

test('bonus energia attiva: solo quella oltre il livello di attività', () => {
  const p = { sex: 'M', age: 30, heightCm: 180, weightKg: 80, activity: 'sedentario' }; // BMR 1780, previste 356 attive
  assert.equal(C.activeEnergyBonus(p, 300), 0);
  assert.equal(C.activeEnergyBonus(p, 856), 500);
});
