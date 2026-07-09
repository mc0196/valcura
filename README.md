# ValCura

Demo cliccabile di una piattaforma di **assistenza di prossimità per anziani** in valle: richieste di servizi (spesa, farmaci, accompagnamenti, commissioni), assegnazione a collaboratori locali, report periodici alle famiglie fuori valle.

**Stato**: prototipo-pitch per convincere i soci fondatori — dati finti, nessun backend.

## Demo

- 4 ruoli commutabili con stato condiviso: **Coordinatore / Collaboratore / Famiglia / Admin**
- Storia: telefonata → il coordinatore registra la richiesta → assegna al collaboratore suggerito → "Fatto ✓" con nota → la riga appare nel report settimanale della famiglia
- Piani abbonamento Basic / Premium / Family Care (volume interventi + frequenza report)

## Stack

Vite + React + TypeScript — SPA client-side, seed dati in localStorage, gira in locale con `npm run dev`.
