# MULTIGIOCO — SPEC

> Trasformazione della lega da "poker tracker" a "tracker di serate di gioco".
> Design discusso e deciso con l'utente (vedi `IDEE.md`, Idea 2). Questo file è
> il **contratto di design**: cosa costruire, in che ordine, cosa NON toccare.
> Implementazione in fasi separate (chat dedicate).

---

## 1. Scopo

Una **lega** non è più solo poker: è un gruppo di amici che gioca a **più
giochi**. Entri nella lega → scegli il gioco → vai alla sua schermata.

- **Poker**: resta esattamente com'è (modello complesso, soldi, settlement).
- **Altri giochi** (Magic, Yu-Gi-Oh, Pokémon, scopa, briscola, tresette, +
  custom): modello **leggero** — solo "chi ha giocato" e "chi ha vinto".

**Terminologia**: la sessione di gioco si chiama **"partita"**, NON "serata"
(si gioca anche di giorno).

---

## 2. Concetti

- **Lega**: contenitore di amici (`nomi`) + più giochi + partite di vari giochi.
- **Gioco**: poker (speciale) oppure un gioco semplice. Set **preimpostato**
  (con logo) + possibilità di **giochi custom** creati dall'utente.
- **Partita semplice**: una giocata di un gioco non-poker: partecipanti +
  vincitori (uno o più). Niente soldi.
- **Hub della lega**: la schermata che si apre cliccando la lega — scelta gioco
  + classifica globale + elenco giocatori.

---

## 3. Modello dati

### Nuovi tipi
```ts
interface GiocoLega {
  id: string;            // es. 'poker', 'magic', o 'custom-<n>'
  nome: string;          // "Poker", "Magic", "Burraco"...
  preimpostato: boolean;  // true = dal catalogo con logo; false = custom utente
  logo?: string;         // chiave logo o dataURL (solo preimpostati per ora)
  attivo: boolean;       // mostrato nell'hub di questa lega
}

interface PartitaSemplice {
  id: number;
  giocoId: string;       // → GiocoLega.id
  data: string;          // "YYYY-MM-DD"
  ora?: string;          // "HH:MM" opzionale
  partecipanti: number[];// id_nome dei presenti
  vincitori: number[];   // id_nome dei vincitori (0, 1 o più)
  note?: string;
}
```

### Estensione `Lega`
```ts
interface Lega {
  // ...campi esistenti (nomi, partite, sessioneAttiva, serate_bg, _nid, _pid)...
  giochi?: GiocoLega[];            // giochi attivi nella lega (poker incluso)
  partiteSemplici?: PartitaSemplice[];
  _psid?: number;                  // auto-increment id partita semplice
}
```

- `partite` (esistente) = partite **poker** (invariato).
- `partiteSemplici` (nuovo) = partite degli **altri giochi**.
- **Poker è sempre presente** come gioco (anche se `giochi` è vuoto/undefined →
  si assume poker disponibile, per retrocompatibilità).

### Catalogo giochi preimpostati (costante, non in localStorage)
Lista fissa con `{ id, nome, logo }`: poker, magic, yugioh, pokemon, scopa,
briscola, tresette (estendibile). Vive in un file tipo `utils/giochi.ts`.

### Migrazione (leghe esistenti)
- `giochi` undefined → l'app assume poker disponibile; nessuna scrittura forzata.
- `partiteSemplici` undefined → trattato come `[]`.
- Idempotente. **Nessun dato poker viene toccato.**

---

## 4. Navigazione (routing)

Oggi: `/app/:legaId` → entra DIRETTAMENTE nel poker (4 tab).

Nuovo:
| Route | Schermata |
|---|---|
| `/app/:legaId` | **HubLega** (nuovo): scelta gioco + classifica globale + giocatori |
| `/app/:legaId/poker/*` | App poker attuale (le 4 tab di oggi, invariate) |
| `/app/:legaId/g/:giocoId` | **GiocoView** (nuovo): gioco semplice |

- Il routing poker odierno (`AppLayout` + bottom nav + tab + overlay) si sposta
  **sotto `/poker`**, sostanzialmente invariato.
- La tab "Partecipanti" del poker **si sposta nell'hub** (i giocatori sono della
  lega, non del poker). Il poker continua a usare `lega.nomi`.

---

## 5. Hub della lega (`HubLega`)

