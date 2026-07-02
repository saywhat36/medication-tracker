import { useState } from 'react';

// Which dashboard the user sees: the original list UI or the apothecary shop.
// Classic stays the default so the shop can be built up MR by MR behind the
// toggle without ever leaving the deployed app in a half-finished state.
export type ViewMode = 'classic' | 'shop';

export const VIEW_STORAGE_KEY = 'medication-tracker:view';

// Anything that isn't exactly 'shop' (missing key, old value, tampering) falls
// back to classic — the view that is always complete.
export function parseViewMode(raw: string | null): ViewMode {
  return raw === 'shop' ? 'shop' : 'classic';
}

function readStoredViewMode(): ViewMode {
  try {
    return parseViewMode(window.localStorage.getItem(VIEW_STORAGE_KEY));
  } catch {
    return 'classic';
  }
}

export function useViewMode(): [ViewMode, (view: ViewMode) => void] {
  const [view, setView] = useState<ViewMode>(readStoredViewMode);

  function switchView(next: ViewMode): void {
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // Private browsing or storage quota — the toggle still works, it just
      // won't persist across reloads.
    }
    setView(next);
  }

  return [view, switchView];
}
