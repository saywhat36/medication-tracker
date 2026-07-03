// What the garden outside the window looks like, driven by the local clock.
// Four phases through the day; the night phase overlaps the indoor "evening"
// dimming (see evening.ts) so inside and outside agree after dark.
export type SkyPhase = 'dawn' | 'day' | 'dusk' | 'night';

export function skyPhaseForHour(hour: number): SkyPhase {
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

export function skyPhaseNow(date: Date = new Date()): SkyPhase {
  return skyPhaseForHour(date.getHours());
}

// A celestial body: sun or moon, positioned as fractions of the window box.
interface Body {
  xf: number;
  yf: number;
  r: number;
  core: string;
  halo: string;
}

export interface SkyPalette {
  skyTop: string;
  skyBottom: string;
  ground: string;
  gardenBack: string;
  gardenFront: string;
  body: Body;
  stars: boolean;
  // Whether little garden flowers show (hidden after dark).
  flowers: boolean;
}

// All hardcoded hex — this is a lit exterior scene and must not invert with
// the app's dark mode.
export const skyPalettes: Record<SkyPhase, SkyPalette> = {
  dawn: {
    skyTop: '#B7A6C4',
    skyBottom: '#F2CFA2',
    ground: '#8A9A72',
    gardenBack: '#5E7050',
    gardenFront: '#7A8C60',
    body: { xf: 0.24, yf: 0.46, r: 22, core: '#FCE7B8', halo: '#F4C77A' },
    stars: false,
    flowers: true,
  },
  day: {
    skyTop: '#A9CBE0',
    skyBottom: '#CFE3E8',
    ground: '#9BB884',
    gardenBack: '#557045',
    gardenFront: '#6E8B54',
    body: { xf: 0.3, yf: 0.26, r: 26, core: '#FBEFC4', halo: '#F6E3A6' },
    stars: false,
    flowers: true,
  },
  dusk: {
    skyTop: '#C77E5E',
    skyBottom: '#F2C070',
    ground: '#5E6E4A',
    gardenBack: '#4A5A3C',
    gardenFront: '#66784C',
    body: { xf: 0.72, yf: 0.5, r: 24, core: '#FBD98C', halo: '#E8943D' },
    stars: false,
    flowers: true,
  },
  night: {
    skyTop: '#222E44',
    skyBottom: '#37455F',
    ground: '#2A362A',
    gardenBack: '#22301F',
    gardenFront: '#2E3D28',
    body: { xf: 0.74, yf: 0.26, r: 20, core: '#EFEAD2', halo: '#C9C6AE' },
    stars: true,
    flowers: false,
  },
};
