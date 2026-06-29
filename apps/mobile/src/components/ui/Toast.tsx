import { StyleSheet, Text, View } from 'react-native';

/* Toast — pill scura in basso (DESIGN_SPEC). Presentazionale: riceve msg +
   visible via props. In R1.3 lo aggancero' allo store (toastMsg/toastVisible). */
interface Props {
  message: string;
  visible: boolean;
}

export default function Toast({ message, visible }: Props) {
  if (!visible || !message) return null;
  return (
    <View pointerEvents="none" style={styles.wrap}>
      <View style={styles.pill}>
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 82, alignItems: 'center' },
  pill: {
    backgroundColor: 'rgba(10,10,10,0.88)',
    paddingVertical: 9, paddingHorizontal: 22, borderRadius: 24, maxWidth: '90%',
  },
  text: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
