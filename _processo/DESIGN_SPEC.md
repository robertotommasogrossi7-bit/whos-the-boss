# CARD TRACKER — DESIGN SPEC (sistema grafico)

> Contratto del **look & feel** dell'app. Vale per il restyle del poker esistente
> e per TUTTE le nuove schermate multi-gioco. Le chat di fase che toccano la UI
> leggono questo file. Deciso con l'utente il 2026-05-31.
>
> Obiettivo dichiarato dell'utente: una grafica **professionale, da Play Store**,
> non un prototipo. Niente emoji come icone.

---

## 1. Direzione (decisa)

- **Tema base: SCURO.** Sfondo scuro, card più chiare, testo chiaro.
- **Accento dinamico PER GIOCO**: ogni gioco ha un colore. Quando selezioni un
  gioco (dal filtro in alto), tutta l'app si ri-colora con il suo accento, e
  l'accento **resta in alto anche cambiando schermata** (Home / Classifica /
  Storico). Vedi §5.
- **Eccezione POKER**: il poker NON usa il tema piatto scuro, ha una **grafica
  speciale a feltro verde** (panno da tavolo) con accenti oro. È l'unico gioco
  con un tema "fisico". Tutti gli altri usano il tema scuro + il loro accento.
- **Mobile-first**: pensata per il telefono (target finale anche Play Store via
  React Native in futuro). Touch target ≥ 44px, niente hover-only.

---

## 2. Token (CSS variables)

Oggi `styles.css` ha già un `:root` (tema chiaro). Il restyle (fase R) lo
**sostituisce** con i token scuri qui sotto. Tutto il colore passa da variabili:
nessun colore hardcoded nei componenti (regola già in vigore: niente inline style).

```css
:root {
  /* Superfici (tema scuro, default per tutti i giochi tranne poker) */
  --bg:        #0F1115;   /* sfondo app */
  --surface:   #1A1D23;   /* card / barre */
  --surface-2: #232730;   /* card sopra card, input */
  --border:    #2C313B;
  --text:      #F2F4F8;
  --text-muted:#9AA3B2;
  --shadow:    0 4px 16px rgba(0,0,0,.35);
  --radius:    14px;
  --radius-sm: 10px;

  /* Accento dinamico: lo setta il gioco selezionato (default = generico) */
  --accent:      #5B8DEF;
  --accent-ink:  #FFFFFF;  /* testo sopra l'accento */
  --accent-soft: #5B8DEF22;/* sfondo tenue dell'accento (badge, chip) */

  /* Semantici (fissi, non cambiano col gioco) */
  --ok:    #2E9E5B;
  --warn:  #E2B33C;
  --danger:#D24B40;
}
```

- `--accent-soft` = stesso colore con alpha ~`22` (13%). I componenti usano
  `--accent` (pieno), `--accent-soft` (sfondo tenue), `--accent-ink` (testo sopra).
- Il **poker** applica un set extra (vedi §6): sfondo a feltro, `--accent` oro.

### Tipografia
- UI: **Inter** (licenza SIL OFL, gratis, ok Play Store) self-hosted in
  `public/fonts/`, con fallback system `-apple-system, 'Segoe UI', Roboto, sans-serif`.
  Inter è opzionale: se complica la fase, si resta sul system stack.
- Pesi: 400 testo, 600 label, 700/800 titoli. Niente font "fantasia".

### Spaziatura / forme
- Scala spazi: 4 / 8 / 12 / 16 / 24 / 32.
- Raggi: card 14px, input/bottoni 10–12px, pill 999px.
- Ombre solo per elevare (card, sheet), mai bordi + ombra forte insieme.

---

## 3. Componenti standard (libreria minima)

