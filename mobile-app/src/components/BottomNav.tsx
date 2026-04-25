import type { ComponentType } from 'react';
import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlignJustify,
  BarChart2,
  Layers,
  User,
  Zap,
} from 'lucide-react-native';
import { colors, radius } from '../constants/theme';

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
  const bottomPadding = Math.max(insets.bottom, 8);

  // Per-tab animated scale values for spring press effect
  const scaleRefs = useRef(
    Object.fromEntries(navItems.map((item) => [item.label, new Animated.Value(1)])),
  ).current;

  const handlePressIn = (label: string) => {
    Animated.spring(scaleRefs[label], {
      toValue: 0.82,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = (label: string) => {
    Animated.spring(scaleRefs[label], {
      toValue: 1,
      useNativeDriver: true,
      speed: 12,
      bounciness: 10,
    }).start();
  };

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
              style={styles.navItem}
              onPressIn={() => handlePressIn(item.label)}
              onPressOut={() => handlePressOut(item.label)}
              onPress={() => router.replace(item.href)}
            >
              <Animated.View
                style={[
                  styles.iconWrap,
                  active && styles.iconWrapActive,
                  { transform: [{ scale: scaleRefs[item.label] }] },
                ]}
              >
                <Icon
                  size={24}
                  color={active ? colors.accent : colors.textSubtle}
                  strokeWidth={active ? 2.4 : 2}
                />
              </Animated.View>
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
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 12,
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