import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  // Aged parchment for the REMEMBER note, lighter paper for the daily list.
  tone?: 'aged' | 'paper';
  className?: string;
}

// A sheet lying on the counter. Shared base for the shop's papers so the
// REMEMBER note (MR 4) and the due-today list (MR 5) look like they came from
// the same drawer.
export function Parchment({ children, tone = 'aged', className = '' }: Props) {
  const toneClass = tone === 'aged' ? 'bg-apothecary-parchment' : 'bg-apothecary-parchment-light';
  return (
    <div
      className={`rounded-sm border border-apothecary-parchment-edge ${toneClass} px-5 py-4 text-apothecary-ink shadow-md ${className}`}
    >
      {children}
    </div>
  );
}
