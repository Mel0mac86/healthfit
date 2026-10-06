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
