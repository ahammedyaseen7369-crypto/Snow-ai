// Snow AI — shared design tokens, carried over from the web identity.

export const colors = {
  void: "#080b10",
  void2: "#0d1219",
  panel: "#101822",
  panelBorder: "#223140",
  iceShadow: "#2a3644",
  snow: "#e8f1f8",
  snowDim: "#a9bccb",
  glacier: "#5da9e0",
  frost: "#9fd8d2",
  ember: "#e0745d", // reserved for errors only — never used decoratively
};

export const spacing = {
  xs: 6,
  sm: 12,
  md: 18,
  lg: 28,
  xl: 40,
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
};

export const type = {
  display: { fontSize: 22, fontWeight: "300", color: colors.snow },
  label: { fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: colors.frost },
  body: { fontSize: 15, color: colors.snow, lineHeight: 22 },
  bodyDim: { fontSize: 13, color: colors.snowDim, lineHeight: 20 },
  mono: { fontSize: 12, color: colors.snowDim, fontFamily: "monospace" },
};
