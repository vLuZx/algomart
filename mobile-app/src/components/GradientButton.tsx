import type { ReactNode } from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, font, gradients, radius, shadows } from '../constants/theme';

interface GradientButtonProps {
  label: string;
  icon?: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function GradientButton({
  label,
  icon,
  onPress,
  disabled = false,
  style,
  contentStyle,
  textStyle,
}: Readonly<GradientButtonProps>) {
  return (
    <Pressable
      style={({ pressed }) => [styles.pressable, style, pressed && !disabled && styles.pressed]}
      onPress={onPress}
      disabled={disabled}
    >
      <LinearGradient
        colors={disabled ? [colors.textFaint, colors.bgCard] : gradients.amber}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.gradient, disabled && styles.disabled]}
      >
        <View style={[styles.content, contentStyle]}>
          {icon}
          <Text style={[styles.label, textStyle]}>{label}</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: radius.lg,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  gradient: {
    minHeight: 48,
    borderRadius: radius.lg,
    justifyContent: 'center',
    paddingHorizontal: 16,
    ...shadows.amber,
  },
  disabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    color: colors.accentText,
    fontSize: font.sizeSm,
    fontWeight: font.weightSemibold,
  },
});