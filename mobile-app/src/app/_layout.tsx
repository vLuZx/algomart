import { Stack, usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { colors } from '../constants/theme';
import { BottomNav } from '../components/BottomNav';
import { SessionProvider } from '../store/sessions';

export default function RootLayout() {
  const pathname = usePathname();
  const showBottomNav = pathname ? !/^\/session\/[^/]+\/scan$/.test(pathname) : true;

  return (
    <SessionProvider>
      <View style={styles.container}>
        <View style={styles.stackWrap}>
          <Stack screenOptions={{ headerShown: false }} />
        </View>
        {showBottomNav ? <BottomNav /> : null}
      </View>
    </SessionProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  stackWrap: {
    flex: 1,
  },
});
