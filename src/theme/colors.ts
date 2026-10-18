export const colors = {
  primary: '#E8700A',
  primaryDeep: '#D9531E',
  background: '#0D0D0F',
  // Glass tokens: translucent white over the dark base so the background glows show through.
  surface: 'rgba(255,255,255,0.07)',
  surfaceAlt: 'rgba(255,255,255,0.13)',
  border: 'rgba(255,255,255,0.14)',
  glassBar: 'rgba(18,18,22,0.72)',
  text: '#FFFFFF',
  textMuted: '#A8A8B3',
  cream: '#F6E9D7',
  success: '#3DBE6C',
  danger: '#E5484D',
} as const;

export type ColorName = keyof typeof colors;
