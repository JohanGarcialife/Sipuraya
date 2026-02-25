/**
 * hebrewUtils.ts
 * Utility functions for rendering Hebrew text correctly.
 */

/**
 * Replaces standard ASCII apostrophes ( ' ) with the Hebrew Geresh ( ׳ )
 * in Hebrew titles and dates.
 * e.g. "ו' אדר" → "ו׳ אדר"
 */
export function geresh(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(/'/g, "׳");
}

/**
 * Apply geresh only when in Hebrew mode (convenience wrapper).
 */
export function applyGeresh(text: string | null | undefined, isHe: boolean): string {
  if (!text) return "";
  return isHe ? geresh(text) : text;
}
