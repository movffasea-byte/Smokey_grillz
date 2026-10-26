import { StyleSheet, View } from 'react-native';
import { SafeAreaView, type SafeAreaViewProps } from 'react-native-safe-area-context';

import { colors } from '@/theme/colors';

// Soft radial glow faked with stacked translucent circles (no gradient or blur dependency needed).
function Glow({ color, size, style }: { color: string; size: number; style: object }) {
  const rings = 12;
  return (
    <View pointerEvents="none" style={[styles.glow, { width: size, height: size }, style]}>
      {Array.from({ length: rings }, (_, i) => {
        const d = size * (1 - i / rings);
        return (
          <View
            key={i}
            style={{ position: 'absolute', width: d, height: d, borderRadius: d / 2, backgroundColor: color, opacity: 0.035 }}
          />
        );
      })}
    </View>
  );
}

// Screen background (dark base + ember glows) plus the safe-area wrapper. Drop-in for SafeAreaView.
export function Screen({ style, children, ...rest }: SafeAreaViewProps) {
  return (
    <View style={styles.root}>
      <Glow color={colors.primary} size={420} style={{ top: -140, right: -160 }} />
      <Glow color={colors.accent} size={380} style={{ bottom: -160, left: -170 }} />
      <SafeAreaView style={[styles.fill, style]} {...rest}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, overflow: 'hidden' },
  fill: { flex: 1 },
  glow: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
