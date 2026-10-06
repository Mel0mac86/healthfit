# HealthFit

Calorie, macro, allenamenti, peso e passi in un'unica app. È una PWA: si apre dal
browser, si installa sul telefono ("Aggiungi a schermata Home"), funziona offline
e tiene tutti i dati **solo sul tuo dispositivo** (backup con Esporta/Importa).

Costruita con il metodo [replica-skill](https://github.com/Jakeschincariol/replica-skill)
(recon → architect → design → build → test → diff → brand): funzioni e flussi
tipici delle app di conteggio calorie, di registro allenamenti e di salute, riscritti da zero.
I documenti di lavoro sono in [`replica/`](replica/).

## Funzioni

- **Oggi**: calorie rimanenti (obiettivo − cibo + esercizio), macro, acqua, passi, peso, allenamento
- **Diario**: pasti per giorno, ricerca in ~75 alimenti di base + alimenti personalizzati, porzioni rapide,
  "copia da ieri", attività cardio con kcal stimate, annulla eliminazione
- **Allenamenti**: schede pronte (Push/Pull/Gambe) e personalizzate, 35 esercizi + personalizzati,
  valori della volta precedente, timer di recupero, storico, record personali (1RM stimato)
- **Progressi**: grafico del peso (30/90/365 giorni), BMI, calorie e passi degli ultimi 7 giorni, allenamenti per settimana
- **Profilo**: BMR/TDEE (Mifflin-St Jeor), obiettivo con ritmo di dimagrimento, macro e obiettivi personalizzati, tema chiaro/scuro

## Avvio

Nessun build step. Serve solo un server statico:

```bash
npm start            # http://localhost:5173
```

## Test

```bash
npm install          # Playwright per i test e2e
npm test             # unit test dei calcoli
npm run e2e          # flussi completi su mobile e desktop (SHOTS=1 salva gli screenshot)
```

## Pubblicazione

È un sito statico: GitHub Pages (Settings → Pages → branch `main`, cartella `/`), Netlify o Vercel.
Il service worker richiede HTTPS (o localhost).

## Note

Le stime di calorie e fabbisogno sono indicative e non sostituiscono il parere di un medico o di un nutrizionista.
