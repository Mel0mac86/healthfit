# Architecture: HealthFit

## Stack

| layer | choice | why |
| --- | --- | --- |
| app | HTML + CSS + JavaScript (moduli ES), nessun build step | si apre ovunque, si pubblica su GitHub Pages |
| dati | localStorage, un documento JSON versionato (`healthfit:v1`) | nessun server, nessun account, privacy totale |
| offline | Service worker cache-first + manifest | installabile come app sul telefono |
| grafici | SVG scritto a mano | zero dipendenze |
| test | Playwright (e2e/) + unit test calcoli | |

Niente backend: /replica-backend non serve finché non si aggiunge la sync.
Esporta/importa JSON copre backup e cambio di dispositivo.

## Struttura

```
index.html            shell + tab bar
manifest.webmanifest  PWA
sw.js                 cache offline
css/tokens.css        token di design (da replica/design/tokens.json)
css/app.css           componenti
js/main.js            router, rendering, azioni
js/store.js           persistenza e migrazioni
js/calc.js            BMR, TDEE, macro, 1RM, MET (puri, testati)
js/data.js            alimenti ed esercizi di base
js/charts.js          grafici SVG
```

## Ordine di build

1. Shell + router + store  2. Vertical slice: profilo -> diario -> oggi
3. Allenamenti  4. Progressi  5. PWA offline  6. Test
