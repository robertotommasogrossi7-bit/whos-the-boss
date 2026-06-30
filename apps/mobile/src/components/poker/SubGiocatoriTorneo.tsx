import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { euro, getNome, type Lega, type Sessione } from '@whos-the-boss/core';

import { IconPlus, IconTrophy, IconUsers, IconWarning } from '@/components/icons';
import { Button, Card, EmptyState, Sheet } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/ThemeContext';

/* Sub-tab PLAYER (torneo) — iscritti, rebuy/add-on, eliminazioni (con posizione),
   revive + stato pagamenti. Tavolo virtuale rimandato; prompt/confirm -> Sheet/Alert. */
function PayRow({ label, paid, onToggle }: { label: string; paid: boolean; onToggle: () => void }) {
  const t = useTheme();
  return (
    <View style={styles.payRow}>
      <Text style={[styles.lbl, { color: t.textMuted }]}>{label}</Text>
      <Pressable onPress={onToggle} style={[styles.payToggle, { backgroundColor: paid ? t.okSoft : t.dangerSoft, borderColor: paid ? t.ok : t.danger }]}>
        <Text style={{ color: paid ? t.ok : t.danger, fontWeight: '700', fontSize: 12 }}>{paid ? 'Pagato' : 'Non pagato'}</Text>
      </Pressable>
    </View>
  );
}

