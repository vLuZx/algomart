import { useState } from 'react';
import { Image, View, StyleSheet } from 'react-native';
import type { ImageProps, ImageStyle, StyleProp } from 'react-native';
import { ImageOff } from 'lucide-react-native';
import { colors, radius } from '../constants/theme';

interface ImageWithFallbackProps extends Omit<ImageProps, 'style'> {
  style?: StyleProp<ImageStyle>;
}

export function ImageWithFallback({ style, ...props }: Readonly<ImageWithFallbackProps>) {
  const [didError, setDidError] = useState(false);

  if (didError) {
    return (
      <View style={[styles.fallback, style]}>
        <ImageOff size={24} color={colors.textFaint} strokeWidth={1.5} />
      </View>
    );
  }

  return (
    <Image
      {...props}
      style={style}
      onError={() => setDidError(true)}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
