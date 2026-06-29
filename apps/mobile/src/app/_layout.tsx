import { Stack } from 'expo-router';

/* Layout radice minimo. La UI vera (tema feltro, navigazione) arriva in R1;
   qui una sola schermata, senza header. */
export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