export default function SubGiocatoriTorneo({ lega, sess }: { lega: Lega; sess: Sessione }) {
  const t = useTheme();
  const toggleBuyInPagato = useStore((s) => s.toggleBuyInPagato);
  const torneoAggiungiGiocatore = useStore((s) => s.torneoAggiungiGiocatore);
  const torneoAddRebuy = useStore((s) => s.torneoAddRebuy);
  const torneoAddOn = useStore((s) => s.torneoAddOn);
  const torneoRevive = useStore((s) => s.torneoRevive);
  const torneoToggleAddOnPag = useStore((s) => s.torneoToggleAddOnPag);
  const torneoToggleRebuyPag = useStore((s) => s.torneoToggleRebuyPag);
  const torneoElimina = useStore((s) => s.torneoElimina);

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');

  const gameLvlNow = sess.livelli.slice(0, sess.livello_corrente + 1).filter((l) => l.tipo === 'gioco').length;
  const lateRegOpen = gameLvlNow <= sess.late_reg.fino_a_livello;
  const addOnAvailable = sess.add_on?.abilitato;
  const canAdd = lateRegOpen || sess.stato === 'pre';

  const inSess = new Set(sess.giocatori.map((g) => g.id_nome));
  const disponibili = lega.nomi.filter((n) => !inSess.has(n.id));

  function aggiungi(nome: string) {
    const n = nome.trim();
    if (!n) return;
    const err = torneoAggiungiGiocatore(lega.id, n);
    if (err) { Alert.alert('Attenzione', err); return; }
    setAddOpen(false); setNewName('');
  }
  function rebuy(idNome: number) {
    Alert.alert('Rebuy', 'Ha già versato i soldi del rebuy?', [
      { text: 'Da pagare', onPress: () => torneoAddRebuy(lega.id, idNome, false) },
      { text: 'Già versati', onPress: () => torneoAddRebuy(lega.id, idNome, true) },
    ]);
  }
  function addon(idNome: number) {
    Alert.alert('Add-on', "Ha già versato i soldi dell'add-on?", [
      { text: 'Da pagare', onPress: () => torneoAddOn(lega.id, idNome, false) },
      { text: 'Già versati', onPress: () => torneoAddOn(lega.id, idNome, true) },
    ]);
  }
  function elimina(idNome: number, nome: string) {
    Alert.alert(`Eliminare ${nome}?`, undefined, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: () => torneoElimina(lega.id, idNome) },
    ]);
  }

  const entrati = [...sess.giocatori].filter((g) => g.entrato).sort((a, b) => {
    if (a.eliminato !== b.eliminato) return a.eliminato ? 1 : -1;
    if (a.eliminato && b.eliminato) return (b.elim_ts_ms ?? 0) - (a.elim_ts_ms ?? 0);
    return 0;
  });

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Button variant="ghost" block disabled={!canAdd} onPress={() => setAddOpen(true)}>
        {canAdd ? '+ Aggiungi giocatore al torneo' : 'Late reg chiusa — non puoi aggiungere'}
      </Button>

      {sess.giocatori.length === 0 && (
        <EmptyState icon={<IconUsers size={46} color={t.textMuted} />} title="Nessun giocatore" hint="Aggiungi i giocatori al torneo." />
      )}

      {entrati.map((g) => {
        const nome = getNome(lega, g.id_nome);
        const totVersato = (g.buy_in_pagato ? sess.buy_in : 0)
          + (g.rebuys ?? []).reduce((a, r) => a + (r.pagata ? r.importo : 0), 0)
          + (g.add_on_fatto && g.add_on_pagato ? (sess.add_on?.prezzo ?? 0) : 0);
        const totDovuto = sess.buy_in
          + (g.rebuys ?? []).reduce((a, r) => a + r.importo, 0)
          + (g.add_on_fatto ? (sess.add_on?.prezzo ?? 0) : 0);
        const mancante = totDovuto - totVersato;

        return (
          <Card key={g.id_nome} style={g.eliminato ? styles.busted : undefined}>
            <View style={styles.head}>
              <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>{nome}</Text>
              {g.posizione_finale === 1 ? (
                <View style={styles.posBadge}><IconTrophy size={13} color={t.warn} /><Text style={[styles.posText, { color: t.warn }]}>1°</Text></View>
              ) : g.posizione_finale && g.eliminato ? (
                <Text style={[styles.posText, { color: t.textMuted }]}>#{g.posizione_finale}</Text>
              ) : null}
            </View>

            <View style={styles.row}>
              <Text style={[styles.lbl, { color: t.textMuted }]}>Stato</Text>
              <Text style={[styles.val, { color: g.eliminato ? t.danger : t.ok }]}>
                {g.eliminato ? `Eliminato${g.posizione_finale ? ' · #' + g.posizione_finale : ''}` : 'In gioco'}
              </Text>
            </View>

            <PayRow label={`Buy-in · ${euro(sess.buy_in)}`} paid={g.buy_in_pagato} onToggle={() => toggleBuyInPagato(lega.id, g.id_nome)} />
            {(g.rebuys ?? []).map((r, i) => (
              <PayRow key={i} label={`Rebuy ${i + 1} · ${euro(r.importo)}`} paid={!!r.pagata} onToggle={() => torneoToggleRebuyPag(lega.id, g.id_nome, i)} />
            ))}
            {g.add_on_fatto && (
              <PayRow label={`Add-on · ${euro(sess.add_on?.prezzo ?? 0)}`} paid={!!g.add_on_pagato} onToggle={() => torneoToggleAddOnPag(lega.id, g.id_nome)} />
            )}

            <View style={styles.row}>
              <Text style={[styles.lbl, { color: t.textMuted }]}>Totale versato</Text>
              <Text style={[styles.val, { color: t.text }]}>{euro(totVersato)} / {euro(totDovuto)}</Text>
            </View>
            {mancante > 0.005 && (
              <View style={[styles.mancante, { backgroundColor: t.warnSoft }]}>
                <IconWarning size={13} color={t.warn} /><Text style={[styles.mancanteText, { color: t.warn }]}>Mancano {euro(mancante)}</Text>
              </View>
            )}

            <View style={styles.actions}>
              {!g.eliminato ? (
                <>
                  {lateRegOpen && <Button size="sm" variant="ghost" onPress={() => rebuy(g.id_nome)}>+ Rebuy</Button>}
                  {addOnAvailable && !g.add_on_fatto && <Button size="sm" variant="ghost" onPress={() => addon(g.id_nome)}>+ Add-on</Button>}
                  <Button size="sm" variant="danger" onPress={() => elimina(g.id_nome, nome)}>Elimina</Button>
                </>
              ) : (
                <>
                  {lateRegOpen && <Button size="sm" variant="ghost" onPress={() => rebuy(g.id_nome)}>+ Rebuy (rientra)</Button>}
                  <Button size="sm" onPress={() => torneoRevive(lega.id, g.id_nome)}>Reintegra</Button>
                </>
              )}
            </View>
          </Card>
        );
      })}

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Aggiungi giocatore">
        {disponibili.length > 0 && (
          <>
            <Text style={[styles.label, { color: t.textMuted }]}>Dalla lega</Text>
            <View style={styles.chips}>
              {disponibili.map((n) => (
                <Pressable key={n.id} onPress={() => aggiungi(n.nome)} style={[styles.chip, { borderColor: t.border }]}>
                  <Text style={{ color: t.text, fontWeight: '600' }}>{n.nome}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
        <Text style={[styles.label, { color: t.textMuted, marginTop: 12 }]}>Oppure nuovo</Text>
        <View style={styles.addRow}>
          <TextInput
            style={[styles.input, styles.grow, { color: t.text, backgroundColor: t.surface2, borderColor: t.border }]}
            value={newName}
            onChangeText={setNewName}
            placeholder="Nome giocatore"
            placeholderTextColor={t.textMuted}
            autoCapitalize="words"
            onSubmitEditing={() => aggiungi(newName)}
          />
          <Button size="sm" onPress={() => aggiungi(newName)}><IconPlus size={18} color={t.accentInk} /></Button>
        </View>
      </Sheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  busted: { opacity: 0.65 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 16, fontWeight: '700', flex: 1 },
  posBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  posText: { fontSize: 13, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  lbl: { fontSize: 13, flexShrink: 1 },
  val: { fontSize: 14, fontWeight: '600' },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  payToggle: { borderWidth: 1, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 12 },
  mancante: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, marginTop: 6 },
  mancanteText: { fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, minHeight: 44 },
  grow: { flex: 1 },
});
