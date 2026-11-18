/** Colour maths for checking that text is readable (WCAG 2.x contrast ratio). */

export type Rgb = [number, number, number];

/** '#1d4ed8' or '#fff' -> [29, 78, 216] */
export function hexToRgb(hex: string): Rgb {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
}

function luminance([r, g, b]: Rgb): number {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** 1 (identical) to 21 (black on white). Normal text needs 4.5, large text and icons 3. */
export function contrastRatio(a: Rgb | string, b: Rgb | string): number {
  const [la, lb] = [a, b].map((c) => luminance(typeof c === 'string' ? hexToRgb(c) : c));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** A colour drawn with some transparency on top of another, like Tailwind's `bg-accent/10`. */
export function blend(top: Rgb | string, bottom: Rgb | string, alpha: number): Rgb {
  const t = typeof top === 'string' ? hexToRgb(top) : top;
  const b = typeof bottom === 'string' ? hexToRgb(bottom) : bottom;
  return t.map((v, i) => v * alpha + b[i] * (1 - alpha)) as Rgb;
}

/** Black or white, whichever is easier to read on this background colour. */
export function readableTextColor(background: string): '#ffffff' | '#000000' {
  return contrastRatio('#ffffff', background) >= contrastRatio('#000000', background) ? '#ffffff' : '#000000';
}
