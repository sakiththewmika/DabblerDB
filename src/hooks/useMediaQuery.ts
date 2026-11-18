import { useSyncExternalStore } from 'react';

/** True while the browser window matches a CSS media query. Updates when the window is resized or rotated. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false // when rendering as plain text (tests): assume a big screen
  );
}

/** Phones and small windows. Keep in step with Tailwind's `md` breakpoint (768px), which the `max-md:` classes use. */
export const COMPACT_SCREEN_QUERY = '(max-width: 767px)';
export const useIsCompactScreen = () => useMediaQuery(COMPACT_SCREEN_QUERY);

/** Below Tailwind's `xl` (1280px) the top bar has no room for every control, so most of them move into the "More" menu. */
export const useIsCompactToolbar = () => useMediaQuery('(max-width: 1279px)');