Tre sezioni:
1. **Giochi**: griglia di card (poker + giochi attivi + "➕ Aggiungi gioco").
   - Tap su poker → `/app/:legaId/poker`.
   - Tap su altro gioco → `/app/:legaId/g/:giocoId`.
   - "Aggiungi gioco" → scegli da catalogo preimpostato o crea custom (nome).
2. **Classifica globale** (§7).
3. **Elenco giocatori della lega**: la gestione rubrica (aggiungi/elimina nome)
   spostata qui dall'attuale tab Partecipanti.

---

## 6. Schermata gioco semplice (`GiocoView`)

Per un gioco non-poker. Tre parti (tab o sezioni):
1. **Crea partita** (base):
   - selezione partecipanti (pill come nel setup poker, da `lega.nomi`);
   - selezione vincitore/i (0, 1 o più tra i partecipanti);
   - data (default oggi), ora opzionale, note opzionali;
   - salva → nuova `PartitaSemplice`.
2. **Classifica del gioco**: per ogni giocatore: partite giocate, vinte, %
   (ordinata per vinte o %). 👑 al migliore.
3. **Storico del gioco**: lista delle partite del gioco (data, partecipanti,
   vincitori), con elimina.

---

## 7. Classifiche

### Classifica per gioco (dentro GiocoView)
Per i giochi semplici: per ogni `id_nome` → `giocate` (è in `partecipanti`),
`vinte` (è in `vincitori`), `perc = vinte/giocate`.

### Classifica globale (nell'hub)
Tabella: **righe = giocatori**, **una colonna per gioco**.
- Cella di un gioco semplice = **% vinte/giocate** (es. "60%").
- 👑 nella colonna = a chi ha **più vittorie assolute** in quel gioco.
- Colonna **poker** = metrica poker (es. **serate vinte**, coerente con la
  corona = chi ha vinto più serate). Il poker mantiene comunque la sua
  classifica dettagliata dentro `/poker`.
- Scelta "1 colonna per gioco" per non far esplodere la tabella con 10+ giochi.

---

## 8. Ruoli e permessi — FASE FUTURA (richiede backend)

Modello deciso (NON implementabile in locale single-device):
- **super-admin di lega**: permessi totali.
- **admin di un singolo gioco** (es. admin Magic): permessi solo su quel gioco.
- **membro**: chi non ha permessi su un gioco deve **chiedere all'admin** per
  avviare una partita di quel gioco.

Richiede **utenti veri** che si collegano (identità persistente tra
dispositivi) → dipende dal **backend (Supabase)**. In locale, l'unico
dispositivo è l'admin: i ruoli si rimandano.

---

## 9. Fasi di implementazione

1. **Fase M1 — Modello dati**: tipi `GiocoLega`/`PartitaSemplice`, estensione
   `Lega`, catalogo `utils/giochi.ts`, migrazione idempotente. + funzioni pure
   di calcolo classifica (giocate/vinte/%) con test Vitest. Nessuna UI.
2. **Fase M2 — Hub + routing**: `HubLega`, sposta il poker sotto `/poker`,
   sposta la gestione giocatori nell'hub. Poker invariato.
3. **Fase M3 — Gioco semplice**: `GiocoView` (crea partita + classifica +
   storico) + azioni store (`addPartitaSemplice`, `eliminaPartitaSemplice`,
   `aggiungiGioco`, ...).
4. **Fase M4 — Classifica globale** nell'hub.
5. **Fase M5 (post-backend) — Ruoli/permessi.**

Ogni fase = branch dedicato, micro-commit, push, test, review prima del merge.

---

## 10. Cosa NON toccare

- **Tutto il poker**: modello (`Sessione`, `Partita`, settlement cash/torneo),
  overlay, timer, chiusura. Si SPOSTA sotto `/poker` ma non cambia.
- `vanillaCompatStorage` (retrocompat dati).
- Le funzioni pure `calcolaSettlement` / `calcolaSettlementTorneo`.

## 11. Decisioni prese (rif. IDEE.md, 2026-05-22)
- Vincitori per partita: numero qualunque (0/1/più).
- Giochi: preimpostati (con logo) + custom (con schermate base automatiche).
- Classifica globale: 1 colonna/gioco con % + 👑; poker = serate vinte.
- Ruoli per-gioco + super-admin: confermati, ma in fase post-backend.