Da costruire una volta e riusare ovunque (in `src/components/ui/`):
- **Button**: varianti `primary` (sfondo `--accent`), `ghost` (bordo), `danger`.
- **Card**: contenitore base `--surface`, raggio, ombra.
- **Chip / Tag**: pill piccola, sfondo `--accent-soft`, testo `--accent`.
- **GameBar** (barra filtro gioco): vedi §5.
- **BottomNav**: nav principale (vedi MULTIGIOCO_SPEC §"Mappa dell'app").
- **Sheet / Modal**: pannello dal basso (mobile), sfondo `--surface`.
- **ListRow**: riga elenco (avatar + nome + valore a destra).
- **Avatar**: cerchio con iniziale o foto giocatore.
- **EmptyState**: icona + testo quando una lista è vuota (no "schermata bianca").
- **GameIcon**: vedi §4.

> Il poker esistente NON va riscritto: la fase R **ri-veste** le sue schermate
> usando gli stessi token/classi, senza cambiarne la logica.

---

## 4. Icone e identità dei giochi (NIENTE emoji, NIENTE loghi ufficiali)

**Vincolo legale**: i loghi di Magic, Yu-Gi-Oh!, Pokémon, UNO… sono protetti.
**Non vanno nel repo.** Usare il *nome* del gioco come etichetta è lecito (uso
descrittivo); riprodurne il logo no.

**Soluzione (definitiva, Play-Store-safe):**
- Ogni gioco ha un'**icona SVG originale** disegnata da noi (componente React in
  `src/components/icons/giochi/`), monocroma, che prende il colore da `--accent`.
- Niente emoji (decisione utente: spesso brutte e incoerenti tra piattaforme).
- Per le **icone di interfaccia** (frecce, +, ⚙, 👤…) si disegnano SVG originali
  inline (niente dipendenze, niente emoji). Set piccolo e coerente.
- L'utente può sempre **caricare una foto** per un gioco (campo `foto` già nel
  modello): sostituisce l'icona, resta **solo in locale** (dataURL), non sul repo.

### Glifi per gioco (originali, semplici, riconoscibili)
- **Giochi di carte tradizionali** → usare i **semi** (simboli di pubblico
  dominio): picche/cuori/quadri/fiori e i semi italiani coppe/bastoni/denari/spade.
- **TCG di marca** (Magic/Yu-Gi-Oh!/Pokémon) → glifo **neutro e originale** (es.
  "carta con scintilla/stella"), differenziati dal **colore accento** e dal nome.
  NON usare forme iconiche del brand (pokéball, occhio del Millennio, ecc.).
- **Generico** → icona "mazzo di carte".

### Catalogo preimpostato (id, nome, accento, tema)

| id | nome (label) | accento | tema | glifo |
|---|---|---|---|---|
| `poker` | Poker | `#1E8A4C` verde + oro `#E2B33C` | **feltro** | picche ♠ |
| `generico` | Generico | `#5B8DEF` blu | scuro | mazzo |
| `scopa` | Scopa | `#D24B40` rosso | scuro | coppe |
| `briscola` | Briscola | `#2E8B5A` verde | scuro | bastoni |
| `tressette` | Tressette | `#C2912E` oro | scuro | denari |
| `burraco` | Burraco | `#C24E8E` magenta | scuro | due mazzi |
| `scala40` | Scala 40 | `#4E8DB0` azzurro | scuro | scala num. |
| `uno` | Uno | `#D33A2C` rosso | scuro | cerchio "1" |
| `magic` | Magic | `#C9772F` ambra | scuro | carta+scintilla |
| `yugioh` | Yu-Gi-Oh! | `#B07A2A` bronzo | scuro | carta+stella |
| `pokemon` | Pokémon | `#E6B400` giallo | scuro | carta+stella |

- **Custom**: accento derivato in modo deterministico dal nome (hash → HSL), glifo
  generico, foto opzionale. Vedi MULTIGIOCO_SPEC §9.
- La lista è estendibile: aggiungere un gioco = una riga nel catalogo
  (`src/utils/giochi.ts`) + il suo glifo SVG.

