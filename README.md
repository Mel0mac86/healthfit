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
- **Apple Watch**: un Comando Rapido di iPhone legge da Salute passi, calorie attive e peso e li manda a HealthFit
  (guida passo passo nell'app, in Profilo → Apple Watch e Salute)
- **Profilo**: BMR/TDEE (Mifflin-St Jeor), obiettivo con ritmo di dimagrimento, macro e obiettivi personalizzati, tema chiaro/scuro

## Apple Watch e Salute

Una web app non può leggere Salute direttamente, quindi fa da ponte un Comando Rapido che apre
`…/#/importa?passi=8500&attive=520&peso=80,4` (oppure copia lo stesso testo negli appunti, per l'app
installata sulla schermata Home, che su iPhone ha dati separati da Safari). Accetta numeri in formato
italiano e inglese e una `data=AAAA-MM-GG` facoltativa. I valori sostituiscono quelli del giorno.

Calorie: il livello di attività del profilo (senza allenamenti) prevede già una quota di energia attiva;
al budget si aggiunge solo quella misurata in più dal Watch, e nei giorni con i dati dell'orologio le
attività inserite a mano non si sommano di nuovo.

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
