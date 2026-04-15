import { Stack } from 'expo-router';
import { SessionProvider } from '../store/sessions';

export default function RootLayout() {
  return (
    <SessionProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SessionProvider>
  );
}
