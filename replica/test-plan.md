# Test plan

Automatici in `e2e/flows.mjs` (Playwright, 390x844 e 1440x900, falliscono su errori in console):

| caso | flusso |
| --- | --- |
| F05-N1 | profilo vuoto -> errore |
| F05-H1 | profilo -> obiettivo 2.210 kcal (uomo 30a 180cm 80kg moderato, -0,5 kg/sett) |
| F01-H1 | cerca "avena", 50 g -> 185 kcal in colazione |
| F01-E1 | nessun risultato -> crea alimento personalizzato -> aggiunto |
| F01-H2 | cardio corsa 30 min -> 412 kcal |
| F01-E2 | elimina + annulla, ricarica pagina, giorno dopo "copia da ieri" |
| F06-H1 | acqua +250 +500, passi 9.500 |
| F04-H1 | peso rapido 79,4; peso con data passata; grafico 90 g |
| F02-H1 | scheda Push, serie con dati, serie con target, timer recupero, ricarica a metà, termina |
| F02-H2 | secondo allenamento più pesante -> "Nuovo record" |
| F03-H1 | nuova scheda con esercizio cercato |
| F07-H1 | import da link `#/importa?passi=10.250&attive=1.279,6&peso=79,8` -> passi, peso, bonus kcal 302, url torna a #/oggi |
| F07-E1 | cardio a mano nel giorno con dati Watch non si somma |
| F07-H2 | incolla dati a mano (appunti non disponibili), campi non validi ignorati; payload vuoto -> messaggio |
| F02-E4 | quattro tocchi su +15 durante il recupero aggiungono un minuto |
| S13-N1 | macro che non sommano 100 -> errore; export JSON; tema scuro |

Unit test in `tests/calc.test.js` e `tests/store.test.js` (anche: numeri in formato italiano, payload di Salute, bonus energia attiva, dati danneggiati, import normalizzato): BMR, TDEE, soglie minime, macro, porzioni, MET,
1RM, volume, record, date (anni bisestili, cambio mese), streak, BMI.

Manuale (da fare sul telefono): installazione PWA, uso offline, vibrazione a fine recupero.

Bug trovati e chiusi: S2 barra recupero/tab bar coprivano i pulsanti in fondo
(scroll-padding); S3 riepilogo allenamento poteva aprirsi sopra un'altra pagina.

Accessibilità: axe-core su tutte le schermate, tema chiaro e scuro: nessuna violazione.
