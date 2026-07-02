import { apothecary } from '@/theme/apothecary';

const { wood, glass, flame } = apothecary;

// The apothecary cabinet: dark panelled wall, wooden frame, two shelf boards,
// and the counter top running along the bottom. Drawn as SVG so it scales to
// any width and so later MRs can slot interactive bottle elements straight
// onto the shelves. The shelves are empty for now — bottles arrive in MR 2.
export function ShelfUnit() {
  return (
    <svg
      width="100%"
      viewBox="0 0 680 390"
      role="img"
      aria-label="An empty apothecary cabinet with two shelves, waiting to be stocked"
    >
      <rect x="0" y="0" width="680" height="370" fill={wood.wall} />
      <rect x="44" y="30" width="592" height="340" fill={wood.panel} />
      {[192, 340, 488].map((x) => (
        <line key={x} x1={x} y1="30" x2={x} y2="370" stroke={wood.grain} strokeWidth="2" />
      ))}
      <rect x="30" y="16" width="620" height="14" fill={wood.frame} />
      <rect x="30" y="16" width="14" height="354" fill={wood.frame} />
      <rect x="636" y="16" width="14" height="354" fill={wood.frame} />
      {[158, 306].map((y) => (
        <g key={y}>
          <rect x="44" y={y} width="592" height="12" fill={wood.shelf} />
          <rect x="44" y={y} width="592" height="3" fill={wood['shelf-edge']} />
        </g>
      ))}
      <rect x="0" y="370" width="680" height="20" fill={wood['counter-top']} />
      <rect x="0" y="370" width="680" height="3" fill={wood['shelf-edge']} />
      <g aria-hidden="true">
        <ellipse cx="600" cy="372" rx="17" ry="5" fill={glass.metal} />
        <rect x="593" y="326" width="14" height="44" rx="4" fill={glass.DEFAULT} />
        <line x1="600" y1="326" x2="600" y2="320" stroke={wood.wall} strokeWidth="1.5" />
        <ellipse cx="600" cy="312" rx="5" ry="10" fill={flame.DEFAULT} />
        <ellipse cx="600" cy="315" rx="2.5" ry="5" fill={flame.core} />
      </g>
    </svg>
  );
}
