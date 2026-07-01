import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { computeLive, euro, euroSigned, getNome, tempoGiocoMs, type Lega, type Sessione } from '@whos-the-boss/core';

import { IconClock, IconCoins } from '@/components/icons';
import ImportoSheet from '@/components/poker/ImportoSheet';
import { Button, Card, EmptyState, Sheet } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/ThemeContext';

/* TAVOLO LIVE (R5c) — il "tavolo con le sedie": rende i posti già assegnati
   (seat), la cassa (piatto) e il menù rapido sul giocatore (ricarica / cash-out).
   Riusa computeLive (conto), esceDalTavolo (uscita), tempoGiocoMs (timer),
   ImportoSheet (importi). Grafica funzionale ora → bella col restyle. */
function hhmm(ms: number): string {
  const min = Math.floor(ms / 60000);
  const h = Math.floor(min / 60);
  return h > 0 ? `${h}h ${min % 60}m` : `${min}m`;
}

export default function TavoloView({ lega, sess }: { lega: Lega; sess: Sessione }) {
  const t = useTheme();
  const esceDalTavolo = useStore((s) => s.esceDalTavolo);
  const aggiungiRicarica = useStore((s) => s.aggiungiRicarica);

  const [menuId, setMenuId] = useState<number | null>(null);
  const [esceId, setEsceId] = useState<number | null>(null);
  const [ricId, setRicId] = useState<number | null>(null);

  const { arr } = computeLive(sess);
  const contoDi = (id: number) => arr.find((c) => c.id_nome === id);
  const now = Date.now();

  const seduti = sess.giocatori.filter((g) => g.entrato && !g.uscito);
  const usciti = sess.giocatori.filter((g) => g.uscito);
  const tavoli = [...new Set(seduti.map((g) => g.seat?.tavolo ?? 1))].sort((a, b) => a - b);

  const cassa = arr.reduce((a, c) => a + (c.versato ?? 0), 0);
  const dovutoTot = arr.filter((c) => c.entrato).reduce((a, c) => a + c.dovuto, 0);

  const menuNome = menuId != null ? getNome(lega, menuId) : '';

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <View style={styles.cassaRow}>
          <IconCoins size={20} color={t.accent} />
          <Text style={[styles.cassaLbl, { color: t.textMuted }]}>Nel piatto</Text>
          <Text style={[styles.cassaVal, { color: t.text }]}>{euro(cassa)}</Text>
        </View>
        <Text style={[styles.cassaSub, { color: t.textMuted }]}>Dovuto totale {euro(dovutoTot)}</Text>
      </Card>

      {seduti.length === 0 ? (
        <EmptyState title="Tavolo vuoto" hint="Fai entrare i giocatori dalla scheda Giocatori." />
      ) : (
        tavoli.map((tav) => (
          <View key={tav} style={styles.tavolo}>
            {tavoli.length > 1 ? <Text style={[styles.tavHdr, { color: t.textMuted }]}>Tavolo {tav}</Text> : null}
            <View style={styles.seats}>
              {seduti
                .filter((g) => (g.seat?.tavolo ?? 1) === tav)
                .sort((a, b) => (a.seat?.posto ?? 0) - (b.seat?.posto ?? 0))
                .map((g) => {
                  const netto = contoDi(g.id_nome)?.netto ?? 0;
                  const nettoColor = netto > 0 ? t.ok : netto < 0 ? t.danger : t.textMuted;
                  return (
                    <Pressable
                      key={g.id_nome}
                      onPress={() => setMenuId(g.id_nome)}
                      style={[styles.seat, { backgroundColor: t.surface, borderColor: t.border }]}
                    >
                      <Text style={[styles.seatName, { color: t.text }]} numberOfLines={1}>{getNome(lega, g.id_nome)}</Text>
                      <Text style={[styles.seatNetto, { color: nettoColor }]}>{euroSigned(netto)}</Text>
                      <View style={styles.seatMeta}>
                        <IconClock size={11} color={t.textMuted} />
                        <Text style={[styles.seatTime, { color: t.textMuted }]}>{hhmm(tempoGiocoMs(g, now))}</Text>
                      </View>
                    </Pressable>
                  );
                })}
            </View>
          </View>
        ))
      )}

      {usciti.length > 0 && (
        <View style={styles.tavolo}>
          <Text style={[styles.tavHdr, { color: t.textMuted }]}>Usciti</Text>
          {usciti.map((g) => (
            <View key={g.id_nome} style={[styles.uscitoRow, { borderColor: t.border }]}>
              <Text style={[styles.uscitoName, { color: t.textMuted }]}>{getNome(lega, g.id_nome)}</Text>
              <Text style={[styles.seatTime, { color: t.textMuted }]}>
                uscito {g.ora_uscita ?? ''} · {euro(g.valore_uscita ?? 0)}
              </Text>
            </View>
          ))}
        </View>
      )}

      <Sheet open={menuId != null} onClose={() => setMenuId(null)} title={menuNome}>
        <View style={styles.menu}>
          <Button block variant="ghost" onPress={() => { const id = menuId; setMenuId(null); setRicId(id); }}>
            + Ricarica
          </Button>
          <Button block variant="danger" onPress={() => { const id = menuId; setMenuId(null); setEsceId(id); }}>
            Esce dal tavolo (cash-out)
          </Button>
        </View>
      </Sheet>

      <ImportoSheet
        open={esceId != null}
        title="Fiche all'uscita (€)"
        initial={esceId != null ? contoDi(esceId)?.fiches : undefined}
        onClose={() => setEsceId(null)}
        onConfirm={(v) => { if (esceId != null) esceDalTavolo(lega.id, esceId, v); setEsceId(null); }}
      />
      <ImportoSheet
        open={ricId != null}
        title="Ricarica (€)"
        onClose={() => setRicId(null)}
        onConfirm={(v) => { if (ricId != null) aggiungiRicarica(lega.id, ricId, v, false); setRicId(null); }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  cassaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cassaLbl: { flex: 1, fontSize: 14, fontWeight: '600' },
  cassaVal: { fontSize: 20, fontWeight: '800' },
  cassaSub: { fontSize: 12, marginTop: 6 },
  tavolo: { gap: 8 },
  tavHdr: { fontSize: 12, fontWeight: '700' },
  seats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  seat: { width: '30%', flexGrow: 1, minWidth: 100, borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  seatName: { fontSize: 14, fontWeight: '700' },
  seatNetto: { fontSize: 16, fontWeight: '800' },
  seatMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seatTime: { fontSize: 11 },
  uscitoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  uscitoName: { fontSize: 14, fontWeight: '600' },
  menu: { gap: 10, paddingBottom: 8 },
});
