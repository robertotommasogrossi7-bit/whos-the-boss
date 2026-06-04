# CLEANUP — unificazione funzioni duplicate (prompt per chat Sonnet)

> Refactor meccanici a basso rischio individuati dall'audit del 2026-05-22.
> Il **dead code è già stato rimosso** (commit su `main`). Restano 3
> unificazioni di funzioni che fanno la stessa cosa. Sono cambiamenti interni:
> il comportamento dell'app NON deve cambiare, i 20 test devono restare verdi.

## Operativa
Sei una chat di FASE. Leggi prima `METODO.md` (desktop), `CONTESTO.md`,
`POKER_MAP.md`. Working dir: `poker-react/`.
Branch: da `main` aggiornato → `git checkout main && git pull && git checkout -b cleanup-unifica`.

## Cosa fare (3 unificazioni)

### 1. Avvio torneo: `avviaTorneo` + `riprendiTorneo` + `iniziaOra` (store)
In `src/store/useStore.ts`:
- `avviaTorneo` (guard `stato==='pre'`) e `riprendiTorneo` (guard `stato==='pausa'`)
  hanno corpo IDENTICO: `stato:'attivo'`, `inizio_livello_ms: Date.now() - (sess.trascorso_ms||0)`, `trascorso_ms: 0`.
- Crea una funzione modulo privata (fuori dal create, vicino a `emptyDb`):
  ```ts
  function sessioneTorneoAttiva(sess: Sessione): Sessione {
    return { ...sess, stato: 'attivo',
      inizio_livello_ms: Date.now() - (sess.trascorso_ms || 0), trascorso_ms: 0 };
  }
  ```
- `avviaTorneo` e `riprendiTorneo`: usano `sessioneTorneoAttiva(sess)` (cambia solo guard + toast).
- `iniziaOra` (azione della serata programmata): per il ramo TORNEO riusa
  `sessioneTorneoAttiva(sess)` e poi imposta `ora_inizio = nowHHMM()`; per il
  ramo CASH resta `{ ...sess, stato:'attivo', ora_inizio: nowHHMM() }`.
  → così sparisce la duplicazione della logica di avvio torneo.

### 2. `saldaTuttiDi` + `saldaTuttiDebiti` (store)
- `saldaTuttiDi(legaId, debtorId)` salda i settlements con `from===debtorId`.
- `saldaTuttiDebiti(legaId)` salda TUTTI i settlements (nessun filtro).
- Unifica: `saldaTuttiDi(legaId: number, debtorId?: number)` — se `debtorId`
  è `undefined`, salda tutti; altrimenti filtra per `from===debtorId`.
- Aggiorna l'interface `StoreActions`, rimuovi `saldaTuttiDebiti`.
- In `src/components/debiti/DebitiScreen.tsx`: la chiamata a `saldaTuttiDebiti(legaId)`
  diventa `saldaTuttiDi(legaId)` (senza secondo argomento).

### 3. `confermaChiusura` — coda comune cash/torneo (store)
Nei due rami (cash e torneo) le ultime righe sono identiche:
```ts
const serate_bg = [...(lega.serate_bg ?? [])];
const nuovaAttiva = serate_bg.shift();
saveLega({ ...lega, partite: [...lega.partite, partita], _pid: lega._pid+1, sessioneAttiva: nuovaAttiva, serate_bg });
setSettlement(null);
set({ serataView: 'hub', overlayOpen: false });
toast('✓ Serata salvata!');
```
Estrai un helper LOCALE dentro `confermaChiusura` (closure, ha già accesso a
get/set/saveLega/setSettlement/toast):
```ts
const salvaPartita = (partita: Partita) => { ...le righe sopra... };
```
e chiamalo in entrambi i rami. NON cambiare la logica di calcolo dei
settlement/giocatori sopra: solo la coda comune.

## Checklist fine fase
1. `npx tsc -b` verde
2. `npm run lint` verde
3. `npm test` → 20/20 verdi (comportamento invariato)
4. push dopo ogni commit (1 commit per ognuna delle 3 unificazioni)
5. NON mergiare: lascia il branch per la review.

## Cose da NON toccare
- Logica di calcolo settlement (`calcolaSettlement`, `calcolaSettlementTorneo`).
- Il campo dati `soldi_ricevuti` (legacy ma ancora nel modello salvato).
- `vanillaCompatStorage`.
