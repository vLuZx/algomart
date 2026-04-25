import { StyleSheet, View } from 'react-native';
import { Star } from 'lucide-react-native';
import { colors } from '../constants/theme';

interface RatingStarsProps {
  rating: number;
  size?: number;
}

export function RatingStars({ rating, size = 14 }: Readonly<RatingStarsProps>) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;
  const emptyStars = 5 - Math.ceil(rating);

  return (
    <View style={styles.row}>
      {Array.from({ length: fullStars }, (_, index) => (
        <Star
          key={`full-${index}`}
          size={size}
          color={colors.accent}
          fill={colors.accent}
          strokeWidth={1.9}
        />
      ))}

      {hasHalfStar ? (
        <View key="half" style={{ width: size, height: size }}>
          <Star size={size} color={colors.textFaint} strokeWidth={1.9} />
          <View style={[styles.halfStar, { width: size / 2, height: size }]}> 
            <Star
              size={size}
              color={colors.accent}
              fill={colors.accent}
              strokeWidth={1.9}
            />
          </View>
        </View>
      ) : null}

      {Array.from({ length: emptyStars }, (_, index) => (
        <Star key={`empty-${index}`} size={size} color={colors.textFaint} strokeWidth={1.9} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  halfStar: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'hidden',
  },
});