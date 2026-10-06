# Build log

| screen | date | stato | note |
| --- | --- | --- | --- |
| shell + router + store | 2026-10-06 | done | hash router, localStorage versionato, modale `<dialog>` |
| S01 benvenuto/profilo | 2026-10-06 | done | validazione età/altezza/peso |
| S02 oggi | 2026-10-06 | done | anello calorie, macro, acqua, passi, peso, allenamento |
| S03 diario | 2026-10-06 | done | navigazione giorni, copia da ieri, annulla eliminazione |
| S04/S05 aggiungi/crea alimento | 2026-10-06 | done | ricerca senza accenti, recenti, porzioni rapide |
| S06 cardio | 2026-10-06 | done | kcal da MET sul peso attuale, modificabili |
| S07/S08/S09/S10/S11 allenamenti | 2026-10-06 | done | serie precedenti, timer recupero, record (Epley) |
| S12 progressi | 2026-10-06 | done | grafici SVG: peso, calorie, passi, allenamenti/settimana |
| S13 profilo | 2026-10-06 | done | macro personalizzati, tema, export/import |
| PWA | 2026-10-06 | done | service worker cache-first, manifest, icone |

Più difficile del previsto: evitare che il re-render perdesse il focus durante
l'inserimento delle serie (gli input aggiornano lo stato senza ri-renderizzare),
e una race tra hashchange e l'apertura del riepilogo allenamento (sistemata).

## Revisione completa (2026-10-06)

| problema | gravità | correzione |
| --- | --- | --- |
| Livelli di attività includevano gli allenamenti, che poi si sommavano di nuovo al budget | S2 | livelli riformulati come stile di vita senza allenamenti |
| Dati salvati danneggiati: l'app ripartiva vuota e li sovrascriveva | S1 | copia in `healthfit:v1:danneggiato:<ora>` prima di ripartire |
| Backup importato non validato nei tipi (id non escapati negli attributi HTML) | S2 | normalizzazione completa in `migrate`, escape di tutti gli id |
| Pulsanti del timer ricreati ogni secondo: un tocco poteva andare perso | S3 | struttura creata una volta, aggiornato solo il testo |
| Kcal degli allenamenti passati ricalcolate con il peso attuale | S4 | fissate al termine dell'allenamento |
| Percentuali macro fuori scala accettate (es. -10/60/50) | S3 | ogni macro tra 5% e 80% |
| Messaggi (toast) non annunciati dagli screen reader | S3 | regione live presente dall'avvio |
| Service worker cache-first: aggiornamenti visibili solo al secondo avvio | S3 | prima la rete (timeout 3 s), poi la cache |
| Axe: titolo h1 mancante nel diario, ordine titoli nelle schede, contrasto nella guida | S4 | corretti; axe pulito in chiaro e scuro |
| Schede-link con icona e testo su righe separate | S4 | layout `.card.row` |

Aggiunto: import da Salute / Apple Watch (S14, F07).
