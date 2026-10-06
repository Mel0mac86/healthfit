# Recon map: HealthFit (web PWA)

Scope: il "core loop" di tre categorie di app fitness, unite in una sola:
diario calorie e macro (tipo contatore calorie), registro allenamenti in
palestra (tipo workout tracker) e cruscotto salute di base (peso, passi, acqua).
For: uso personale, possibile prodotto da vendere dopo /replica-entrepreneur.
Date: 2026-10-06

## Sources

Funzioni studiate dalle pagine pubbliche, schede store e help center della
categoria (contatori calorie, workout tracker, app salute di sistema). Nessun
codice, asset, testo o API privata dell'originale. Gli screenshot di
riferimento non sono stati salvati in questa sessione: `replica/screens/`
resta vuoto e il diff di layout non è stato eseguito.

## Core loop

Ogni giorno: registro cosa mangio e come mi alleno, e vedo quanto mi manca
all'obiettivo.

## Screens

| ID | screen | route | purpose | key components | states |
| --- | --- | --- | --- | --- | --- |
| S01 | Benvenuto / profilo iniziale | primo avvio | calcola l'obiettivo | form, select | vuoto, errore |
| S02 | Oggi | #/oggi | riepilogo del giorno | anello calorie, barre macro, card acqua/passi/peso | vuoto, pieno, superato |
| S03 | Diario | #/diario | pasti ed esercizio di un giorno | navigatore data, liste pasti | vuoto, pieno |
| S04 | Aggiungi alimento | modale da S03 | cerca e dosa un alimento | ricerca, lista, input grammi | nessun risultato |
| S05 | Crea alimento | modale da S04 | alimento personalizzato | form | errore |
| S06 | Aggiungi cardio | modale da S03 | esercizio con kcal | select, minuti | |
| S07 | Allenamenti | #/allenamenti | schede, storico, record | liste, card | vuoto, pieno |
| S08 | Allenamento in corso | #/allenamento | registra serie | tabella serie, timer recupero | vuoto, in corso |
| S09 | Scegli esercizio | modale da S08/S10 | libreria esercizi | ricerca, filtro gruppo | nessun risultato |
| S10 | Modifica scheda | #/scheda/:id | crea/modifica routine | lista esercizi | vuota |
| S11 | Dettaglio allenamento | modale da S07 | rivedi sessione | tabella | |
| S12 | Progressi | #/progressi | peso, calorie, passi, allenamenti | grafici SVG | senza dati |
| S13 | Profilo | #/profilo | obiettivi e dati | form, export/import | |

## Flows

```
F01 Registro un pasto
    S03 -> S04 (cerca, tocco alimento, grammi) -> S03
    happy path clicks: 4
    edge: nessun risultato -> S05, grammi 0 o vuoti, giorno passato
F02 Faccio un allenamento da una scheda
    S07 -> S08 (spunto le serie, timer recupero) -> Termina -> S07
    edge: annullo, nessuna serie completata, esercizio senza storico
F03 Creo una scheda
    S07 -> S10 -> S09 -> S10 salva
F04 Registro il peso e vedo l'andamento
    S02 o S12 -> inserisco kg -> grafico aggiornato
F05 Imposto il profilo
    S01/S13 -> obiettivo calcolato -> S02
F06 Bevo acqua / registro passi
    S02 -> +250 ml / passi -> barra aggiornata
```

## Components

| component | variants | used on |
| --- | --- | --- |
| Button | primary, secondary, ghost, danger, icon | tutte |
| Card | default, stat | S02, S07, S12 |
| Progress ring / bar | calorie, macro, acqua, passi | S02, S03 |
| Modal (dialog) | — | S04, S05, S06, S09, S11 |
| Tab bar | 5 voci | tutte |
| Line chart / bar chart | — | S12 |
| Toast | info | tutte |

## Inferred data model

```
Profile   sex, age, heightCm, activity, goal, rate, overrides (kcal, macro %), waterMl, steps
Food      id, name, kcal/protein/carbs/fat per 100 g, portion g      confidence: high
Entry     id, day, meal, foodId, name, grams, kcal, p, c, f           confidence: high
Day       date, meals{}, waterMl, steps, cardio[]                     confidence: high
Weight    date, kg                                                    confidence: high
Routine   id, name, exercises[{name, sets, reps}]                     confidence: high
Workout   id, date, name, startedAt, durationSec, exercises[{name, sets[{kg, reps, done}]}]
```

## Out of scope

- Database alimenti crowdsourced dell'originale (contenuto suo)
- Community/feed, piani premium, sensori e smartwatch, sync cloud

## Size

Screens 13, flows 6, entities 7. Hard parts: stato dell'allenamento in corso,
grafici senza librerie, offline. Size: M.
