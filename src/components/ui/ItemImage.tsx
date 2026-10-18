import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

const EMOJI: Record<string, string> = {
  shawarma: '🌯',
  'loaded-fries': '🍟',
  'gas-meat': '🍖',
  noodles: '🍜',
  masa: '🥞',
};

type Props = { uri: string | null; categorySlug?: string; size?: number; height?: number };

// Shows the item photo when there is one, otherwise a category emoji tile.
export function ItemImage({ uri, categorySlug, size, height }: Props) {
  const box = size ? { width: size, height: size } : { width: '100%' as const, height: height ?? 160 };
  if (uri) return <Image source={{ uri }} style={[styles.base, box]} contentFit="cover" />;
  return (
    <View style={[styles.base, styles.tile, box]}>
      <Text style={{ fontSize: (size ?? height ?? 160) * 0.45 }}>{(categorySlug && EMOJI[categorySlug]) || '🔥'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 12, backgroundColor: colors.surfaceAlt },
  tile: { alignItems: 'center', justifyContent: 'center' },
});
