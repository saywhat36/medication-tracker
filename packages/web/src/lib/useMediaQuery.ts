import { useEffect, useState } from 'react';

// Track a media query so components can re-lay themselves out — the shop's
// cabinet SVG needs different geometry on narrow screens, which CSS alone
// can't express inside a viewBox.
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', onChange);
    setMatches(mql.matches);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
