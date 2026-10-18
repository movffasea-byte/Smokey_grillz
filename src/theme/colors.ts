export const colors = {
  primary: '#E8700A',
  primaryDeep: '#D9531E',
  background: '#0D0D0F',
  surface: '#1A1A1E',
  surfaceAlt: '#26262C',
  border: '#33333A',
  text: '#FFFFFF',
  textMuted: '#A8A8B3',
  cream: '#F6E9D7',
  success: '#3DBE6C',
  danger: '#E5484D',
} as const;

export type ColorName = keyof typeof colors;
