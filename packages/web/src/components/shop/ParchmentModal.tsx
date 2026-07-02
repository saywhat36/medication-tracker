import { useEffect, type ReactNode } from 'react';
import { Parchment } from './Parchment';

interface Props {
  label: string;
  onClose: () => void;
  children: ReactNode;
}

// A sheet of parchment floating over the dimmed shop. Shared chrome for the
// edit and add-bottle dialogs: Escape, backdrop click, and scroll containment.
export function ParchmentModal({ label, onClose, children }: Props) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Parchment tone="paper" className="w-full max-w-sm max-h-[90vh] overflow-y-auto">
        {children}
      </Parchment>
    </div>
  );
}
