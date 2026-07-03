import { apothecary } from '@/theme/apothecary';

const { wood } = apothecary;

interface Props {
  box: { x: number; y: number; w: number; h: number; sillY: number };
}

// The window on the right wall, looking out onto a sunlit garden. A four-pane
// sash with a wooden frame and sill. For now the view is a fixed bright day;
// a later MR drives the sky from the time of the day.
export function WindowView({ box }: Props) {
  const { x, y, w, h } = box;
  const clipId = `win-clip-${Math.round(x)}-${Math.round(y)}`;
  const midX = x + w / 2;
  const midY = y + h / 2;

  return (
    <g aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <rect x={x} y={y} width={w} height={h} rx="6" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        <rect x={x} y={y} width={w} height={h} fill="#BBD6E2" />
        <rect x={x} y={y + h * 0.6} width={w} height={h * 0.4} fill="#9BB884" />
        <circle cx={x + w * 0.3} cy={y + h * 0.28} r="26" fill="#F6E3A6" />
        <circle cx={x + w * 0.3} cy={y + h * 0.28} r="17" fill="#FBEFC4" />
        <ellipse cx={x + w * 0.2} cy={y + h * 0.62} rx="52" ry="34" fill="#6E8B54" />
        <ellipse cx={x + w * 0.68} cy={y + h * 0.66} rx="64" ry="40" fill="#557045" />
        <ellipse cx={x + w * 0.95} cy={y + h * 0.6} rx="46" ry="32" fill="#6E8B54" />
        <circle cx={x + w * 0.32} cy={y + h * 0.56} r="4" fill="#E8952F" />
        <circle cx={x + w * 0.5} cy={y + h * 0.62} r="4" fill="#E8952F" />
        <circle cx={x + w * 0.78} cy={y + h * 0.54} r="4" fill="#C58ABF" />
      </g>

      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx="6"
        fill="none"
        stroke={wood.frame}
        strokeWidth="10"
      />
      <rect x={midX - 4} y={y} width="8" height={h} fill={wood.frame} />
      <rect x={x} y={midY - 4} width={w} height="8" fill={wood.frame} />

      <rect x={x - 12} y={box.sillY - 4} width={w + 24} height="12" rx="2" fill={wood.shelf} />
      <rect x={x - 12} y={box.sillY - 4} width={w + 24} height="3" fill={wood['shelf-edge']} />
    </g>
  );
}