### Identità app (icona Play Store)
- Nome di lavoro: **Card Tracker** (vedi DECISIONI.md).
- Idea icona app: **mazzo di carte stilizzato** (3 carte a ventaglio) su sfondo
  scuro con un accento. Originale, niente semi di brand. Da rifinire nella fase
  di rebranding (M5); qui basta fissare la direzione.

---

## 5. Filtro-gioco persistente + ri-tema (cuore della UX)

Richiesta esplicita dell'utente. In alto, su **Home / Classifica / Storico**
(NON dentro una Lega), c'è una **GameBar**:
- mostra il gioco attualmente selezionato (icona + nome + accento) e permette di
  cambiarlo (tap → elenco giochi);
- al cambio gioco, aggiorna `--accent` (+ derivati) sul contenitore radice →
  **tutta l'app si ri-colora**;
- la scelta **persiste tra le schermate** (stato globale, es. nello store:
  `giocoFiltro`) e tra le sessioni (localStorage).
- selezionare il **poker** attiva il tema feltro (§6) anche nelle viste comuni.

Meccanismo tecnico: un attributo sul root, es. `<div data-tema={tema}>` dove
`tema = 'poker' | 'scuro'`, e le variabili `--accent*` settate inline-via-classe
o via style sul root **solo per l'accento** (eccezione tollerata: è un valore
dinamico, non uno stile di layout). Tutto il resto resta in CSS.

### Lega mono-gioco (admin)
Dentro una **Lega**, l'admin può "bloccare" un gioco → la lega diventa
mono-gioco: la GameBar sparisce/è fissa su quel gioco. (I ruoli admin veri sono
post-backend; in locale è un flag sulla lega, vedi MULTIGIOCO_SPEC.)

---

## 6. Tema speciale POKER (feltro)

Quando `data-tema="poker"`:
```css
[data-tema="poker"] {
  --bg:      #0E3D24;                 /* verde feltro scuro */
  --surface: #145232;                 /* panno più chiaro */
  --surface-2:#0B311D;
  --border:  #1C6B41;
  --accent:  #E2B33C;                 /* oro */
  --accent-ink:#1A1A1A;
  --text:    #F3F8F4;
  --text-muted:#B7D2C2;
}
[data-tema="poker"] .app-bg { background-image: <texture feltro leggera>; }
```
- Texture feltro: pattern CSS leggero (gradiente/rumore) o un PNG piccolo in
  `public/` (originale, non un asset di marca). Sottile, non invadente.
- Il poker mantiene il suo verde/oro storici (coerente con l'attuale).

---

## 7. Piano di restyle (fase R) — cosa fa, cosa NON fa

**Fa:**
1. Introduce i token scuri (§2) e il meccanismo `--accent` / `data-tema` (§5).
2. Ri-veste le schermate poker esistenti col tema feltro (§6) — **solo CSS/classi**.
3. Crea la libreria UI minima (§3) e le prime icone SVG (§4).

**NON fa:**
- Non cambia la LOGICA del poker (store, settlement, timer, overlay): solo aspetto.
- Non introduce i giochi nuovi (è M1–M5): la fase R prepara il terreno grafico.

**Ordine consigliato**: fare il grosso dei token in **M2** (quando nasce la shell
multi-gioco), e un **passaggio R dedicato** per ripulire le viste poker. Vedi
CONTESTO.md per la sequenza definitiva.

---

## 8. Regole d'oro (per ogni fase UI)
1. Colori **solo** da variabili `--*`. Mai esadecimali nei componenti.
2. **Niente emoji** come icone. SVG originali, monocromi, colorati da `--accent`.
3. **Niente loghi di marca** nel repo. Nomi sì (label), loghi no.
4. Niente inline style tranne il **valore dinamico dell'accento** sul root.
5. Mobile-first, touch ≥44px, sempre uno stato vuoto (EmptyState).
6. Riusare i componenti di §3, non reinventarli per schermata.
