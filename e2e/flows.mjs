// Test end-to-end dei flussi di replica/recon.md (F01-F06).
// Avvia un server statico, guida Chromium a 390x844 e 1440x900, fallisce su errori in console.
//   npm run e2e          (SHOTS=1 salva gli screenshot in replica/clone-screens/)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  const file = fs.existsSync(p) && fs.statSync(p).isDirectory() ? path.join(p, 'index.html') : p;
  if (!file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(0);
const base = `http://localhost:${server.address().port}/`;

const launchOpts = {};
const browser = await chromium.launch(launchOpts);
const shots = process.env.SHOTS ? path.join(root, 'replica/clone-screens') : null;
if (shots) fs.mkdirSync(shots, { recursive: true });

let failures = 0;
async function flow(name, viewport, fn) {
  const ctx = await browser.newContext({ viewport, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  try {
    await page.goto(base);
    await fn(page);
    assert.deepEqual(errors, [], 'errori in console');
    console.log(`  ok  ${name} (${viewport.width}px)`);
  } catch (e) {
    failures++;
    console.log(`  FAIL ${name} (${viewport.width}px)\n       ${e.message.split('\n').join('\n       ')}`);
    await page.screenshot({ path: path.join(root, `e2e/fail-${name.replace(/\W+/g, '-')}.png`), fullPage: true }).catch(() => {});
  }
  await ctx.close();
}
const shot = async (page, id) => { if (shots) await page.screenshot({ path: path.join(shots, `${id}.png`) }); };

async function onboard(page) {
  await page.getByLabel('Età').fill('30');
  await page.getByLabel('Altezza (cm)').fill('180');
  await page.getByLabel('Peso (kg)').fill('80');
  await page.getByLabel('Attività').selectOption('moderato');
  await page.getByLabel('Obiettivo').selectOption('perdere');
  await page.getByRole('button', { name: 'Calcola e inizia' }).click();
}

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  const big = viewport.width > 1000;

  await flow('F05 profilo iniziale', viewport, async (page) => {
    await page.getByRole('button', { name: 'Calcola e inizia' }).click();
    await page.getByRole('alert').filter({ hasText: 'età' }).waitFor();          // errore: campi vuoti
    if (!big) await shot(page, 'S01');
    await onboard(page);
    await page.getByRole('heading', { name: 'Calorie' }).waitFor();
    assert.match(await page.locator('.eq').textContent(), /2\.210/);           // (1780*1.55 - 550) arrotondato
    if (!big) await shot(page, 'S02-empty');
  });

  await flow('F01 registro un pasto', viewport, async (page) => {
    await onboard(page);
    await page.getByRole('link', { name: 'Diario' }).click();
    await page.getByRole('heading', { name: 'Colazione' }).waitFor();
    await page.locator('[data-action=open-add-food][data-meal=colazione]').click();
    await page.getByLabel('Cerca alimento').fill('avena');
    await page.getByRole('button', { name: /Fiocchi d'avena/ }).click();
    await page.getByLabel('Quantità (g)').fill('50');
    assert.match(await page.locator('#portion-preview').textContent(), /185/);
    if (!big) await shot(page, 'S04');
    await page.getByRole('button', { name: 'Aggiungi', exact: true }).click();
    await page.locator('#meal-colazione').locator('..').getByText('185').first().waitFor();

    // nessun risultato -> crea alimento personalizzato
    await page.locator('[data-action=open-add-food][data-meal=pranzo]').click();
    await page.getByLabel('Cerca alimento').fill('piadina della nonna');
    await page.getByRole('button', { name: /Crea “piadina della nonna”/ }).click();
    await page.getByLabel('Kcal').fill('300');
    await page.getByLabel('Carboidrati (g)').fill('50');
    await page.getByRole('button', { name: 'Salva' }).click();
    await page.getByLabel('Quantità (g)').fill('120');
    await page.getByRole('button', { name: 'Aggiungi', exact: true }).click();
    await page.locator('.list').getByText('piadina della nonna').waitFor();

    // cardio
    await page.getByRole('button', { name: 'Aggiungi attività' }).click();
    await page.getByRole('combobox', { name: 'Attività' }).selectOption('corsa');
    await page.getByLabel('Durata (min)').fill('30');
    assert.equal(await page.getByLabel('Kcal').inputValue(), String(Math.round(9.8 * 3.5 * 80 / 200 * 30)));
    await page.getByRole('button', { name: 'Aggiungi', exact: true }).click();
    await page.getByText('Corsa (10 km/h)').waitFor();
    if (!big) await shot(page, 'S03');

    // elimina + annulla
    await page.getByRole('button', { name: 'Rimuovi piadina della nonna' }).click();
    await page.getByRole('button', { name: 'Annulla' }).click();
    await page.locator('.list').getByText('piadina della nonna').waitFor();

    // persiste dopo il ricaricamento, e il giorno dopo "copia da ieri"
    await page.reload();
    await page.locator('.list').getByText('piadina della nonna').waitFor();
    await page.getByRole('button', { name: 'Giorno successivo' }).click();
    await page.getByRole('button', { name: 'Copia da ieri' }).first().click();
    await page.locator('.list').getByText("Fiocchi d'avena").waitFor();
  });

  await flow('F06 acqua e passi, F04 peso', viewport, async (page) => {
    await onboard(page);
    await page.getByRole('button', { name: '250 ml', exact: true }).click();
    await page.getByRole('button', { name: '500 ml', exact: true }).click();
    assert.match(await page.locator('#water-h').locator('..').textContent(), /0,75/);
    await page.getByPlaceholder('Passi totali').fill('9500');
    await page.getByPlaceholder('Passi totali').press('Enter');
    await page.getByText('9.500').first().waitFor();
    await page.getByPlaceholder('Peso di oggi (kg)').fill('79.4');
    await page.getByPlaceholder('Peso di oggi (kg)').press('Enter');
    await page.getByText('79,4').first().waitFor();
    if (!big) await shot(page, 'S02');
    await page.getByRole('link', { name: 'Progressi' }).click();
    await page.getByLabel('Data').fill('2026-09-20');
    await page.getByLabel('Peso (kg)').fill('82');
    await page.getByRole('button', { name: 'Aggiungi' }).click();
    await page.getByRole('img', { name: 'Andamento del peso' }).waitFor();
    await page.getByRole('button', { name: '90 g' }).click();
    assert.equal(await page.locator('.chart .dot').count() >= 2, true);
    if (!big) await shot(page, 'S12');
  });

  await flow('F02 allenamento da scheda, F03 nuova scheda', viewport, async (page) => {
    await onboard(page);
    await page.getByRole('link', { name: 'Allenamenti' }).click();
    await page.locator('[data-action=start-workout][data-routine=r-push]').click();
    await page.getByLabel('kg serie 1').first().fill('60');
    await page.getByLabel('Ripetizioni serie 1').first().fill('8');
    await page.getByRole('button', { name: 'Serie 1 completata' }).first().click();
    await page.getByRole('timer').waitFor();
    if (!big) await shot(page, 'S08');
    await page.getByRole('button', { name: 'Salta' }).click();
    // serie 2 senza dati: usa le ripetizioni target
    await page.getByRole('button', { name: 'Serie 2 completata' }).first().click();
    await page.getByRole('button', { name: 'Salta' }).click();
    await page.getByRole('button', { name: 'Aggiungi esercizio' }).click();
    await page.getByRole('button', { name: 'Gambe', exact: true }).click();
    await page.getByRole('button', { name: /Squat con bilanciere/ }).click();
    await page.getByRole('region', { name: 'Squat con bilanciere' }).waitFor();
    await page.reload(); // l'allenamento in corso sopravvive al ricaricamento
    await page.getByRole('button', { name: 'Termina' }).click();
    await page.getByRole('dialog').getByText('60 kg × 8').waitFor();
    if (!big) await shot(page, 'S11');
    await page.getByRole('dialog').getByRole('button', { name: 'Chiudi' }).last().click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.locator('#main').getByText(/2 serie/).waitFor();
    if (!big) await shot(page, 'S07');

    // record dopo un secondo allenamento più pesante
    await page.locator('[data-action=start-workout][data-routine=r-push]').click();
    await page.getByLabel('kg serie 1').first().fill('70');
    await page.getByRole('button', { name: 'Serie 1 completata' }).first().click();
    await page.getByRole('button', { name: 'Termina' }).click();
    await page.getByText(/Nuovo record: Panca piana/).waitFor();
    await page.keyboard.press('Escape');

    // nuova scheda
    await page.getByRole('link', { name: 'Nuova' }).click();
    await page.getByLabel('Nome').fill('Full body');
    await page.getByRole('button', { name: 'Aggiungi esercizio' }).click();
    await page.getByLabel('Cerca esercizio').fill('plank');
    await page.getByRole('button', { name: /Plank/ }).click();
    await page.getByLabel('Serie').fill('4');
    if (!big) await shot(page, 'S10');
    await page.getByRole('button', { name: 'Salva scheda' }).click();
    await page.getByText('Full body', { exact: true }).waitFor();
  });

  await flow('S13 profilo: validazione macro, export, tema', viewport, async (page) => {
    await onboard(page);
    await page.getByRole('link', { name: 'Profilo' }).click();
    await page.getByText('Obiettivi personalizzati').click();
    await page.getByLabel('Proteine %').fill('40');
    await page.getByLabel('Carboidrati %').fill('40');
    await page.getByLabel('Grassi %').fill('30');
    await page.getByRole('button', { name: 'Salva profilo' }).click();
    await page.getByText(/devono fare 100/).waitFor();
    await page.getByLabel('Grassi %').fill('20');
    await page.getByRole('button', { name: 'Salva profilo' }).click();
    await page.getByText('40% · 40% · 20%').waitFor();
    const dl = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Esporta backup' }).click();
    const file = await (await dl).path();
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(data.profile.heightCm, 180);
    await page.getByRole('button', { name: 'Scuro' }).click();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
    if (!big) await shot(page, 'S13-dark');
  });
}

await browser.close();
server.close();
console.log(failures ? `\n${failures} flussi falliti` : '\nTutti i flussi passati');
process.exit(failures ? 1 : 0);
