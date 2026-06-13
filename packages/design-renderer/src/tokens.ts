export const DESIGN_TOKENS = {
  canvas: {
    width: 1080,
    height: 1920,
    safeTop: 180,
    safeBottom: 260,
    safeSide: 72,
  },
  fonts: {
    headline: "Manrope, Inter, Geologica, Golos Text, Arial, sans-serif",
    body: "Manrope, Inter, Geologica, Golos Text, Arial, sans-serif",
    button: "Manrope, Inter, Geologica, Golos Text, Arial, sans-serif",
  },
  colors: {
    textDark: "#101820",
    textLight: "#F7F3EA",
    dark: "#101820",
    light: "#F7F3EA",
    accent: "#FF5A2C",
    muted: "#D8D2C4",
    headline: "#FFFFFF",
    subheadline: "#D8D2C4",
    buttonBg: "#FF5A2C",
    buttonText: "#FFFFFF",
    bullet: "#F7F3EA",
    panelLight: "rgba(247, 243, 234, 0.92)",
    panelDark: "rgba(16, 24, 32, 0.72)",
  },
  radii: {
    card: 28,
    button: 999,
  },
  headline: {
    maxFontSize: 64,
    minFontSize: 36,
    maxLines: 2,
    lineHeight: 1.15,
  },
  subheadline: {
    fontSize: 28,
  },
  button: {
    height: 72,
    radius: 36,
    fontSize: 28,
    bottomOffset: 120,
  },
} as const;
