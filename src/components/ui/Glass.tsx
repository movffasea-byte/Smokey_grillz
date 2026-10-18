import { Platform, StyleSheet, View, type ViewProps } from 'react-native';

import { colors } from '@/theme/colors';

// Web gets a real backdrop blur; native shows the translucent surface only.
const blur = Platform.OS === 'web' ? ({ backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' } as object) : null;

export const glassBar = { backgroundColor: colors.glassBar, ...blur };

export function Glass({ style, ...rest }: ViewProps) {
  return <View style={[styles.glass, blur, style]} {...rest} />;
}

const styles = StyleSheet.create({
  glass: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    overflow: 'hidden',
  },
});

// Space to keep scroll content clear of the floating tab bar.
export const TAB_BAR_SPACE = 96;
