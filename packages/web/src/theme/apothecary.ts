// The apothecary palette — single source of truth for the shop view's physical
// scene colors. Imported by tailwind.config.ts (so every value is available as
// e.g. bg-apothecary-wood-wall / fill-apothecary-parchment-edge) and by the SVG
// scene components. These are deliberate hardcoded hex values, not theme-aware
// tokens: the shop is a lit interior and shouldn't invert in dark mode.
export const apothecary = {
  wood: {
    wall: '#3A2A1A',
    panel: '#59422B',
    frame: '#6E5236',
    shelf: '#7A5A38',
    'shelf-edge': '#93714C',
    grain: '#4E3924',
    counter: '#6A4C2E',
    'counter-top': '#8A6742',
  },
  parchment: {
    DEFAULT: '#EBDDB6',
    light: '#F5EEDA',
    edge: '#C6AE7E',
    line: '#D9C9A2',
  },
  ink: {
    DEFAULT: '#3B2A1A',
    faded: '#7A6344',
    quill: '#2E3A57',
  },
  wax: {
    red: '#8E2F2E',
    amber: '#B87117',
    green: '#4E6E42',
  },
  glass: {
    DEFAULT: '#E8DFC8',
    metal: '#2F2A26',
  },
  flame: {
    DEFAULT: '#E8A33D',
    core: '#F6D06B',
  },
} as const;
