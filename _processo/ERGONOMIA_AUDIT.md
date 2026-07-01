# Audit ergonomico — whos-the-boss (2026-07-01)

> Sezione **CERCA** del blocco di controllo (richiesta utente): confronto delle
> nostre schermate/flussi con le best practice e le best app, per trovare idee di
> ergonomia "telefono-in-mano". La sezione **APPLICA** segue (solo le voci scelte).
> Nota: il **restyle visivo grande** è rimandato (ipotesi Claude Design) → qui si
> guarda l'**ergonomia del flusso**, non i colori; le voci pesanti si rimandano al restyle.

## Riferimenti (ricerca)
- **Thumb zone**: azioni primarie in basso (zona verde); bottom-third ~78% dei tap su telefoni grandi;
  bottone ≥48px. (parachutedesign, pageoneformula)
- **FAB**: l'azione primaria di **creazione** va su un FAB in basso-destra (thumb), **una per schermata**;
  non per azioni distruttive. (Material Design 3, Mobbin)
- **Nav**: bottom nav è thumb-friendly; **top tab/segmented** richiedono reach → ok solo per switching
  secondario, meglio con **swipe** (Spotify: 34% mis-tap sull'icona in alto a sinistra). (UXPin, Smashing)
- **Meno tap**: tap invece di typing; **stepper +/–** per numeri piccoli; **una** primary action per
  schermata; ma "tanti passi facili" > "pochi passi complessi". (Dropsource, NN/g steppers)

## Confronto per area (best app / noi / idea)

| Area | Best app | Noi (oggi) | Idea | Priorità |
|---|---|---|---|---|
| Azione "crea" (lista Leghe) | FAB "+" in basso-destra (thumb) | "+ Nuova lega" = bottone ghost **in fondo alla lista** (scrolli per trovarlo) | Ancorare "Nuova lega" **in basso** (docked) / FAB | **Alta** |
| Azione "crea" in sessione gioco | primary in basso | "+ Nuova partita" inline nel flusso | Valutare primary "Nuova partita" **in basso** | Media |
| Sub-tab lega (Home/Classifica/Storico/Giocatori) | top-tab **con swipe** | segmented in alto, **solo tap** | Aggiungere **swipe** tra le sezioni | Media (→ restyle) |
| Aggiungi gioco (hub serata) | primary in basso | ✅ già in basso (thumb zone) | — | ok |
| Inserimento numeri (buy-in, n. giocatori) | **stepper +/–** | input numerico da tastiera | Stepper +/– per valori piccoli | Bassa |
| GameBar (cambio gioco) | controlli frequenti in basso | barra in alto (yellow zone) | Cambio-gioco non frequente → accettabile | Bassa |
| Posizione primary in generale | 1 primary/schermata, in basso | mista (serata ok; "Nuova serata" card in alto) | Uniformare in basso dove sensato | Media |

## Proposta APPLICA — split (il restyle rifà i visual, quindi ora solo cheap & non sprecato)

**Applica ora (economico, thumb-zone, non buttato dal restyle):**
- **E1** — Leghe: **"+ Nuova lega" ancorato in basso** (footer docked), sempre a portata di pollice
  (oggi è in fondo alla lista). Stesso pattern del footer dell'hub serata.
- **E2** — Coerenza: dove c'è una primary action di creazione in una lista/hub, tenerla **in basso**.

**Rimanda al restyle (Claude Design) — più invasivo/di sistema:**
- **R-erg1** — sistema **FAB** unificato per le azioni "crea".
- **R-erg2** — **swipe** tra le sub-tab della lega (serve un pager).
- **R-erg3** — **stepper +/–** per gli input numerici.
- **R-erg4** — ripensare GameBar (posizione/gesture).

## Esito
Da confermare con l'utente **quali E-voci applicare ora**; le R-erg entrano nel backlog del restyle
(R12). Le voci pesanti non si toccano adesso per non fare lavoro doppio prima del redesign.
