// Cinetor design tokens — cinematic dark, violet→pink accent.

export const colors = {
  bg: '#0B0B10',
  surface: '#14141C',
  elevate: '#1C1C26',
  border: '#26262F',
  text: '#F4F4F8',
  textDim: '#9A9AB0',
  textFaint: '#5C5C72',
  accentA: '#5B2DFF',
  accentB: '#C026D3',
  online: '#22C55E',
  gold: '#FACC15',
  danger: '#EF4444',
};

export const gradient = [colors.accentA, colors.accentB];

export const spacing = (n: number) => n * 4;
export const radius = { sm: 6, md: 12, lg: 18, xl: 26 };
