import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { EsitoImport } from '@whos-the-boss/core';

import { Button, Card } from '@/components/ui';
import { contaDatiLocali, importaSulCloud } from '@/lib/import';
import { useTheme } from '@/theme/ThemeContext';

/* IMPORT ONE-SHOT (R7.3c) — la schermata che carica i dati del telefono sul
   proprio account, una volta sola. Volutamente minima: la sostanza è tutta
   nell'orchestratore (core, testato). Qui contano due cose di UX, entrambe
   dalla ricerca local-first: dire SEMPRE cosa sta succedendo ai dati, e
   permettere di RIPROVARE dopo un errore.
   Nota: l'import non cancella mai il telefono → in caso di guaio i dati sono
   ancora tutti qui. */
export default function ImportScreen() {
  const t = useTheme();
  const [inCorso, setInCorso] = useState(false);
  const [esito, setEsito] = useState<EsitoImport | null>(null);
  const [righe] = useState(() => contaDatiLocali());

  async function avvia() {
    setInCorso(true);
    setEsito(null);
    setEsito(await importaSulCloud());
    setInCorso(false);
  }

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.wrap}>
      <Card style={styles.card}>
        <Text style={[styles.h, { color: t.text }]}>Carica i dati sul tuo account</Text>
        <Text style={[styles.p, { color: t.textMuted }]}>
          Le leghe, le partite e i conti salvati su questo telefono vengono copiati sul tuo account,
          così li ritrovi anche sugli altri dispositivi. Si fa <Text style={{ fontWeight: '700' }}>una volta sola</Text>.
        </Text>
        <Text style={[styles.p, { color: t.textMuted }]}>
          I dati restano comunque su questo telefono: se qualcosa va storto non perdi niente.
        </Text>
        <Text style={[styles.conteggio, { color: t.text }]}>{righe} elementi da caricare</Text>
      </Card>

      {esito?.stato === 'ok' ? (
        <Card style={[styles.card, { borderColor: t.ok }]}>
          <Text style={[styles.h, { color: t.ok }]}>Fatto ✓</Text>
          <Text style={[styles.p, { color: t.textMuted }]}>
            I tuoi dati sono sul cloud ({Object.values(esito.conteggi).reduce((a, b) => a + b, 0)} righe salvate).
          </Text>
          {esito.anomalie.length > 0 ? (
            <View style={[styles.avviso, { backgroundColor: t.surface2, borderRadius: t.radiusSm }]}>
              <Text style={[styles.avvisoT, { color: t.text }]}>Da controllare (importati lo stesso):</Text>
              {esito.anomalie.map((a, i) => (
                <Text key={i} style={[styles.p, { color: t.textMuted }]}>• {a.messaggio}</Text>
              ))}
            </View>
          ) : null}
        </Card>
      ) : null}

      {esito?.stato === 'gia_importato' ? (
        <Card style={[styles.card, { borderColor: t.accent }]}>
          <Text style={[styles.h, { color: t.text }]}>Questo account ha già dei dati</Text>
          <Text style={[styles.p, { color: t.textMuted }]}>
            Hai già caricato i dati da un altro dispositivo. Quelli di questo telefono non sono andati persi:
            verranno uniti a quelli sul cloud alla prossima sincronizzazione.
          </Text>
        </Card>
      ) : null}

      {esito?.stato === 'bloccato' ? (
        <Card style={[styles.card, { borderColor: t.danger }]}>
          <Text style={[styles.h, { color: t.danger }]}>Non posso caricare</Text>
          <Text style={[styles.p, { color: t.textMuted }]}>Ci sono dei problemi nei dati salvati:</Text>
          {esito.problemi.map((p, i) => (
            <Text key={i} style={[styles.p, { color: t.textMuted }]}>• {p.messaggio}</Text>
          ))}
        </Card>
      ) : null}

      {esito?.stato === 'errore' ? (
        <Card style={[styles.card, { borderColor: t.danger }]}>
          <Text style={[styles.h, { color: t.danger }]}>Non ha funzionato</Text>
          <Text style={[styles.p, { color: t.textMuted }]}>{esito.messaggio}</Text>
          <Text style={[styles.p, { color: t.textMuted }]}>
            I dati sono ancora tutti sul telefono: puoi riprovare.
          </Text>
        </Card>
      ) : null}

      {inCorso ? (
        <View style={styles.loader}>
          <ActivityIndicator color={t.accent} />
          <Text style={[styles.p, { color: t.textMuted }]}>Caricamento in corso, non chiudere l’app…</Text>
        </View>
      ) : (
        <Button block onPress={avvia} disabled={esito?.stato === 'ok' || righe === 0}>
          {esito && esito.stato !== 'ok' ? 'Riprova' : 'Carica sul cloud'}
        </Button>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 12 },
  card: { gap: 8 },
  h: { fontSize: 18, fontWeight: '800' },
  p: { fontSize: 14, lineHeight: 20 },
  conteggio: { fontSize: 15, fontWeight: '700', marginTop: 4 },
  avviso: { padding: 10, gap: 4, marginTop: 4 },
  avvisoT: { fontSize: 13, fontWeight: '700' },
  loader: { alignItems: 'center', gap: 8, paddingVertical: 12 },
});
