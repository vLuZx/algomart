import type { ComponentType } from 'react';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlignJustify,
  BarChart2,
  Layers,
  User,
  Zap,
} from 'lucide-react-native';
import { colors, radius, shadows } from '../constants/theme';

type NavIcon = ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

interface NavItem {
  readonly label: string;
  readonly href: '/insights' | '/automations' | '/' | '/more' | '/profile';
  readonly icon: NavIcon;
  readonly match: (pathname: string) => boolean;
}

const navItems: readonly NavItem[] = [
  {
    label: 'Insights',
    href: '/insights',
    icon: BarChart2,
    match: (pathname) => pathname === '/insights' || pathname.startsWith('/insights/'),
  },
  {
    label: 'Automations',
    href: '/automations',
    icon: Zap,
    match: (pathname) => pathname === '/automations' || pathname.startsWith('/automations/'),
  },
  {
    label: 'Sessions',
    href: '/',
    icon: Layers,
    match: (pathname) => pathname === '/' || pathname.startsWith('/session/'),
  },
  {
    label: 'More',
    href: '/more',
    icon: AlignJustify,
    match: (pathname) => pathname === '/more' || pathname.startsWith('/more/'),
  },
  {
    label: 'Profile',
    href: '/profile',
    icon: User,
    match: (pathname) => pathname === '/profile' || pathname.startsWith('/profile/'),
  },
];

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const activePath = pathname ?? '/';
  const bottomPadding = useMemo(() => Math.max(insets.bottom, 8), [insets.bottom]);

  return (
    <View style={[styles.outerWrap, { paddingBottom: bottomPadding }]}> 
      <View style={styles.backdrop} />
      <View style={styles.navRow}>
        {navItems.map((item) => {
          const active = item.match(activePath);
          const Icon = item.icon;

          return (
            <Pressable
              key={item.label}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [styles.navItem, pressed && styles.navItemPressed]}
              onPress={() => router.replace(item.href)}
            >
              <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
                <Icon
                  size={24}
                  color={active ? colors.accent : colors.textSubtle}
                  strokeWidth={active ? 2.4 : 2}
                />
              </View>
              <View style={styles.indicatorSlot}>
                {active ? <View style={styles.indicator} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    position: 'relative',
    backgroundColor: colors.bgStrong,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    ...shadows.soft,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9, 9, 11, 0.92)',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 64,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItemPressed: {
    opacity: 0.88,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
  },
  indicatorSlot: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  indicator: {
    width: 32,
    height: 4,
    borderTopLeftRadius: radius.full,
    borderTopRightRadius: radius.full,
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
});